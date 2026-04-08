export type ListeningPreviewClipRange = {
  startSeconds: number
  endSeconds: number
}

export type ListeningMomentumTag =
  | "blowing_up"
  | "replayed_often"
  | "most_agreed"
  | "rising_take"

type ListeningInput = {
  durationSeconds?: number | null
  transcriptText?: string | null
  transcriptStatus?: "pending" | "completed" | "failed" | null
  narrativeSummary?: string | null
  summary?: string | null
  primaryTheme?: string | null
  themes?: string[] | null
  signalScore?: number | null
  sentimentScore?: number | null
  highSignal?: boolean
  bookmarked?: boolean
  flagged?: boolean
  createdAt?: string | null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function textWordCount(value?: string | null): number {
  if (!value) return 0
  return value.trim().split(/\s+/).filter(Boolean).length
}

function summaryText(input: ListeningInput): string | null {
  return input.narrativeSummary ?? input.summary ?? null
}

function inferToneFromText(value?: string | null): "positive" | "negative" | "neutral" {
  if (!value) return "neutral"
  const lower = value.toLowerCase()
  const positiveHits = ["love", "great", "easy", "smooth", "helpful", "excited", "good"].filter((word) => lower.includes(word)).length
  const negativeHits = ["confusing", "unclear", "frustrating", "hard", "slow", "stuck", "awkward", "wrong"].filter((word) => lower.includes(word)).length

  if (negativeHits > positiveHits) return "negative"
  if (positiveHits > negativeHits) return "positive"
  return "neutral"
}

function normalize100(value: number): number {
  return clamp(value, 0, 100)
}

function computeConciseness(durationSeconds?: number | null): number {
  if (!durationSeconds || durationSeconds <= 0) return 40
  if (durationSeconds <= 20) return 95
  if (durationSeconds <= 35) return 85
  if (durationSeconds <= 55) return 72
  if (durationSeconds <= 90) return 58
  return 44
}

function computeClarity(input: ListeningInput): number {
  if (input.transcriptStatus === "failed") return 20
  if (input.transcriptStatus === "pending") return 48

  const words = textWordCount(input.transcriptText)
  if (!words) return summaryText(input) ? 62 : 45
  if (words < 12) return 55
  if (words < 35) return 74
  if (words < 80) return 88
  return 81
}

function computeEmotion(input: ListeningInput): number {
  const base = input.sentimentScore == null ? 48 : Math.min(100, Math.round(Math.abs(input.sentimentScore) * 100))
  return input.highSignal ? Math.max(base, 78) : base
}

function computeNovelty(input: ListeningInput): number {
  const themeCount = input.themes?.length ?? 0
  const summaryWords = textWordCount(summaryText(input))
  const base = 44 + themeCount * 8 + Math.min(summaryWords, 10)
  return normalize100(input.bookmarked ? base + 10 : base)
}

function computeRelevance(input: ListeningInput): number {
  const base = input.signalScore ?? (input.primaryTheme ? 70 : 52)
  return normalize100(input.highSignal ? Math.max(base, 84) : base)
}

export function computeListeningRank(input: ListeningInput): number {
  if (input.flagged) return 5

  const clarity = computeClarity(input)
  const emotion = computeEmotion(input)
  const novelty = computeNovelty(input)
  const relevance = computeRelevance(input)
  const conciseness = computeConciseness(input.durationSeconds)

  return Math.round(
    clarity * 0.25 +
      emotion * 0.25 +
      novelty * 0.2 +
      relevance * 0.2 +
      conciseness * 0.1,
  )
}

export function buildPreviewClipRange(durationSeconds?: number | null): ListeningPreviewClipRange | null {
  if (!durationSeconds || durationSeconds <= 0) return null
  const previewLength = durationSeconds < 10 ? Math.max(4, Math.floor(durationSeconds)) : Math.min(10, Math.max(5, Math.floor(durationSeconds * 0.24)))
  return {
    startSeconds: 0,
    endSeconds: clamp(previewLength, 4, Math.max(4, Math.floor(durationSeconds))),
  }
}

export function deriveHotTake(input: ListeningInput): string {
  const theme = input.primaryTheme?.trim()
  const tone = inferToneFromText(summaryText(input) || input.transcriptText)

  if (theme && tone === "negative") {
    return `Listen for the friction around ${theme}.`
  }
  if (theme && tone === "positive") {
    return `Listen for the momentum building around ${theme}.`
  }
  if (theme) {
    return `Listen for the clearest take on ${theme}.`
  }
  if (input.highSignal) {
    return "High-signal response worth hearing first."
  }
  return "Fresh voice take from the release."
}

export function deriveMomentumTags(input: ListeningInput): ListeningMomentumTag[] {
  const tags: ListeningMomentumTag[] = []
  const signal = input.signalScore ?? 0
  const sentiment = Math.abs(input.sentimentScore ?? 0)
  const duration = input.durationSeconds ?? 0

  if (signal >= 82 || input.highSignal) tags.push("blowing_up")
  if (input.bookmarked || (signal >= 72 && duration >= 20 && duration <= 50)) tags.push("replayed_often")
  if ((input.themes?.length ?? 0) >= 2) tags.push("most_agreed")
  if (!tags.length && sentiment >= 0.45) tags.push("rising_take")

  return tags.slice(0, 2)
}

export function getMomentumLabel(tag: ListeningMomentumTag): string {
  switch (tag) {
    case "blowing_up":
      return "Blowing up"
    case "replayed_often":
      return "Replayed often"
    case "most_agreed":
      return "Most agreed"
    case "rising_take":
      return "Rising take"
  }
}
