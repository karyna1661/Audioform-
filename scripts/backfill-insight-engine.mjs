#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName)
  if (!fs.existsSync(filePath)) return

  const contents = fs.readFileSync(filePath, "utf8")
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#") || !line.includes("=")) continue

    const [rawKey, ...rawValueParts] = line.split("=")
    const key = rawKey.trim()
    if (!key || process.env[key]) continue

    const joined = rawValueParts.join("=").trim()
    process.env[key] = joined.replace(/^['"]|['"]$/g, "")
  }
}

function preloadEnvFiles() {
  [".env", ".env.local", ".env.development", ".env.development.local"].forEach(loadEnvFile)
}

preloadEnvFiles()

function decodeJwtPayload(token) {
  const parts = token.split(".")
  if (parts.length < 2) return null
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4)
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"))
  } catch {
    return null
  }
}

function resolveSupabaseConfig() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ""
  const explicitUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  if (explicitUrl && key) return { url: explicitUrl.replace(/\/+$/, ""), key }
  const payload = key ? decodeJwtPayload(key) : null
  const ref = typeof payload?.ref === "string" ? payload.ref : ""
  if (ref && key) return { url: `https://${ref}.supabase.co`, key }
  throw new Error("Missing Supabase configuration. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.")
}

async function supabaseRequest(pathValue, init = {}) {
  const { url, key } = resolveSupabaseConfig()
  const response = await fetch(`${url}${pathValue}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`Supabase request failed (${response.status}): ${text.slice(0, 280)}`)
  }
  if (response.status === 204) return null
  const text = await response.text().catch(() => "")
  if (!text.trim()) return null
  return JSON.parse(text)
}

function parseArgs(argv) {
  const args = {
    mode: "all",
    limit: 200,
    surveyId: null,
    staleOnly: true,
  }

  for (const arg of argv) {
    if (arg.startsWith("--mode=")) args.mode = arg.slice("--mode=".length)
    if (arg.startsWith("--limit=")) args.limit = Number.parseInt(arg.slice("--limit=".length), 10) || 200
    if (arg.startsWith("--surveyId=")) args.surveyId = arg.slice("--surveyId=".length)
    if (arg === "--all-responses") args.staleOnly = false
  }

  return args
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim()
}

function splitIntoSentences(text) {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
}

function clipVerbatimQuote(sentence, maxLength = 140) {
  if (sentence.length <= maxLength) return sentence
  const clipped = sentence.slice(0, maxLength)
  const lastSoftBreak = Math.max(clipped.lastIndexOf(","), clipped.lastIndexOf(";"), clipped.lastIndexOf(" "))
  const candidate = (lastSoftBreak > 48 ? clipped.slice(0, lastSoftBreak) : clipped).trim()
  return candidate || clipped.trim()
}

function pickSentiment(text) {
  const positiveWords = ["love", "great", "clear", "easy", "smooth", "helpful", "excited", "good", "confident"]
  const negativeWords = ["confusing", "unclear", "frustrating", "hard", "slow", "stuck", "difficult", "awkward", "lost"]
  const lower = text.toLowerCase()
  const positiveHits = positiveWords.filter((word) => lower.includes(word)).length
  const negativeHits = negativeWords.filter((word) => lower.includes(word)).length
  if (negativeHits > positiveHits) return { sentiment: "negative", score: Math.min(0.92, 0.52 + negativeHits * 0.09) }
  if (positiveHits > negativeHits) return { sentiment: "positive", score: Math.min(0.92, 0.52 + positiveHits * 0.09) }
  return { sentiment: "neutral", score: 0.5 }
}

function extractThemes(text) {
  const lower = text.toLowerCase()
  const themeMatchers = [
    ["onboarding", ["onboarding", "getting started", "setup", "first time"]],
    ["pricing", ["pricing", "price", "cost", "expensive", "cheap"]],
    ["navigation", ["find", "where", "navigate", "menu", "landing page"]],
    ["clarity", ["clear", "unclear", "confusing", "understand", "explain"]],
    ["speed", ["slow", "fast", "loading", "upload", "wait"]],
    ["workflow", ["workflow", "integration", "slack", "notion", "export"]],
    ["trust", ["trust", "accurate", "wrong", "insight", "summary"]],
    ["mobile", ["phone", "mobile", "screen", "preview"]],
  ]

  return themeMatchers
    .filter(([, needles]) => needles.some((needle) => lower.includes(needle)))
    .map(([theme]) => theme)
    .slice(0, 4)
}

function scoreQuoteCandidate(sentence, themes) {
  const lower = sentence.toLowerCase()
  const conviction =
    0.35 +
    (/(love|hate|frustrating|stuck|impossible|awkward|clear|confusing|almost gave up|wish)/.test(lower) ? 0.35 : 0) +
    (/(never|always|no idea|had to|kept|still)/.test(lower) ? 0.2 : 0)
  const specificity =
    0.3 +
    (themes.some((theme) => lower.includes(theme)) ? 0.25 : 0) +
    (/(because|when|after|before|instead|moment)/.test(lower) ? 0.25 : 0)
  const shareability =
    0.25 +
    (sentence.length >= 28 && sentence.length <= 120 ? 0.35 : 0) +
    (!/^\b(i think|maybe|sort of|kind of)\b/i.test(sentence) ? 0.2 : 0)

  const score = Math.min(1, Number(((conviction + specificity + shareability) / 3).toFixed(2)))
  return {
    quote: clipVerbatimQuote(sentence, 120),
    conviction: Number(Math.min(1, conviction).toFixed(2)),
    specificity: Number(Math.min(1, specificity).toFixed(2)),
    shareability: Number(Math.min(1, shareability).toFixed(2)),
    score,
  }
}

function pickQuoteCandidates(text, themes) {
  return splitIntoSentences(text)
    .filter((sentence) => sentence.length >= 18)
    .map((sentence) => scoreQuoteCandidate(sentence, themes))
    .filter((candidate) => candidate.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

function buildHeuristicSignalSummary(text, themes, sentiment) {
  const lower = text.toLowerCase()
  const themeLabel = themes[0] ?? "the experience"
  const emotion = sentiment === "negative" ? "frustrated" : sentiment === "positive" ? "encouraged" : "thoughtful"

  if (/(confusing|unclear|lost|no idea|didn't know)/.test(lower)) {
    return {
      complaint: `${themeLabel} feels confusing`,
      opportunity: `clearer guidance around ${themeLabel}`,
      emotion,
      frictionMoment: "the first-run flow",
      confidence: 0.66,
    }
  }
  if (/(slow|wait|loading|took too long)/.test(lower)) {
    return {
      complaint: `${themeLabel} feels slow`,
      opportunity: `faster feedback around ${themeLabel}`,
      emotion,
      frictionMoment: "the waiting time",
      confidence: 0.64,
    }
  }
  if (/(hard|awkward|too many|extra steps)/.test(lower)) {
    return {
      complaint: `${themeLabel} takes too much effort`,
      opportunity: `reduce the number of steps around ${themeLabel}`,
      emotion,
      frictionMoment: "the core task flow",
      confidence: 0.62,
    }
  }

  return {
    complaint: themeLabel ? `${themeLabel} still needs sharper clarity` : null,
    opportunity: themeLabel ? `make ${themeLabel} easier to understand` : null,
    emotion,
    frictionMoment: null,
    confidence: 0.48,
  }
}

function buildHeuristicNarrativeSummary(text, themes, signalSummary, sentiment) {
  const themeLabel = themes.length >= 2 ? `${themes[0]} and ${themes[1]}` : themes[0] ?? null
  const complaint = signalSummary.complaint?.trim()
  const opportunity = signalSummary.opportunity?.trim()
  const frictionMoment = signalSummary.frictionMoment?.trim()

  if (complaint && opportunity) {
    return truncate(
      `The responder points to ${complaint.toLowerCase()} as the main friction and implies ${opportunity.toLowerCase()} would make the experience land better.`,
      220,
    )
  }
  if (themeLabel && frictionMoment && sentiment === "negative") {
    return truncate(`The responder describes friction around ${themeLabel} and anchors it in ${frictionMoment.toLowerCase()}.`, 220)
  }
  if (themeLabel && sentiment === "positive") {
    return truncate(`The responder hears momentum around ${themeLabel} and suggests this part of the experience is starting to feel stronger.`, 220)
  }
  if (themeLabel) {
    return truncate(`The responder focuses on ${themeLabel} and gives concrete detail about how that part of the experience is landing.`, 220)
  }

  const lead = splitIntoSentences(text)[0] ?? text
  return truncate(`The responder centers on one concrete moment: ${lead.toLowerCase()}`, 220)
}

function calculateSignalScore(text, themes, signalSummary) {
  const lengthBoost = Math.min(35, Math.round(text.length / 14))
  const themeBoost = themes.length * 10
  const signalBoost = signalSummary.complaint ? 12 : 0
  const opportunityBoost = signalSummary.opportunity ? 10 : 0
  return Math.max(28, Math.min(100, 28 + lengthBoost + themeBoost + signalBoost + opportunityBoost))
}

function normalizeForInclusion(value) {
  return value
    .toLowerCase()
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function coerceVerbatimCandidates(text, candidates, themes) {
  const transcriptSentences = splitIntoSentences(text)
  const matches = []

  for (const candidate of candidates ?? []) {
    const probe = normalizeForInclusion(candidate)
    if (!probe) continue
    const exact = transcriptSentences.find((sentence) => normalizeForInclusion(sentence).includes(probe))
    if (exact && !matches.includes(exact)) matches.push(exact)
  }

  return matches.length ? matches.map((sentence) => scoreQuoteCandidate(sentence, themes)) : pickQuoteCandidates(text, themes)
}

async function callOpenAiJson(system, user) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for AI enrichment")
  const model = process.env.OPENAI_INSIGHT_MODEL || process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini"
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(`OpenAI insight generation failed (${response.status}): ${message.slice(0, 280)}`)
  }

  const data = await response.json()
  return JSON.parse(data.choices?.[0]?.message?.content ?? "{}")
}

async function generateAiInsight(text) {
  if (!process.env.OPENAI_API_KEY) return null

  const fallback = buildHeuristicInsight(text)

  const [narrative, signal, quotes] = await Promise.all([
    callOpenAiJson(
      "You are a world-class product analyst. Return strict JSON with keys narrativeSummary, primaryTheme, themes. narrativeSummary must be a concise 1-2 sentence synthesis of what the responder means and must not restate the transcript verbatim. primaryTheme must be 1-3 words. themes must contain up to 4 lower-case themes.",
      `Transcript:\n${text}`,
    ).catch(() => ({})),
    callOpenAiJson(
      "You are extracting structured intelligence from user feedback. Return strict JSON with keys signalSummary and sentiment. signalSummary must contain complaint, opportunity, emotion, frictionMoment, confidence. complaint groups the main friction. opportunity infers the strongest solution direction. emotion is the dominant emotional tone. sentiment must be positive, negative, or neutral.",
      `Transcript:\n${text}`,
    ).catch(() => ({})),
    callOpenAiJson(
      "Extract the most impactful verbatim quotes from this transcript. Return strict JSON with key verbatimQuotes. Rules: keep each quote under 20 words, keep wording verbatim, prefer strong opinion, emotion, or sharp insight, avoid vague lines.",
      `Transcript:\n${text}`,
    ).catch(() => ({})),
  ])

  const themes = Array.isArray(narrative.themes)
    ? narrative.themes.map((theme) => normalizeWhitespace(String(theme)).toLowerCase()).filter(Boolean).slice(0, 4)
    : fallback.themes

  const signalSummary = signal.signalSummary ?? fallback.signalSummary
  const quoteCandidates = coerceVerbatimCandidates(text, quotes.verbatimQuotes, themes)
  const powerQuote = quoteCandidates[0]?.quote ?? null
  const sentiment =
    signal.sentiment === "positive" || signal.sentiment === "negative" || signal.sentiment === "neutral"
      ? signal.sentiment
      : fallback.sentiment

  return {
    narrativeSummary: truncate(normalizeWhitespace(narrative.narrativeSummary ?? "") || fallback.narrativeSummary, 220),
    signalSummary,
    powerQuote,
    verbatimQuotes: quoteCandidates.map((candidate) => candidate.quote),
    quoteCandidates,
    primaryTheme: normalizeWhitespace(narrative.primaryTheme ?? "") || themes[0] || fallback.primaryTheme,
    themes,
    sentiment,
    sentimentScore: fallback.sentimentScore,
    signalScore: calculateSignalScore(text, themes, signalSummary),
    provider: "openai-response-structured",
    extractorVersion: "v3",
  }
}

function buildHeuristicInsight(text) {
  const compact = normalizeWhitespace(text)
  const themes = extractThemes(compact)
  const sentiment = pickSentiment(compact)
  const signalSummary = buildHeuristicSignalSummary(compact, themes, sentiment.sentiment)
  const quoteCandidates = pickQuoteCandidates(compact, themes)

  return {
    narrativeSummary: buildHeuristicNarrativeSummary(compact, themes, signalSummary, sentiment.sentiment),
    signalSummary,
    powerQuote: quoteCandidates[0]?.quote ?? null,
    verbatimQuotes: quoteCandidates.map((candidate) => candidate.quote),
    quoteCandidates,
    primaryTheme: themes[0] ?? null,
    themes,
    sentiment: sentiment.sentiment,
    sentimentScore: sentiment.score,
    signalScore: calculateSignalScore(compact, themes, signalSummary),
    provider: "audioform-response-heuristic",
    extractorVersion: "v3",
  }
}

async function listTranscriptBatch({ limit, offset, surveyId, staleOnly }) {
  const filters = [
    "select=id,response_id,transcript_text,status",
    "status=eq.completed",
    "transcript_text=not.is.null",
    `order=updated_at.asc`,
    `limit=${limit}`,
    `offset=${offset}`,
  ]

  if (surveyId) {
    const responses =
      (await supabaseRequest(
        `/rest/v1/response_records?survey_id=eq.${encodeURIComponent(surveyId)}&select=id&limit=5000`,
      ).catch(() => [])) ?? []
    const ids = responses.map((row) => row.id).filter(Boolean)
    if (!ids.length) return []
    filters.push(`response_id=in.(${ids.map((id) => encodeURIComponent(id)).join(",")})`)
  }

  const transcripts = (await supabaseRequest(`/rest/v1/response_transcripts?${filters.join("&")}`).catch(() => [])) ?? []
  if (!staleOnly || !transcripts.length) return transcripts

  const transcriptIds = transcripts.map((row) => row.id).filter(Boolean)
  if (!transcriptIds.length) return transcripts
  const insightRows =
    (await supabaseRequest(
      `/rest/v1/insight_results?transcript_id=in.(${transcriptIds.map((id) => encodeURIComponent(id)).join(",")})&select=transcript_id,extractor_version,narrative_summary,power_quote`,
    ).catch(() => [])) ?? []
  const currentIds = new Set(
    insightRows
      .filter((row) => row.extractor_version === "v3" && row.narrative_summary)
      .map((row) => row.transcript_id),
  )
  return transcripts.filter((row) => !currentIds.has(row.id))
}

async function upsertInsightResult(input) {
  await supabaseRequest("/rest/v1/insight_results?on_conflict=transcript_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([
      {
        transcript_id: input.transcriptId,
        response_id: input.responseId ?? null,
        summary: input.narrativeSummary ?? null,
        narrative_summary: input.narrativeSummary ?? null,
        signal_summary: input.signalSummary ?? {},
        power_quote: input.powerQuote ?? null,
        quote_candidates: input.quoteCandidates ?? [],
        primary_theme: input.primaryTheme ?? null,
        themes: input.themes ?? [],
        sentiment: input.sentiment ?? null,
        sentiment_score: input.sentimentScore ?? null,
        signal_score: input.signalScore ?? null,
        quotes: input.verbatimQuotes ?? [],
        provider: input.provider ?? null,
        extractor_version: input.extractorVersion ?? null,
        updated_at: new Date().toISOString(),
      },
    ]),
  })
}

function incrementMap(map, key, nextValue) {
  if (!key) return
  const current = map.get(key)
  if (!current || nextValue.count > current.count) map.set(key, nextValue)
}

function buildReleaseSignalSummary(insights) {
  const complaints = new Map()
  const opportunities = new Map()
  const themeCounts = new Map()
  const clusters = new Map()

  for (const insight of insights) {
    const complaint = normalizeWhitespace(insight.signal_summary?.complaint ?? "")
    const opportunity = normalizeWhitespace(insight.signal_summary?.opportunity ?? "")
    const theme = normalizeWhitespace(insight.primary_theme ?? insight.themes?.[0] ?? "")
    const quote = insight.power_quote ?? insight.quotes?.[0] ?? null

    if (complaint) {
      incrementMap(complaints, complaint, {
        label: complaint,
        count: (complaints.get(complaint)?.count ?? 0) + 1,
        quote,
        responseId: insight.response_id,
      })
    }
    if (opportunity) {
      incrementMap(opportunities, opportunity, {
        label: opportunity,
        count: (opportunities.get(opportunity)?.count ?? 0) + 1,
        reason: complaint || theme || "repeated signal across takes",
      })
    }
    if (theme) {
      themeCounts.set(theme, (themeCounts.get(theme) ?? 0) + 1)
      const existing = clusters.get(theme) ?? {
        label: theme,
        count: 0,
        representativeResponseIds: [],
        representativeQuote: quote,
        representativeTakeId: insight.response_id,
        description: complaint || `Repeated signal around ${theme}.`,
      }
      existing.count += 1
      existing.representativeResponseIds.push(insight.response_id)
      if (!existing.representativeQuote && quote) existing.representativeQuote = quote
      if (!existing.representativeTakeId && insight.response_id) existing.representativeTakeId = insight.response_id
      clusters.set(theme, existing)
    }
  }

  const topComplaints = Array.from(complaints.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map(({ label, count }) => ({ label, count }))

  const topOpportunities = Array.from(opportunities.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map(({ label, reason }) => ({ label, reason }))

  const emergingSignals = Array.from(themeCounts.entries())
    .filter(([, count]) => count === 1)
    .slice(0, 3)
    .map(([theme]) => `A smaller but distinct signal is emerging around ${theme}.`)

  const contrarianInsights = insights
    .filter((insight) => insight.sentiment === "positive" && insight.signal_score >= 55)
    .slice(0, 3)
    .map((insight) => insight.narrative_summary || insight.power_quote || insight.summary)
    .filter(Boolean)

  return {
    signalSummary: {
      topComplaints,
      topOpportunities,
      emergingSignals,
      contrarianInsights,
    },
    clusters: Array.from(clusters.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  }
}

function buildReleaseNarrativeSummary(insights, signalSummary) {
  if (!insights.length) return null
  const leadComplaint = signalSummary.topComplaints[0]?.label
  const leadOpportunity = signalSummary.topOpportunities[0]?.label
  const emerging = signalSummary.emergingSignals[0]
  const contrarian = signalSummary.contrarianInsights[0]

  const parts = []
  if (leadComplaint) parts.push(`Across this release, the strongest repeated friction is ${leadComplaint.toLowerCase()}.`)
  if (leadOpportunity) parts.push(`The clearest opportunity is ${leadOpportunity.toLowerCase()}.`)
  if (emerging) parts.push(emerging)
  if (contrarian) parts.push(`A contrarian signal worth hearing is: ${truncate(contrarian, 120)}`)

  return truncate(parts.join(" "), 420)
}

function buildShareArtifacts(insights, clusters) {
  const topQuotes = insights
    .map((insight) => insight.power_quote || insight.quotes?.[0] || null)
    .filter(Boolean)
    .slice(0, 3)

  return {
    topQuotes,
    bestClusterLabel: clusters[0]?.label ?? null,
    bestClipCandidateIds: clusters
      .map((cluster) => cluster.representativeTakeId)
      .filter(Boolean)
      .slice(0, 3),
  }
}

async function refreshReleaseInsight(surveyId) {
  const responses =
    (await supabaseRequest(
      `/rest/v1/response_records?survey_id=eq.${encodeURIComponent(surveyId)}&status=eq.uploaded&select=id&order=created_at.desc&limit=500`,
    ).catch(() => [])) ?? []
  const responseIds = responses.map((row) => row.id).filter(Boolean)
  if (!responseIds.length) return null

  const transcripts =
    (await supabaseRequest(
      `/rest/v1/response_transcripts?response_id=in.(${responseIds.map((id) => encodeURIComponent(id)).join(",")})&select=id,response_id`,
    ).catch(() => [])) ?? []
  const transcriptIds = transcripts.map((row) => row.id).filter(Boolean)
  if (!transcriptIds.length) return null

  const insights =
    (await supabaseRequest(
      `/rest/v1/insight_results?transcript_id=in.(${transcriptIds.map((id) => encodeURIComponent(id)).join(",")})&select=response_id,summary,narrative_summary,signal_summary,power_quote,quotes,primary_theme,themes,signal_score,sentiment`,
    ).catch(() => [])) ?? []
  if (!insights.length) return null

  const { signalSummary, clusters } = buildReleaseSignalSummary(insights)
  const narrativeSummary = buildReleaseNarrativeSummary(insights, signalSummary)
  const shareArtifacts = buildShareArtifacts(insights, clusters)

  await supabaseRequest("/rest/v1/release_insights?on_conflict=survey_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([
      {
        survey_id: surveyId,
        narrative_summary: narrativeSummary,
        signal_summary: signalSummary,
        clusters,
        share_artifacts: shareArtifacts,
        provider: process.env.OPENAI_API_KEY ? "openai-release-structured" : "audioform-release-heuristic",
        extractor_version: "v3",
        updated_at: new Date().toISOString(),
      },
    ]),
  })

  return { surveyId, narrativeSummary }
}

async function backfillResponseInsights({ limit, surveyId, staleOnly }) {
  let offset = 0
  let processed = 0
  let updated = 0
  const touchedSurveyIds = new Set()

  while (true) {
    const batch = await listTranscriptBatch({ limit, offset, surveyId, staleOnly })
    if (!batch.length) break

    for (const transcript of batch) {
      processed += 1
      const text = transcript.transcript_text?.trim() || ""
      if (!text) continue

      const response =
        transcript.response_id
          ? await supabaseRequest(
              `/rest/v1/response_records?id=eq.${encodeURIComponent(transcript.response_id)}&select=id,survey_id&limit=1`,
            ).catch(() => [])
          : []
      const surveyRow = response?.[0] ?? null
      const insight = (await generateAiInsight(text).catch(() => null)) ?? buildHeuristicInsight(text)

      await upsertInsightResult({
        transcriptId: transcript.id,
        responseId: transcript.response_id ?? null,
        narrativeSummary: insight.narrativeSummary,
        signalSummary: insight.signalSummary,
        powerQuote: insight.powerQuote,
        verbatimQuotes: insight.verbatimQuotes,
        quoteCandidates: insight.quoteCandidates,
        primaryTheme: insight.primaryTheme,
        themes: insight.themes,
        sentiment: insight.sentiment,
        sentimentScore: insight.sentimentScore,
        signalScore: insight.signalScore,
        provider: insight.provider,
        extractorVersion: insight.extractorVersion,
      })

      updated += 1
      if (surveyRow?.survey_id) touchedSurveyIds.add(surveyRow.survey_id)
      process.stdout.write(`\rBackfilled response insights: ${updated}`)
    }

    offset += limit
  }

  process.stdout.write("\n")
  return { processed, updated, touchedSurveyIds: Array.from(touchedSurveyIds) }
}

async function backfillReleaseInsights({ surveyId, touchedSurveyIds }) {
  const surveyIds = surveyId
    ? [surveyId]
    : touchedSurveyIds?.length
      ? touchedSurveyIds
      : ((await supabaseRequest("/rest/v1/surveys?select=id&limit=5000").catch(() => [])) ?? []).map((row) => row.id)

  let updated = 0
  for (const id of surveyIds) {
    const result = await refreshReleaseInsight(id).catch(() => null)
    if (result) updated += 1
    process.stdout.write(`\rRefreshed release insights: ${updated}`)
  }
  process.stdout.write("\n")
  return { updated, surveyIds }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  console.log("Insight engine backfill starting...")
  console.log(`mode=${args.mode} limit=${args.limit} surveyId=${args.surveyId ?? "all"} staleOnly=${args.staleOnly}`)

  let touchedSurveyIds = []

  if (args.mode === "all" || args.mode === "responses") {
    const responseResult = await backfillResponseInsights({
      limit: args.limit,
      surveyId: args.surveyId,
      staleOnly: args.staleOnly,
    })
    touchedSurveyIds = responseResult.touchedSurveyIds
    console.log(`Response insights updated: ${responseResult.updated}`)
  }

  if (args.mode === "all" || args.mode === "releases") {
    const releaseResult = await backfillReleaseInsights({
      surveyId: args.surveyId,
      touchedSurveyIds,
    })
    console.log(`Release insights refreshed: ${releaseResult.updated}`)
  }

  console.log("Insight engine backfill complete.")
}

main().catch((error) => {
  console.error("Insight engine backfill failed:", error instanceof Error ? error.message : error)
  process.exitCode = 1
})
