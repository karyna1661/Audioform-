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
