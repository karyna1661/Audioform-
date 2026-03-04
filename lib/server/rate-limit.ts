const windows = new Map<string, { count: number; resetAt: number }>()

export type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
  remaining: number
}

export function applyRateLimit(input: {
  key: string
  windowMs: number
  max: number
}): RateLimitResult {
  const now = Date.now()
  const existing = windows.get(input.key)
  if (!existing || now >= existing.resetAt) {
    windows.set(input.key, { count: 1, resetAt: now + input.windowMs })
    return {
      allowed: true,
      retryAfterSeconds: Math.ceil(input.windowMs / 1000),
      remaining: Math.max(0, input.max - 1),
    }
  }

  if (existing.count >= input.max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    }
  }

  existing.count += 1
  windows.set(input.key, existing)
  return {
    allowed: true,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    remaining: Math.max(0, input.max - existing.count),
  }
}

export function getRequestClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  const realIp = headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  return "unknown"
}

