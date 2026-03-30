const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

export function buildSurveySharePath(
  surveyId: string,
  options?: { version?: string | number | Date | null },
): string {
  const path = `/share/survey/${encodeURIComponent(surveyId)}`
  const version = normalizeVersion(options?.version)
  return version ? `${path}?v=${encodeURIComponent(version)}` : path
}

export function buildSurveyShareUrl(
  origin: string,
  surveyId: string,
  options?: { version?: string | number | Date | null },
): string {
  const normalizedOrigin = origin.replace(/\/+$/, "")
  return `${normalizedOrigin}${buildSurveySharePath(surveyId, options)}`
}
