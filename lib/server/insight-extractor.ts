import { aggregateAndStoreReleaseInsight } from "@/lib/server/release-insight-engine"
import { upsertInsightResult } from "@/lib/server/insight-store"
import type { ResponseQuoteCandidate, ResponseSignalSummary } from "@/lib/server/insight-types"
import { getStoredResponseById } from "@/lib/server/response-store"
import type { StoredTranscript } from "@/lib/server/transcript-store"

type Sentiment = "positive" | "negative" | "neutral"

type BuiltInsight = {
  narrativeSummary: string
  signalSummary: ResponseSignalSummary
  powerQuote: string | null
  verbatimQuotes: string[]
  quoteCandidates: ResponseQuoteCandidate[]
  primaryTheme: string | null
  themes: string[]
  sentiment: Sentiment
  sentimentScore: number
  signalScore: number
  provider: string
  extractorVersion: string
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

function splitIntoSentences(text: string): string[] {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
}

function clipVerbatimQuote(sentence: string, maxLength = 140): string {
  if (sentence.length <= maxLength) return sentence

  const clipped = sentence.slice(0, maxLength)
  const lastSoftBreak = Math.max(clipped.lastIndexOf(","), clipped.lastIndexOf(";"), clipped.lastIndexOf(" "))
  const candidate = (lastSoftBreak > 48 ? clipped.slice(0, lastSoftBreak) : clipped).trim()
  return candidate || clipped.trim()
}

function pickSentiment(text: string): { sentiment: Sentiment; score: number } {
  const positiveWords = ["love", "great", "clear", "easy", "smooth", "helpful", "excited", "good", "confident"]
  const negativeWords = ["confusing", "unclear", "frustrating", "hard", "slow", "stuck", "difficult", "awkward", "lost"]
  const lower = text.toLowerCase()
  const positiveHits = positiveWords.filter((word) => lower.includes(word)).length
  const negativeHits = negativeWords.filter((word) => lower.includes(word)).length

  if (negativeHits > positiveHits) return { sentiment: "negative", score: Math.min(0.92, 0.52 + negativeHits * 0.09) }
  if (positiveHits > negativeHits) return { sentiment: "positive", score: Math.min(0.92, 0.52 + positiveHits * 0.09) }
  return { sentiment: "neutral", score: 0.5 }
}

function extractThemes(text: string): string[] {
  const lower = text.toLowerCase()
  const themeMatchers: Array<[string, string[]]> = [
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

function scoreQuoteCandidate(sentence: string, themes: string[]): ResponseQuoteCandidate {
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

function pickQuoteCandidates(text: string, themes: string[]): ResponseQuoteCandidate[] {
  return splitIntoSentences(text)
    .filter((sentence) => sentence.length >= 18)
    .map((sentence) => scoreQuoteCandidate(sentence, themes))
    .filter((candidate) => candidate.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

function calculateSignalScore(text: string, themes: string[], signalSummary: ResponseSignalSummary): number {
  const lengthBoost = Math.min(35, Math.round(text.length / 14))
  const themeBoost = themes.length * 10
  const signalBoost = signalSummary.complaint ? 12 : 0
  const opportunityBoost = signalSummary.opportunity ? 10 : 0
  return Math.max(28, Math.min(100, 28 + lengthBoost + themeBoost + signalBoost + opportunityBoost))
}

function buildHeuristicNarrativeSummary(text: string, themes: string[], signalSummary: ResponseSignalSummary, sentiment: Sentiment): string {
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

  const lead = splitIntoSentences(text)[0] ?? text
  return truncate(`The responder centers on one concrete moment: ${lead.toLowerCase()}`, 220)
}

function buildHeuristicSignalSummary(text: string, themes: string[], sentiment: Sentiment): ResponseSignalSummary {
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

function normalizeForInclusion(value: string): string {
  return value
    .toLowerCase()
    .replace(/[â€œâ€]/g, "\"")
    .replace(/[â€˜â€™]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function coerceVerbatimCandidates(text: string, candidates: string[] | undefined, themes: string[]): ResponseQuoteCandidate[] {
  const transcriptSentences = splitIntoSentences(text)
  const matches: string[] = []

  for (const candidate of candidates ?? []) {
    const probe = normalizeForInclusion(candidate)
    if (!probe) continue
    const exact = transcriptSentences.find((sentence) => normalizeForInclusion(sentence).includes(probe))
    if (exact && !matches.includes(exact)) {
      matches.push(exact)
    }
  }

  return matches.length ? matches.map((sentence) => scoreQuoteCandidate(sentence, themes)) : pickQuoteCandidates(text, themes)
}

async function callOpenAiJson<T>(system: string, user: string): Promise<T> {
  const model = process.env.OPENAI_INSIGHT_MODEL || process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini"
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
    cache: "no-store",
  })

  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(`OpenAI insight generation failed (${response.status}): ${message.slice(0, 280)}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
  }
  return JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as T
}

async function generateAiNarrativeInsight(text: string): Promise<{
  narrativeSummary?: string
  primaryTheme?: string
  themes?: string[]
}> {
  return callOpenAiJson(
    "You are a world-class product analyst. Return strict JSON with keys narrativeSummary, primaryTheme, themes. " +
      "narrativeSummary must be a concise 1-2 sentence synthesis of what the responder means and must not restate the transcript verbatim. " +
      "primaryTheme must be 1-3 words. themes must contain up to 4 lower-case themes.",
    `Transcript:\n${text}`,
  )
}

async function generateAiSignalInsight(text: string): Promise<{
  signalSummary?: ResponseSignalSummary
  sentiment?: Sentiment
}> {
  return callOpenAiJson(
    "You are extracting structured intelligence from user feedback. Return strict JSON with keys signalSummary and sentiment. " +
      "signalSummary must contain complaint, opportunity, emotion, frictionMoment, confidence. " +
      "complaint groups the main friction. opportunity infers the strongest solution direction. emotion is the dominant emotional tone. " +
      "sentiment must be positive, negative, or neutral.",
    `Transcript:\n${text}`,
  )
}

async function generateAiQuoteCandidates(text: string): Promise<{
  verbatimQuotes?: string[]
}> {
  return callOpenAiJson(
    "Extract the most impactful verbatim quotes from this transcript. Return strict JSON with key verbatimQuotes. " +
      "Rules: keep each quote under 20 words, keep wording verbatim, prefer strong opinion, emotion, or sharp insight, avoid vague lines.",
    `Transcript:\n${text}`,
  )
}

async function generateAiInsight(text: string): Promise<BuiltInsight | null> {
  if (!process.env.OPENAI_API_KEY) return null

  const fallback = buildHeuristicInsight(text)
  const [narrative, signal, quotes]: [
    Awaited<ReturnType<typeof generateAiNarrativeInsight>>,
    Awaited<ReturnType<typeof generateAiSignalInsight>>,
    Awaited<ReturnType<typeof generateAiQuoteCandidates>>,
  ] = await Promise.all([
    generateAiNarrativeInsight(text).catch(() => ({})),
    generateAiSignalInsight(text).catch(() => ({})),
    generateAiQuoteCandidates(text).catch(() => ({})),
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
    narrativeSummary:
      truncate(normalizeWhitespace(narrative.narrativeSummary ?? "") || fallback.narrativeSummary, 220),
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

function buildHeuristicInsight(text: string): BuiltInsight {
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

export async function extractAndStoreInsight(transcript: StoredTranscript) {
  const text = transcript.transcriptText?.trim() || ""
  const insight = text ? (await generateAiInsight(text).catch(() => null)) ?? buildHeuristicInsight(text) : buildHeuristicInsight(text)

  const stored = await upsertInsightResult({
    transcriptId: transcript.id,
    responseId: transcript.responseId,
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

  if (transcript.responseId) {
    const response = await getStoredResponseById(transcript.responseId).catch(() => null)
    if (response?.surveyId) {
      await aggregateAndStoreReleaseInsight(response.surveyId).catch(() => null)
    }
  }

  return stored
}
