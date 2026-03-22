import { NextResponse } from "next/server"
import { checkSupabase, getMissingRequiredEnv, getStorageStatus } from "@/lib/server/health-checks"

export async function GET() {
  const missingEnv = getMissingRequiredEnv()
  const supabase = await checkSupabase()
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
      },
    },
    { status: ok ? 200 : 503 },
  )
}
