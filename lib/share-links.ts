const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type ArrivalSource = "qr" | "social" | "direct"

function normalizeVersion(value?: string | number | Date | null): string | null {
  if (value == null) return null
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isFinite(time) ? String(time) : null
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(Math.trunc(value)) : null
  }
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Date.parse(trimmed)
  if (Number.isFinite(parsed)) return String(parsed)
  return trimmed
}

export function isUuidLike(value?: string | null): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim())
}

export function normalizeArrivalSource(value?: string | null): ArrivalSource {
  if (value === "qr" || value === "social") return value
  return "direct"
}

function buildQueryString(entries: Array<[string, string | null]>) {
  const params = new URLSearchParams()
  for (const [key, value] of entries) {
    if (value) params.set(key, value)
  }
  const query = params.toString()
  return query ? `?${query}` : ""
}

export function buildSurveySharePath(
  surveyId: string,
  options?: { version?: string | number | Date | null; source?: ArrivalSource | null },
): string {
  const path = `/share/survey/${encodeURIComponent(surveyId)}`
  const version = normalizeVersion(options?.version)
  const source = normalizeArrivalSource(options?.source)
  return `${path}${buildQueryString([
    ["v", version],
    ["src", source === "direct" ? null : source],
  ])}`
}

export function buildSurveyShareUrl(
  origin: string,
  surveyId: string,
  options?: { version?: string | number | Date | null; source?: ArrivalSource | null },
): string {
  const normalizedOrigin = origin.replace(/\/+$/, "")
  return `${normalizedOrigin}${buildSurveySharePath(surveyId, options)}`
}

export function buildSurveyRespondPath(
  surveyId: string,
  options?: { version?: string | number | Date | null; source?: ArrivalSource | null },
): string {
  const path = `/questionnaire/v1?surveyId=${encodeURIComponent(surveyId)}`
  const version = normalizeVersion(options?.version)
  const source = normalizeArrivalSource(options?.source)
  const suffix = buildQueryString([
    ["surveyId", surveyId],
    ["v", version],
    ["src", source === "direct" ? null : source],
  ])
  return `/questionnaire/v1${suffix}`
}

export function buildSurveyRespondUrl(
  origin: string,
  surveyId: string,
  options?: { version?: string | number | Date | null; source?: ArrivalSource | null },
): string {
  const normalizedOrigin = origin.replace(/\/+$/, "")
  return `${normalizedOrigin}${buildSurveyRespondPath(surveyId, options)}`
}

export function buildXShareUrl(shareUrl: string, text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`
}

export function buildTelegramShareUrl(shareUrl: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
