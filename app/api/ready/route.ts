import { NextResponse } from "next/server"
import { checkSupabase, getMissingRequiredEnv } from "@/lib/server/health-checks"

export async function GET() {
  const missingEnv = getMissingRequiredEnv()
  const supabase = await checkSupabase()
  const ok = missingEnv.length === 0 && supabase.ok

  return NextResponse.json(
    {
      ok,
      ready: ok,
      timestamp: new Date().toISOString(),
      checks: {
        env: missingEnv.length === 0,
        supabase: supabase.ok,
      },
    },
    { status: ok ? 200 : 503 },
  )
}
