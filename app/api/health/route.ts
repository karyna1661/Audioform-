import { NextResponse } from "next/server"
import { checkSupabase, getMissingRequiredEnv, getStorageStatus } from "@/lib/server/health-checks"
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
      service: "audioform",
      timestamp: new Date().toISOString(),
      checks: {
        env: {
          ok: missingEnv.length === 0,
          missing: missingEnv,
        },
        supabase,
        storage: getStorageStatus(),
        redis: {
          configured: redisConfigured,
        },
        queue: queue ?? {
          enabled: false,
          features: {
            email: false,
            transcription: false,
            analytics: false,
            notificationDigests: false,
          },
          queueLength: 0,
          metrics: {
            processed: 0,
            failed: 0,
            analytics: 0,
            emails: 0,
            digests: 0,
            transcriptions: 0,
          },
        },
      },
    },
    { status: ok ? 200 : 503 },
  )
}
