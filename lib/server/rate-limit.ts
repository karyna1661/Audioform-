import { evalRedis, isRedisConfigured } from "@/lib/server/redis-client"

const windows = new Map<string, { count: number; resetAt: number }>()
const REDIS_RETRY_COOLDOWN_MS = 30_000
let redisRetryAllowedAt = 0
let lastRedisFailureMessage: string | null = null

const RATE_LIMIT_LUA = [
  'local current = redis.call("INCR", KEYS[1])',
  'if current == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end',
  'local ttl = redis.call("PTTL", KEYS[1])',
  'if ttl < 0 then ttl = tonumber(ARGV[1]) redis.call("PEXPIRE", KEYS[1], ARGV[1]) end',
  'return {current, ttl}',
].join("\n")

export type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
  remaining: number
  backend: "memory" | "redis"
}

function applyMemoryRateLimit(input: { key: string; windowMs: number; max: number }): RateLimitResult {
  const now = Date.now()
  const existing = windows.get(input.key)
  if (!existing || now >= existing.resetAt) {
    windows.set(input.key, { count: 1, resetAt: now + input.windowMs })
    return {
      allowed: true,
      retryAfterSeconds: Math.ceil(input.windowMs / 1000),
      remaining: Math.max(0, input.max - 1),
      backend: "memory",
    }
  }

  if (existing.count >= input.max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
      backend: "memory",
    }
  }

  existing.count += 1
  windows.set(input.key, existing)
  return {
    allowed: true,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    remaining: Math.max(0, input.max - existing.count),
    backend: "memory",
  }
}

async function applyRedisRateLimit(input: { key: string; windowMs: number; max: number }): Promise<RateLimitResult> {
  const namespacedKey = `rate-limit:${input.key}`
  const result = await evalRedis(RATE_LIMIT_LUA, [namespacedKey], [String(input.windowMs)])
  if (!Array.isArray(result) || result.length < 2) {
    throw new Error("Unexpected Redis rate limit response.")
  }

  const count = Number(result[0])
  const ttlMs = Number(result[1])
  if (!Number.isFinite(count) || !Number.isFinite(ttlMs)) {
    throw new Error("Redis rate limit values were not numeric.")
  }

  return {
    allowed: count <= input.max,
    retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
    remaining: Math.max(0, input.max - count),
    backend: "redis",
  }
}

export async function applyRateLimit(input: {
  key: string
  windowMs: number
  max: number
}): Promise<RateLimitResult> {
  const now = Date.now()
  if (isRedisConfigured() && now >= redisRetryAllowedAt) {
    try {
      const result = await applyRedisRateLimit(input)
      redisRetryAllowedAt = 0
      lastRedisFailureMessage = null
      return result
    } catch (error) {
      redisRetryAllowedAt = now + REDIS_RETRY_COOLDOWN_MS
      const message = error instanceof Error ? error.message : String(error)
      if (message !== lastRedisFailureMessage) {
        console.error("Redis rate limit failed, falling back to memory:", error)
        lastRedisFailureMessage = message
      }
    }
  }

  return applyMemoryRateLimit(input)
}

export function getRequestClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  const realIp = headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  return "unknown"
}
