import { NextResponse, type NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getCorsHeaders, hasAllowedApiOrigin } from "@/lib/server/cors"
import { getQueueObservability, isBackgroundJobsEnabled } from "@/lib/server/job-queue"

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request, { methods: "GET, OPTIONS" })

  if (!hasAllowedApiOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: corsHeaders })
  }

  const session = await getSessionFromRequest()
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
  }

  if (!isBackgroundJobsEnabled()) {
    return NextResponse.json(
      { ok: false, enabled: false, queueLength: 0, metrics: {} },
      { headers: corsHeaders },
    )
  }

  const queue = await getQueueObservability()
  return NextResponse.json({ ok: true, ...queue }, { headers: corsHeaders })
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, { methods: "GET, OPTIONS" }),
  })
}
