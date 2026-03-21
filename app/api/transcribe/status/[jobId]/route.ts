import { NextResponse, type NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getCorsHeaders, hasAllowedApiOrigin } from "@/lib/server/cors"
import { getJobResult, isTranscriptionJobsEnabled } from "@/lib/server/job-queue"

export async function GET(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  const corsHeaders = getCorsHeaders(request, { methods: "GET, OPTIONS" })

  if (!hasAllowedApiOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: corsHeaders })
  }

  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
  }

  if (!isTranscriptionJobsEnabled()) {
    return NextResponse.json({ error: "Transcription jobs are not enabled." }, { status: 503, headers: corsHeaders })
  }

  const { jobId } = await context.params
  const result = await getJobResult(jobId)
  if (!result) {
    return NextResponse.json({ success: false, status: "pending" }, { headers: corsHeaders })
  }

  return NextResponse.json({ success: true, status: "completed", result }, { headers: corsHeaders })
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, { methods: "GET, OPTIONS" }),
  })
}
