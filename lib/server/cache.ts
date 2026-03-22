import { isRedisConfigured, runRedisCommand } from "@/lib/server/redis-client"

export async function getCachedJson<T>(key: string): Promise<T | null> {
  if (!isRedisConfigured()) return null
  const value = await runRedisCommand(["GET", key])
  if (typeof value !== "string") return null

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export async function setCachedJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!isRedisConfigured()) return
  await runRedisCommand(["SETEX", key, String(ttlSeconds), JSON.stringify(value)])
}

export function buildCacheHeaders(ttlSeconds: number) {
  return {
    "Cache-Control": `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${Math.max(ttlSeconds * 5, ttlSeconds)}`,
  }
}
