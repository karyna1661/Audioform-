import { NextResponse } from "next/server"
import { checkSupabase, getMissingRequiredEnv } from "@/lib/server/health-checks"
import { getQueueObservability, isBackgroundJobsEnabled } from "@/lib/server/job-queue"
import { isRedisConfigured } from "@/lib/server/redis-client"

export async function GET() {
  const missingEnv = getMissingRequiredEnv()
  const supabase = await checkSupabase()
  const redisConfigured = isRedisConfigured()
  const queue = isBackgroundJobsEnabled() ? await getQueueObservability() : null
  const ok = missingEnv.length === 0 && supabase.ok

  return NextResponse.json(
    {
      ok,
      ready: ok,
      timestamp: new Date().toISOString(),
      checks: {
        env: missingEnv.length === 0,
        supabase: supabase.ok,
        redisConfigured,
        queueEnabled: queue?.enabled ?? false,
      },
      queue,
    },
    { status: ok ? 200 : 503 },
  )
}
