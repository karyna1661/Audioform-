"use client"

type SurveyMetric = {
  surveyId: string
  title: string
  publishedAt: string
  firstResponseAt?: string
  ttfrSeconds?: number
}

type TtfrSnapshot = {
  surveyId: string
  title: string
  ttfrSeconds: number | null
  publishedAt: string
  firstResponseAt?: string
}

const METRICS_KEY = "audioform_v1_survey_metrics"
const ACTIVE_SURVEY_KEY = "audioform_v1_active_survey_id"
const TTFR_HISTORY_KEY = "audioform_v1_ttfr_history_seconds"
const CREATOR_VISIT_KEY = "audioform_v1_creator_visit_registry"

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function readMetrics(): SurveyMetric[] {
  return readJson<SurveyMetric[]>(METRICS_KEY, [])
}

function writeMetrics(metrics: SurveyMetric[]): void {
  writeJson(METRICS_KEY, metrics)
}

export function setActiveSurveyId(surveyId: string): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ACTIVE_SURVEY_KEY, surveyId)
}

export function getActiveSurveyId(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(ACTIVE_SURVEY_KEY)
}

export function recordSurveyPublished(input: { surveyId: string; title: string }): void {
  const metrics = readMetrics()
  const now = new Date().toISOString()
  const existing = metrics.find((m) => m.surveyId === input.surveyId)

  if (existing) {
    existing.title = input.title
    existing.publishedAt = now
    existing.firstResponseAt = undefined
    existing.ttfrSeconds = undefined
  } else {
    metrics.push({
      surveyId: input.surveyId,
      title: input.title,
      publishedAt: now,
    })
  }

  writeMetrics(metrics)
  setActiveSurveyId(input.surveyId)
}

export function recordFirstResponseForActiveSurvey(): void {
  const surveyId = getActiveSurveyId()
  if (!surveyId) return

  const metrics = readMetrics()
  const metric = metrics.find((m) => m.surveyId === surveyId)
  if (!metric || metric.firstResponseAt) return

  const now = new Date().toISOString()
  const publishedAtMs = new Date(metric.publishedAt).getTime()
  const firstResponseAtMs = new Date(now).getTime()
  const ttfrSeconds = Math.max(0, Math.round((firstResponseAtMs - publishedAtMs) / 1000))

  metric.firstResponseAt = now
  metric.ttfrSeconds = ttfrSeconds
  writeMetrics(metrics)

  const history = readJson<number[]>(TTFR_HISTORY_KEY, [])
  history.push(ttfrSeconds)
  writeJson(TTFR_HISTORY_KEY, history.slice(-20))
}

export function getActiveTtfrSnapshot(): TtfrSnapshot | null {
  const surveyId = getActiveSurveyId()
  if (!surveyId) return null
  const metrics = readMetrics()
  const metric = metrics.find((m) => m.surveyId === surveyId)
  if (!metric) return null

  return {
    surveyId: metric.surveyId,
    title: metric.title,
    ttfrSeconds: metric.ttfrSeconds ?? null,
    publishedAt: metric.publishedAt,
    firstResponseAt: metric.firstResponseAt,
  }
}

export function getTtfrTrend(): "improving" | "stable" | "slipping" {
  const history = readJson<number[]>(TTFR_HISTORY_KEY, [])
  if (history.length < 2) return "stable"
  const latest = history[history.length - 1]
  const previous = history[history.length - 2]
  if (latest < previous) return "improving"
  if (latest > previous) return "slipping"
  return "stable"
}

export function shouldTrackCreatorRevisitWithin7d(userId: string, surface: string): boolean {
  if (typeof window === "undefined") return false

  const registry = readJson<Record<string, { lastVisitAt?: string; lastTrackedAt?: string }>>(CREATOR_VISIT_KEY, {})
  const key = `${userId}:${surface}`
  const current = registry[key] ?? {}
  const now = Date.now()
  const lastVisitAt = current.lastVisitAt ? new Date(current.lastVisitAt).getTime() : null
  const lastTrackedAt = current.lastTrackedAt ? new Date(current.lastTrackedAt).getTime() : null

  const withinSevenDays = lastVisitAt !== null && now - lastVisitAt <= 7 * 24 * 60 * 60 * 1000
  const notRecentlyTracked = lastTrackedAt === null || now - lastTrackedAt >= 60 * 60 * 1000

  registry[key] = {
    lastVisitAt: new Date(now).toISOString(),
    lastTrackedAt: withinSevenDays && notRecentlyTracked ? new Date(now).toISOString() : current.lastTrackedAt,
  }
  writeJson(CREATOR_VISIT_KEY, registry)

  return withinSevenDays && notRecentlyTracked
}
