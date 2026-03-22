import { NextResponse } from "next/server"
import { checkSupabase, getMissingRequiredEnv } from "@/lib/server/health-checks"
import { getQueueObservability, isBackgroundJobsEnabled } from "@/lib/server/job-queue"

export async function GET() {
  const missingEnv = getMissingRequiredEnv()
  const supabase = await checkSupabase()
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
        queueEnabled: queue?.enabled ?? false,
      },
      queue,
    },
    { status: ok ? 200 : 503 },
  )
}
