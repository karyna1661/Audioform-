import { upsertInsightResult } from "@/lib/server/insight-store"
import type { StoredTranscript } from "@/lib/server/transcript-store"

function pickSentiment(text: string): { sentiment: "positive" | "negative" | "neutral"; score: number } {
  const positiveWords = ["love", "great", "clear", "easy", "smooth", "helpful"]
  const negativeWords = ["confusing", "unclear", "frustrating", "hard", "slow", "stuck", "difficult"]
  const lower = text.toLowerCase()
  const positiveHits = positiveWords.filter((word) => lower.includes(word)).length
  const negativeHits = negativeWords.filter((word) => lower.includes(word)).length

  if (negativeHits > positiveHits) return { sentiment: "negative", score: Math.min(0.9, 0.55 + negativeHits * 0.08) }
  if (positiveHits > negativeHits) return { sentiment: "positive", score: Math.min(0.9, 0.55 + positiveHits * 0.08) }
  return { sentiment: "neutral", score: 0.5 }
}

function extractThemes(text: string): string[] {
  const lower = text.toLowerCase()
  const themeMatchers: Array<[string, string[]]> = [
    ["onboarding", ["onboarding", "getting started", "setup", "first time"]],
    ["pricing", ["pricing", "price", "cost", "expensive", "cheap"]],
    ["navigation", ["find", "where", "navigate", "menu"]],
    ["clarity", ["clear", "unclear", "confusing", "understand"]],
    ["speed", ["slow", "fast", "loading", "upload"]],
  ]

  const matches = themeMatchers.filter(([, needles]) => needles.some((needle) => lower.includes(needle))).map(([theme]) => theme)
  return matches.slice(0, 3)
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

function sentenceScore(sentence: string, themes: string[]): number {
  const lower = sentence.toLowerCase()
  let score = 0

  if (sentence.length >= 45 && sentence.length <= 150) score += 3
  if (/[.!?]$/.test(sentence)) score += 1
  if (sentence.includes('"') || sentence.includes("'")) score += 1
  if (themes.some((theme) => lower.includes(theme))) score += 2
  if (/(because|but|so|when|after|before|instead)/.test(lower)) score += 1
  if (/(confusing|unclear|frustrating|hard|slow|stuck|difficult|love|great|easy|helpful)/.test(lower)) score += 1

  return score
}

function summarize(text: string, themes: string[], sentiment: "positive" | "negative" | "neutral"): string {
  const compact = normalizeWhitespace(text)
  if (!compact) return "Voice feedback captured."

  const themeLabel =
    themes.length >= 2
      ? `${themes[0]} and ${themes[1]}`
      : themes[0] ?? null

  const toneLead =
    sentiment === "negative"
      ? "The respondent describes friction"
      : sentiment === "positive"
        ? "The respondent highlights a positive experience"
        : "The respondent focuses on"

  if (themeLabel) {
    const summary = `${toneLead} around ${themeLabel}.`
    if (summary.length <= 140) return summary
  }

  const firstSentence = splitIntoSentences(compact)[0] ?? compact
  const trimmedSentence = firstSentence.length <= 120 ? firstSentence : `${firstSentence.slice(0, 117)}...`
  return `Key point: ${trimmedSentence}`
}

function extractQuotes(text: string, themes: string[]): string[] {
  const sentences = splitIntoSentences(text)
  if (!sentences.length) return []

  const ranked = [...sentences].sort((a, b) => sentenceScore(b, themes) - sentenceScore(a, themes))
  const best = ranked[0]
  if (!best) return []

  return [best.length <= 160 ? best : `${best.slice(0, 157)}...`]
}

function calculateSignalScore(text: string, themes: string[]): number {
  const lengthBoost = Math.min(40, Math.round(text.length / 12))
  const themeBoost = themes.length * 15
  return Math.max(25, Math.min(100, 25 + lengthBoost + themeBoost))
}

function toSentenceCase(value: string): string {
  const trimmed = normalizeWhitespace(value)
  if (!trimmed) return ""
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function buildHeuristicInsight(text: string) {
  const themes = extractThemes(text)
  const sentiment = pickSentiment(text)
  const summary = summarize(text, themes, sentiment.sentiment)
  const quotes = extractQuotes(text, themes)
  const signalScore = calculateSignalScore(text, themes)

  return {
    summary,
    quotes,
    primaryTheme: themes[0] ?? null,
    themes,
    sentiment: sentiment.sentiment,
    sentimentScore: sentiment.score,
    signalScore,
    provider: "audioform-heuristic",
    extractorVersion: "v2",
  }
}

function normalizeForInclusion(value: string): string {
  return value
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function coerceQuoteFromTranscript(text: string, quote: string | null | undefined, themes: string[]): string[] {
  const candidate = normalizeWhitespace(quote ?? "")
  if (!candidate) return extractQuotes(text, themes)

  const transcriptSentences = splitIntoSentences(text)
  const normalizedCandidate = normalizeForInclusion(candidate)
  const exactSentence = transcriptSentences.find((sentence) =>
    normalizeForInclusion(sentence).includes(normalizedCandidate),
  )

  if (exactSentence) {
    return [exactSentence.length <= 160 ? exactSentence : `${exactSentence.slice(0, 157)}...`]
  }

  const partialMatch = transcriptSentences.find((sentence) => {
    const normalizedSentence = normalizeForInclusion(sentence)
    const probe = normalizedCandidate.slice(0, Math.min(50, normalizedCandidate.length))
    return probe.length >= 18 && normalizedSentence.includes(probe)
  })

  if (partialMatch) {
    return [partialMatch.length <= 160 ? partialMatch : `${partialMatch.slice(0, 157)}...`]
  }

  return extractQuotes(text, themes)
}

async function generateAiInsight(text: string) {
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
            "You turn voice-feedback transcripts into shareable insight cards. Return strict JSON with keys: summary, quote, primaryTheme, themes, sentiment. " +
            "Rules: summary must be a grammatical paraphrase of what was said, not a transcript copy, and no more than 2 short lines / 160 characters. " +
            "quote must be an exact excerpt from the transcript, under 140 characters. primaryTheme should be 1-3 words. themes should contain up to 3 concise lower-case themes. " +
            "sentiment must be positive, negative, or neutral. Stay faithful to the transcript.",
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
    throw new Error(`OpenAI insight summary failed (${response.status}): ${message.slice(0, 280)}`)
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
    quote?: string
    primaryTheme?: string
    themes?: string[]
    sentiment?: "positive" | "negative" | "neutral"
  }

  const themes = Array.isArray(parsed.themes)
    ? parsed.themes.map((theme) => normalizeWhitespace(theme).toLowerCase()).filter(Boolean).slice(0, 3)
    : fallback.themes
  const sentiment =
    parsed.sentiment === "positive" || parsed.sentiment === "negative" || parsed.sentiment === "neutral"
      ? parsed.sentiment
      : fallback.sentiment
  const summary = normalizeWhitespace(parsed.summary ?? "") || fallback.summary
  const quotes = coerceQuoteFromTranscript(text, parsed.quote, themes)
  const primaryTheme = normalizeWhitespace(parsed.primaryTheme ?? "") || themes[0] || fallback.primaryTheme || null

  return {
    summary: toSentenceCase(summary),
    quotes,
    primaryTheme,
    themes,
    sentiment,
    sentimentScore: fallback.sentimentScore,
    signalScore: fallback.signalScore,
    provider: "openai-summary",
    extractorVersion: "v3",
  }
}

export async function extractAndStoreInsight(transcript: StoredTranscript) {
  const text = transcript.transcriptText?.trim() || ""
  const extracted = text
    ? await generateAiInsight(text).catch(() => null)
    : null
  const fallback = buildHeuristicInsight(text)
  const insight = extracted ?? fallback

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
