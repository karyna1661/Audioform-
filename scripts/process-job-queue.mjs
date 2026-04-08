#!/usr/bin/env node

import fs from "node:fs"
import { Socket } from "node:net"
import path from "node:path"
import { connect as connectTls } from "node:tls"
import nodemailer from "nodemailer"

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
  [
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local",
  ].forEach(loadEnvFile)
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
  throw new Error("Missing Supabase config for queue worker")
}

async function supabaseRequest(path, init = {}) {
  const { url, key } = resolveSupabaseConfig()
  const response = await fetch(`${url}${path}`, {
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
    throw new Error(`Supabase queue request failed (${response.status}): ${text.slice(0, 280)}`)
  }
  if (response.status === 204) return null
  const text = await response.text().catch(() => "")
  if (!text.trim()) return null
  return JSON.parse(text)
}

async function setJobResult(jobId, value, ttlSeconds = 3600) {
  await runRedisCommand(["SETEX", `audioform:job-result:${jobId}`, String(ttlSeconds), JSON.stringify(value)])
}

async function completeTranscript(jobId, transcriptText, provider = "openai") {
  await supabaseRequest(`/rest/v1/response_transcripts?job_id=eq.${encodeURIComponent(jobId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "completed",
      transcript_text: transcriptText,
      provider,
      error_message: null,
      updated_at: new Date().toISOString(),
    }),
  })
}

async function failTranscript(jobId, errorMessage, provider = "openai") {
  await supabaseRequest(`/rest/v1/response_transcripts?job_id=eq.${encodeURIComponent(jobId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "failed",
      provider,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    }),
  })
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
    ["speed", ["slow", "fast", "loading", "upload"]],
    ["workflow", ["workflow", "integration", "slack", "notion", "export"]],
    ["trust", ["trust", "accurate", "wrong", "insight", "summary"]],
    ["mobile", ["phone", "mobile", "screen", "preview"]],
  ]
  return themeMatchers.filter(([, needles]) => needles.some((needle) => lower.includes(needle))).map(([theme]) => theme).slice(0, 4)
}

function sentenceScore(sentence, themes) {
  const lower = sentence.toLowerCase()
  let score = 0

  if (sentence.length >= 35 && sentence.length <= 170) score += 3
  if (themes.some((theme) => lower.includes(theme))) score += 2
  if (/(because|but|so|when|after|instead|wish|would|almost)/.test(lower)) score += 2
  if (/(love|great|easy|excited|confusing|unclear|frustrating|hard|slow|awkward)/.test(lower)) score += 2
  if (/[.!?]$/.test(sentence)) score += 1

  return score
}

function summarize(text, themes, signalSummary, sentiment) {
  const compact = normalizeWhitespace(text)
  if (!compact) return "The response is still being processed into a usable summary."

  const themeLabel = themes.length >= 2 ? `${themes[0]} and ${themes[1]}` : themes[0] ?? null
  const complaint = signalSummary.complaint?.trim()
  const opportunity = signalSummary.opportunity?.trim()
  const frictionMoment = signalSummary.frictionMoment?.trim()

  if (complaint && opportunity) {
    return truncate(`The responder points to ${complaint.toLowerCase()} as the main friction and implies ${opportunity.toLowerCase()} would make the experience land better.`, 220)
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

  const firstSentence = splitIntoSentences(compact)[0] ?? compact
  return truncate(`The responder centers on one concrete moment: ${firstSentence.toLowerCase()}`, 220)
}

function buildSignalSummary(text, themes, sentiment) {
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

function coerceQuotesFromTranscript(text, candidates, themes) {
  const transcriptSentences = splitIntoSentences(text)
  if (!transcriptSentences.length) return []

  const matches = []

  for (const candidate of candidates ?? []) {
    const probe = normalizeForInclusion(candidate)
    if (!probe) continue
    const exact = transcriptSentences.find((sentence) => normalizeForInclusion(sentence).includes(probe))
    if (exact && !matches.includes(exact)) matches.push(exact)
  }

  return matches.length ? matches.map((sentence) => scoreQuoteCandidate(sentence, themes)) : pickQuoteCandidates(text, themes)
}

function buildHeuristicInsight(text) {
  const compact = normalizeWhitespace(text)
  const themes = extractThemes(compact)
  const sentiment = pickSentiment(compact)
  const signalSummary = buildSignalSummary(compact, themes, sentiment.sentiment)
  const quoteCandidates = pickQuoteCandidates(compact, themes)

  return {
    narrativeSummary: summarize(compact, themes, signalSummary, sentiment.sentiment),
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

async function generateAiInsight(text) {
  if (!process.env.OPENAI_API_KEY) return null

  const fallback = buildHeuristicInsight(text)
  const model = process.env.OPENAI_INSIGHT_MODEL || process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini"
  async function callOpenAiJson(system, user) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
    })

    if (!response.ok) {
      const message = await response.text().catch(() => "")
      throw new Error(`OpenAI insight generation failed (${response.status}): ${message.slice(0, 280)}`)
    }

    const data = await response.json()
    return JSON.parse(data.choices?.[0]?.message?.content || "{}")
  }

  const [narrative, signal, quotes] = await Promise.all([
    callOpenAiJson(
      "You are a world-class product analyst. Return strict JSON with keys narrativeSummary, primaryTheme, themes. " +
        "narrativeSummary must be a concise 1-2 sentence synthesis of what the responder means and must not restate the transcript verbatim. " +
        "primaryTheme must be 1-3 words. themes must contain up to 4 lower-case themes.",
      `Transcript:\n${text}`,
    ).catch(() => ({})),
    callOpenAiJson(
      "You are extracting structured intelligence from user feedback. Return strict JSON with keys signalSummary and sentiment. " +
        "signalSummary must contain complaint, opportunity, emotion, frictionMoment, confidence. sentiment must be positive, negative, or neutral.",
      `Transcript:\n${text}`,
    ).catch(() => ({})),
    callOpenAiJson(
      "Extract the most impactful verbatim quotes from this transcript. Return strict JSON with key verbatimQuotes. " +
        "Keep each quote under 20 words, preserve transcript wording, and prefer strong opinion, emotion, or sharp insight.",
      `Transcript:\n${text}`,
    ).catch(() => ({})),
  ])

  const themes = Array.isArray(narrative.themes)
    ? narrative.themes.map((theme) => normalizeWhitespace(String(theme)).toLowerCase()).filter(Boolean).slice(0, 4)
    : fallback.themes
  const sentiment =
    signal.sentiment === "positive" || signal.sentiment === "negative" || signal.sentiment === "neutral"
      ? signal.sentiment
      : fallback.sentiment
  const signalSummary = signal.signalSummary ?? fallback.signalSummary
  const quoteCandidates = coerceQuotesFromTranscript(text, quotes.verbatimQuotes, themes)

  return {
    narrativeSummary: truncate(normalizeWhitespace(narrative.narrativeSummary || "") || fallback.narrativeSummary, 220),
    signalSummary,
    powerQuote: quoteCandidates[0]?.quote ?? null,
    verbatimQuotes: quoteCandidates.map((candidate) => candidate.quote),
    quoteCandidates,
    primaryTheme: normalizeWhitespace(narrative.primaryTheme || "") || themes[0] || fallback.primaryTheme,
    themes,
    sentiment,
    sentimentScore: fallback.sentimentScore,
    signalScore: calculateSignalScore(text, themes, signalSummary),
    provider: "openai-response-structured",
    extractorVersion: "v3",
  }
}

async function extractAndStoreInsight({ transcriptId, responseId, transcriptText }) {
  const text = (transcriptText || "").trim()
  const insight = text ? (await generateAiInsight(text).catch(() => null)) ?? buildHeuristicInsight(text) : buildHeuristicInsight(text)

  await upsertInsightResult({
    transcriptId,
    responseId: responseId ?? null,
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

  const surveyId = responseId
    ? (await supabaseRequest(`/rest/v1/response_records?id=eq.${encodeURIComponent(responseId)}&select=survey_id&limit=1`).catch(() => []))?.[0]?.survey_id
    : null
  if (surveyId) {
    await refreshReleaseInsight(surveyId).catch(() => null)
  }
}

async function refreshReleaseInsight(surveyId) {
  const responseRows = await supabaseRequest(
    `/rest/v1/response_records?survey_id=eq.${encodeURIComponent(surveyId)}&status=eq.uploaded&select=id,hot_take,listening_rank&order=created_at.desc&limit=500`,
  )
  if (!Array.isArray(responseRows) || !responseRows.length) {
    return
  }

  const responseIds = responseRows.map((row) => row.id)
  const transcriptRows = await supabaseRequest(
    `/rest/v1/response_transcripts?response_id=in.(${responseIds.map((id) => encodeURIComponent(id)).join(",")})&select=id,response_id`,
  )
  const transcriptByResponseId = new Map((Array.isArray(transcriptRows) ? transcriptRows : []).map((row) => [row.response_id, row.id]))
  const transcriptIds = Array.from(transcriptByResponseId.values())
  const insightRows = transcriptIds.length
    ? await supabaseRequest(
        `/rest/v1/insight_results?transcript_id=in.(${transcriptIds.map((id) => encodeURIComponent(id)).join(",")})&select=response_id,narrative_summary,power_quote,primary_theme,themes,signal_summary,signal_score,sentiment`,
      )
    : []

  const complaintMap = new Map()
  const opportunityMap = new Map()
  const clusters = []
  const contrarianInsights = []
  const emergingSignals = []

  for (const row of Array.isArray(insightRows) ? insightRows : []) {
    const signalSummary = row.signal_summary || {}
    const complaint = normalizeWhitespace(signalSummary.complaint || row.primary_theme || "")
    const opportunity = normalizeWhitespace(signalSummary.opportunity || "")
    if (complaint) complaintMap.set(complaint, (complaintMap.get(complaint) || 0) + 1)
    if (opportunity) opportunityMap.set(opportunity, (opportunityMap.get(opportunity) || 0) + 1)
    if ((row.signal_score || 0) >= 70 && row.themes?.[1]) {
      emergingSignals.push(`${row.themes[1]} is showing up less often, but with unusually strong conviction.`)
    }
    if (row.sentiment === "positive" && complaint) {
      contrarianInsights.push(`A minority of responders frame ${complaint.toLowerCase()} as working better than expected.`)
    }
    if (complaint) {
      clusters.push({
        label: complaint.split(" ").slice(0, 4).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "),
        count: complaintMap.get(complaint),
        description: opportunity
          ? `${complaint} keeps recurring, and the clearest next move points toward ${opportunity.toLowerCase()}.`
          : `${complaint} keeps recurring and deserves direct listening.`,
        representativeResponseIds: row.response_id ? [row.response_id] : [],
        representativeQuote: row.power_quote || null,
        representativeTakeId: row.response_id || null,
      })
    }
  }

  const topComplaints = Array.from(complaintMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, count }))
  const topOpportunities = Array.from(opportunityMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label]) => ({ label, reason: `Responders repeatedly imply ${label.toLowerCase()} would improve the release.` }))

  const narrativeSummary = topComplaints.length
    ? `Across this release, the clearest repeated complaint centers on ${topComplaints[0].label.toLowerCase()}${topComplaints[1] ? `, followed by ${topComplaints[1].label.toLowerCase()}` : ""}. ${topOpportunities[0] ? `The strongest opportunity points toward ${topOpportunities[0].label.toLowerCase()}.` : ""}`.trim()
    : "This release is still filling in, but early takes are ready for listening and clustering."

  await supabaseRequest("/rest/v1/release_insights?on_conflict=survey_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([
      {
        survey_id: surveyId,
        narrative_summary: narrativeSummary,
        signal_summary: {
          topComplaints,
          topOpportunities,
          emergingSignals: emergingSignals.slice(0, 3),
          contrarianInsights: contrarianInsights.slice(0, 3),
        },
        clusters: clusters
          .sort((a, b) => b.count - a.count)
          .slice(0, 4),
        share_artifacts: {
          topQuotes: clusters.map((cluster) => cluster.representativeQuote).filter(Boolean).slice(0, 3),
          bestClusterLabel: clusters[0]?.label ?? null,
          bestClipCandidateIds: clusters.map((cluster) => cluster.representativeTakeId).filter(Boolean).slice(0, 3),
        },
        provider: "audioform-release-heuristic",
        extractor_version: "release-v1",
        updated_at: new Date().toISOString(),
      },
    ]),
  })
}

async function incrementQueueMetric(metric) {
  await runRedisCommand(["INCR", `audioform:queue-metric:${metric}`])
}

function parseRedisUrl() {
  const redisUrl = process.env.REDIS_URL?.trim()
  if (!redisUrl) throw new Error("REDIS_URL is required for queue worker")

  const parsed = new URL(redisUrl)
  return {
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : parsed.protocol === "rediss:" ? 6380 : 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    tls: parsed.protocol === "rediss:",
  }
}

function encodeCommand(parts) {
  let output = `*${parts.length}\r\n`
  for (const part of parts) {
    output += `$${Buffer.byteLength(part)}\r\n${part}\r\n`
  }
  return output
}

function parseValue(input, index = 0) {
  const prefix = input[index]
  const lineEnd = input.indexOf("\r\n", index)
  if (lineEnd === -1) throw new Error("Incomplete Redis response.")

  if (prefix === "+") return { value: input.slice(index + 1, lineEnd), nextIndex: lineEnd + 2 }
  if (prefix === ":") return { value: Number.parseInt(input.slice(index + 1, lineEnd), 10), nextIndex: lineEnd + 2 }
  if (prefix === "$") {
    const length = Number.parseInt(input.slice(index + 1, lineEnd), 10)
    if (length === -1) return { value: null, nextIndex: lineEnd + 2 }
    const start = lineEnd + 2
    const end = start + length
    if (input.length < end + 2) throw new Error("Incomplete Redis response.")
    if (input.slice(end, end + 2) !== "\r\n") throw new Error("Incomplete Redis response.")
    return { value: input.slice(start, end), nextIndex: end + 2 }
  }
  if (prefix === "*") {
    const count = Number.parseInt(input.slice(index + 1, lineEnd), 10)
    if (count === -1) return { value: null, nextIndex: lineEnd + 2 }
    const values = []
    let nextIndex = lineEnd + 2
    for (let i = 0; i < count; i += 1) {
      const parsed = parseValue(input, nextIndex)
      values.push(parsed.value)
      nextIndex = parsed.nextIndex
    }
    return { value: values, nextIndex }
  }
  if (prefix === "-") throw new Error(input.slice(index + 1, lineEnd))
  throw new Error(`Unsupported Redis response prefix: ${prefix}`)
}

async function runRedisCommand(parts) {
  const options = parseRedisUrl()
  const socket = options.tls
    ? connectTls({ host: options.host, port: options.port, servername: options.host })
    : new Socket()

  if (!options.tls) socket.connect(options.port, options.host)
  socket.setTimeout(10000)

  return await new Promise((resolve, reject) => {
    let buffer = ""
    let authenticated = false

    const cleanup = () => {
      socket.removeAllListeners()
      socket.end()
      socket.destroy()
    }

    const fail = (error) => {
      cleanup()
      reject(error)
    }

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8")
      try {
        const parsed = parseValue(buffer)
        const authParts = options.username
          ? ["AUTH", options.username, options.password || ""]
          : options.password
            ? ["AUTH", options.password]
            : null

        if (authParts && !authenticated) {
          authenticated = true
          buffer = buffer.slice(parsed.nextIndex)
          socket.write(encodeCommand(parts))
          return
        }

        cleanup()
        resolve(parsed.value)
      } catch (error) {
        if (error instanceof Error && error.message === "Incomplete Redis response.") return
        fail(error)
      }
    })

    socket.once("error", fail)
    socket.once("timeout", () => fail(new Error("Redis command timed out.")))

    const authParts = options.username
      ? ["AUTH", options.username, options.password || ""]
      : options.password
        ? ["AUTH", options.password]
        : null

    if (authParts) {
      socket.write(encodeCommand(authParts))
    } else {
      socket.write(encodeCommand(parts))
    }
  })
}

async function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number.parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  }

  throw new Error("SMTP credentials are required for queue worker")
}

async function processEmailJob(payload) {
  const transporter = await createTransporter()
  await transporter.sendMail({
    from: '"AudioForm" <notifications@audioform.example.com>',
    to: payload.to.join(", "),
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  })
  await incrementQueueMetric("emails")
}

async function processAnalyticsJob(payload) {
  await supabaseRequest("/rest/v1/analytics_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([
      {
        id: crypto.randomUUID(),
        event_name: payload.eventName,
        user_id: payload.userId ?? null,
        survey_id: payload.surveyId ?? null,
        response_id: payload.responseId ?? null,
        event_data: payload.eventData ?? {},
        timestamp: new Date().toISOString(),
      },
    ]),
  })
  await incrementQueueMetric("analytics")
}

async function processNotificationDigestJob(payload) {
  const [configRows, userRows, surveyRows] = await Promise.all([
    supabaseRequest(
      `/rest/v1/notification_configs?user_id=eq.${encodeURIComponent(payload.userId)}&select=user_id,new_response,completed_questionnaire,daily_summary,weekly_summary,template_subject,template_body,recipients,updated_at&limit=1`,
    ),
    supabaseRequest(
      `/rest/v1/users?id=eq.${encodeURIComponent(payload.userId)}&select=id,name,email&limit=1`,
    ),
    supabaseRequest(
      `/rest/v1/surveys?created_by=eq.${encodeURIComponent(payload.userId)}&select=id,title,status&order=updated_at.desc`,
    ),
  ])

  const config = Array.isArray(configRows) ? configRows[0] : null
  const user = Array.isArray(userRows) ? userRows[0] : null
  const surveys = Array.isArray(surveyRows) ? surveyRows : []

  if (!user) {
    console.warn("[queue-worker] digest skipped: missing user", payload.userId)
    return
  }

  if (!config) {
    console.warn("[queue-worker] digest skipped: missing config", payload.userId)
    return
  }

  const digestEnabled = payload.digestType === "daily" ? config.daily_summary : config.weekly_summary
  if (!digestEnabled) {
    console.log("[queue-worker] digest skipped: disabled", payload)
    return
  }

  const recipientList = Array.isArray(config.recipients) && config.recipients.length ? config.recipients : [user.email]
  const surveyIds = surveys.map((survey) => survey.id)
  let responseCount = 0

  if (surveyIds.length) {
    const since = new Date(
      Date.now() - (payload.digestType === "daily" ? 24 : 7 * 24) * 60 * 60 * 1000,
    ).toISOString()
    const countResponse = await fetch(
      `${resolveSupabaseConfig().url}/rest/v1/response_records?survey_id=in.(${surveyIds.map((id) => encodeURIComponent(id)).join(",")})&status=eq.uploaded&created_at=gte.${since}&select=id`,
      {
        method: "HEAD",
        headers: {
          apikey: resolveSupabaseConfig().key,
          Authorization: `Bearer ${resolveSupabaseConfig().key}`,
          Prefer: "count=exact",
          Range: "0-0",
        },
      },
    )
    if (countResponse.ok) {
      const contentRange = countResponse.headers.get("content-range")
      const total = contentRange?.split("/")[1]
      responseCount = total ? Number.parseInt(total, 10) || 0 : 0
    }
  }

  const publishedCount = surveys.filter((survey) => survey.status === "published").length
  const subject = `${payload.digestType === "daily" ? "Daily" : "Weekly"} Audioform digest`
  const text = [
    `Hi ${user.name || "there"},`,
    "",
    `Here is your ${payload.digestType} Audioform digest.`,
    `Surveys: ${surveys.length}`,
    `Published surveys: ${publishedCount}`,
    `New uploaded responses: ${responseCount}`,
    "",
    "Open your dashboard to review the latest voice feedback.",
  ].join("\n")

  await processEmailJob({
    to: recipientList,
    subject,
    text,
    html: `<div style="font-family:sans-serif;max-width:640px;margin:0 auto;">
      <h1 style="font-size:22px;margin-bottom:12px;">${subject}</h1>
      <p style="line-height:1.6;">Hi ${user.name || "there"},</p>
      <p style="line-height:1.6;">Here is your ${payload.digestType} Audioform digest.</p>
      <ul style="line-height:1.8; padding-left: 18px;">
        <li>Surveys: ${surveys.length}</li>
        <li>Published surveys: ${publishedCount}</li>
        <li>New uploaded responses: ${responseCount}</li>
      </ul>
      <p style="line-height:1.6;">Open your dashboard to review the latest voice feedback.</p>
    </div>`,
  })
  await incrementQueueMetric("digests")
}

async function transcribeAudioPayload(payload) {
  const bytes = Buffer.from(payload.audioBase64, "base64")
  const file = new File([bytes], payload.fileName || "audio.webm", {
    type: payload.mimeType || "audio/webm",
  })

  const configured = (process.env.TRANSCRIPTION_PROVIDER || "").trim().toLowerCase()
  const provider = configured === "openai" ? "openai" : configured === "deepgram" ? "deepgram" : process.env.DEEPGRAM_API_KEY ? "deepgram" : "openai"

  if (provider === "deepgram") {
    if (!process.env.DEEPGRAM_API_KEY) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Deepgram transcription provider is not configured in production.")
      }

      return "This is a mock transcription since DEEPGRAM_API_KEY is not configured. In a production environment, this would be the actual transcription of the audio."
    }

    const model = process.env.DEEPGRAM_MODEL || "nova-2"
    const response = await fetch(`https://api.deepgram.com/v1/listen?model=${encodeURIComponent(model)}&smart_format=true`, {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": payload.mimeType || "audio/webm",
      },
      body: Uint8Array.from(bytes),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      throw new Error(`Transcription provider request failed (${response.status}): ${text.slice(0, 400)}`)
    }

    const data = await response.json()
    return data.results?.channels?.[0]?.alternatives?.[0]?.transcript || ""
  }

  if (!process.env.OPENAI_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OpenAI transcription provider is not configured in production.")
    }

    return "This is a mock transcription since OPENAI_API_KEY is not configured. In a production environment, this would be the actual transcription of the audio."
  }

  const openaiForm = new FormData()
  openaiForm.append("file", file)
  openaiForm.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe")

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: openaiForm,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`Transcription provider request failed (${response.status}): ${text.slice(0, 400)}`)
  }

  const data = await response.json()
  return data.text || ""
}

async function processNext() {
  const result = await runRedisCommand(["BLPOP", "audioform:jobs", "5"])
  if (!Array.isArray(result) || result.length < 2 || typeof result[1] !== "string") return false

  const envelope = JSON.parse(result[1])
  if (envelope.type === "email.send") {
    await processEmailJob(envelope.payload)
    await incrementQueueMetric("processed")
    console.log(`[queue-worker] processed ${envelope.type}`, { id: envelope.id })
    return true
  }

  if (envelope.type === "transcription.process") {
    try {
      const transcription = await transcribeAudioPayload(envelope.payload)
      await completeTranscript(envelope.id, transcription, "openai")
      const transcriptRows = await supabaseRequest(`/rest/v1/response_transcripts?job_id=eq.${encodeURIComponent(envelope.id)}&select=id,response_id,transcript_text&limit=1`)
      const transcriptRow = Array.isArray(transcriptRows) ? transcriptRows[0] : null
      if (transcriptRow) {
        await extractAndStoreInsight({
          transcriptId: transcriptRow.id,
          responseId: transcriptRow.response_id,
          transcriptText: transcriptRow.transcript_text || transcription,
        })
      }
      await setJobResult(envelope.id, {
        success: true,
        transcription,
        questionId: envelope.payload.questionId,
        responseId: envelope.payload.responseId ?? null,
        completedAt: new Date().toISOString(),
      })
      await incrementQueueMetric("transcriptions")
      await incrementQueueMetric("processed")
      console.log(`[queue-worker] processed ${envelope.type}`, { id: envelope.id })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await failTranscript(envelope.id, message, "openai").catch(() => {})
      await incrementQueueMetric("failed")
      throw error
    }
  }

  if (envelope.type === "analytics.record") {
    await processAnalyticsJob(envelope.payload)
    await incrementQueueMetric("processed")
    console.log(`[queue-worker] processed ${envelope.type}`, { id: envelope.id })
    return true
  }

  if (envelope.type === "notification.digest") {
    await processNotificationDigestJob(envelope.payload)
    await incrementQueueMetric("processed")
    console.log(`[queue-worker] processed ${envelope.type}`, { id: envelope.id })
    return true
  }

  console.warn(`[queue-worker] unknown job type`, envelope.type)
  return false
}

async function main() {
  console.log("[queue-worker] started")
  while (true) {
    try {
      await processNext()
    } catch (error) {
      await incrementQueueMetric("failed").catch(() => {})
      console.error("[queue-worker] failed", error)
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
}

main().catch((error) => {
  console.error("[queue-worker] fatal", error)
  process.exit(1)
})
