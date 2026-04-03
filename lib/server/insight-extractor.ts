import { upsertInsightResult } from "@/lib/server/insight-store"
import type { StoredTranscript } from "@/lib/server/transcript-store"

type Sentiment = "positive" | "negative" | "neutral"

type BuiltInsight = {
  summary: string
  primaryTheme: string | null
  themes: string[]
  sentiment: Sentiment
  sentimentScore: number
  signalScore: number
  quotes: string[]
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
  const positiveWords = ["love", "great", "clear", "easy", "smooth", "helpful", "excited", "good"]
  const negativeWords = ["confusing", "unclear", "frustrating", "hard", "slow", "stuck", "difficult", "awkward"]
  const lower = text.toLowerCase()
  const positiveHits = positiveWords.filter((word) => lower.includes(word)).length
  const negativeHits = negativeWords.filter((word) => lower.includes(word)).length

  if (negativeHits > positiveHits) return { sentiment: "negative", score: Math.min(0.92, 0.56 + negativeHits * 0.08) }
  if (positiveHits > negativeHits) return { sentiment: "positive", score: Math.min(0.92, 0.56 + positiveHits * 0.08) }
  return { sentiment: "neutral", score: 0.5 }
}

function extractThemes(text: string): string[] {
  const lower = text.toLowerCase()
  const themeMatchers: Array<[string, string[]]> = [
    ["onboarding", ["onboarding", "getting started", "setup", "first time"]],
    ["pricing", ["pricing", "price", "cost", "expensive", "cheap"]],
    ["navigation", ["find", "where", "navigate", "menu", "landing page"]],
    ["clarity", ["clear", "unclear", "confusing", "understand", "explain"]],
    ["speed", ["slow", "fast", "loading", "upload"]],
    ["workflow", ["workflow", "integration", "slack", "notion", "export"]],
    ["trust", ["trust", "accurate", "wrong", "insight", "summary"]],
    ["mobile", ["phone", "mobile", "screen", "preview"]],
  ]

  return themeMatchers
    .filter(([, needles]) => needles.some((needle) => lower.includes(needle)))
    .map(([theme]) => theme)
    .slice(0, 4)
}

function sentenceScore(sentence: string, themes: string[]): number {
  const lower = sentence.toLowerCase()
  let score = 0

  if (sentence.length >= 35 && sentence.length <= 170) score += 3
  if (themes.some((theme) => lower.includes(theme))) score += 2
  if (/(because|but|so|when|after|instead|wish|would|almost)/.test(lower)) score += 2
  if (/(love|great|easy|excited|confusing|unclear|frustrating|hard|slow|awkward)/.test(lower)) score += 2
  if (/[.!?]$/.test(sentence)) score += 1

  return score
}

function extractQuotes(text: string, themes: string[]): string[] {
  const sentences = splitIntoSentences(text)
  if (!sentences.length) return []

  const ranked = [...sentences].sort((a, b) => sentenceScore(b, themes) - sentenceScore(a, themes))
  const best = ranked[0]
  if (!best) return []
  return [clipVerbatimQuote(best)]
}

function calculateSignalScore(text: string, themes: string[]): number {
  const lengthBoost = Math.min(40, Math.round(text.length / 12))
  const themeBoost = themes.length * 14
  return Math.max(25, Math.min(100, 25 + lengthBoost + themeBoost))
}

function buildSummary(text: string, themes: string[], sentiment: Sentiment): string {
  const compact = normalizeWhitespace(text)
  if (!compact) return "The response is still being processed into a usable summary."

  const themeLabel =
    themes.length >= 2
      ? `${themes[0]} and ${themes[1]}`
      : themes[0] ?? null

  if (themeLabel && sentiment === "negative") {
    return truncate(`The responder describes friction around ${themeLabel} and points to a moment that still feels harder than it should.`, 180)
  }
  if (themeLabel && sentiment === "positive") {
    return truncate(`The responder highlights positive momentum around ${themeLabel} and suggests this part of the experience is starting to land well.`, 180)
  }
  if (themeLabel) {
    return truncate(`The responder focuses on ${themeLabel} and gives concrete detail about how that part of the experience is landing.`, 180)
  }

  const sentences = splitIntoSentences(compact)
  const lead = sentences[0] ?? compact
  return truncate(`The responder centers on one concrete moment: ${lead.toLowerCase()}`, 180)
}

function normalizeForInclusion(value: string): string {
  return value
    .toLowerCase()
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function coerceQuotesFromTranscript(text: string, candidates: string[] | undefined, themes: string[]): string[] {
  const transcriptSentences = splitIntoSentences(text)
  if (!transcriptSentences.length) return []

  for (const candidate of candidates ?? []) {
    const probe = normalizeForInclusion(candidate)
    if (!probe) continue
    const exact = transcriptSentences.find((sentence) => normalizeForInclusion(sentence).includes(probe))
    if (exact) return [clipVerbatimQuote(exact)]
  }

  return extractQuotes(text, themes)
}

async function generateAiInsight(text: string): Promise<BuiltInsight | null> {
  if (!process.env.OPENAI_API_KEY) return null

  const fallback = buildHeuristicInsight(text)
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
        {
          role: "system",
          content:
            "You are an expert product analyst. Return strict JSON with keys: summary, primaryTheme, themes, sentiment, quotes. " +
            "summary must be a concise paraphrase of what the responder means, not a transcript copy, and no more than 180 characters. " +
            "primaryTheme must be 1-3 words. themes must contain up to 4 lower-case themes. " +
            "sentiment must be positive, negative, or neutral. quotes must be 1-2 exact verbatim excerpts from the transcript.",
        },
        {
          role: "user",
          content: `Transcript:\n${text}`,
        },
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
  const rawContent = data.choices?.[0]?.message?.content ?? ""
  const parsed = JSON.parse(rawContent) as {
    summary?: string
    primaryTheme?: string
    themes?: string[]
    sentiment?: Sentiment
    quotes?: string[]
  }

  const themes = Array.isArray(parsed.themes)
    ? parsed.themes.map((theme) => normalizeWhitespace(String(theme)).toLowerCase()).filter(Boolean).slice(0, 4)
    : fallback.themes
  const sentiment =
    parsed.sentiment === "positive" || parsed.sentiment === "negative" || parsed.sentiment === "neutral"
      ? parsed.sentiment
      : fallback.sentiment

  return {
    summary: truncate(normalizeWhitespace(parsed.summary ?? "") || fallback.summary, 180),
    primaryTheme: normalizeWhitespace(parsed.primaryTheme ?? "") || themes[0] || fallback.primaryTheme,
    themes,
    sentiment,
    sentimentScore: fallback.sentimentScore,
    signalScore: fallback.signalScore,
    quotes: coerceQuotesFromTranscript(text, parsed.quotes, themes),
    provider: "openai-structured",
    extractorVersion: "v2",
  }
}

function buildHeuristicInsight(text: string): BuiltInsight {
  const compact = normalizeWhitespace(text)
  const themes = extractThemes(compact)
  const sentiment = pickSentiment(compact)

  return {
    summary: buildSummary(compact, themes, sentiment.sentiment),
    primaryTheme: themes[0] ?? null,
    themes,
    sentiment: sentiment.sentiment,
    sentimentScore: sentiment.score,
    signalScore: calculateSignalScore(compact, themes),
    quotes: extractQuotes(compact, themes),
    provider: "audioform-heuristic",
    extractorVersion: "v2",
  }
}

export async function extractAndStoreInsight(transcript: StoredTranscript) {
  const text = transcript.transcriptText?.trim() || ""
  const insight = text ? (await generateAiInsight(text).catch(() => null)) ?? buildHeuristicInsight(text) : buildHeuristicInsight(text)

  return upsertInsightResult({
    transcriptId: transcript.id,
    responseId: transcript.responseId,
    summary: insight.summary,
    primaryTheme: insight.primaryTheme,
    themes: insight.themes,
    sentiment: insight.sentiment,
    sentimentScore: insight.sentimentScore,
    signalScore: insight.signalScore,
    quotes: insight.quotes,
    provider: insight.provider,
    extractorVersion: insight.extractorVersion,
  })
}
