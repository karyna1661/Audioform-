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

function summarize(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim()
  if (compact.length <= 180) return compact
  return `${compact.slice(0, 177)}...`
}

function extractQuotes(text: string): string[] {
  const compact = text.replace(/\s+/g, " ").trim()
  if (!compact) return []
  return [compact.length <= 160 ? compact : `${compact.slice(0, 157)}...`]
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
  const summary = summarize(text)
  const quotes = extractQuotes(text)
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
