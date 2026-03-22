export type ResponseDurationBucket = "short" | "medium" | "deep"

export const SHORT_RESPONSE_MAX_SECONDS = 15
export const MEDIUM_RESPONSE_MAX_SECONDS = 40

export function classifyResponseDuration(seconds: number): ResponseDurationBucket {
  if (seconds < SHORT_RESPONSE_MAX_SECONDS) return "short"
  if (seconds < MEDIUM_RESPONSE_MAX_SECONDS) return "medium"
  return "deep"
}

export function getDurationBucketLabel(bucket: ResponseDurationBucket): string {
  switch (bucket) {
    case "short":
      return `Short (<${SHORT_RESPONSE_MAX_SECONDS}s)`
    case "medium":
      return `Medium (${SHORT_RESPONSE_MAX_SECONDS}-${MEDIUM_RESPONSE_MAX_SECONDS - 1}s)`
    case "deep":
      return `Deep (${MEDIUM_RESPONSE_MAX_SECONDS}s+)`
  }
}
