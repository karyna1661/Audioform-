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

export async function extractAndStoreInsight(transcript: StoredTranscript) {
  const text = transcript.transcriptText?.trim() || ""
  const themes = extractThemes(text)
  const sentiment = pickSentiment(text)
  const summary = summarize(text, themes, sentiment.sentiment)
  const quotes = extractQuotes(text, themes)
  const signalScore = calculateSignalScore(text, themes)

  return upsertInsightResult({
    transcriptId: transcript.id,
    responseId: transcript.responseId,
    summary,
    primaryTheme: themes[0] ?? null,
    themes,
    sentiment: sentiment.sentiment,
    sentimentScore: sentiment.score,
    signalScore,
    quotes,
    provider: "audioform-heuristic",
    extractorVersion: "v1",
  })
}
