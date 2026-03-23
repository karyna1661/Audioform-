import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { recordOrQueueAnalyticsEvent } from "@/lib/server/analytics-store"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getCorsHeaders, hasAllowedApiOrigin } from "@/lib/server/cors"
import { getRequestId, logServerError } from "@/lib/server/observability"
import { applyRateLimit, getRequestClientIp } from "@/lib/server/rate-limit"

const eventSchema = z.object({
  eventName: z.string(),
  surveyId: z.string().optional(),
  responseId: z.string().optional(),
  eventData: z.record(z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request, { methods: "POST, OPTIONS" })

  try {
    if (!hasAllowedApiOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: corsHeaders })
    }

    const ip = getRequestClientIp(request.headers)
    const rate = await applyRateLimit({
      key: `analytics:ingest:${ip}`,
      windowMs: 60_000,
      max: 120,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many analytics events. Please retry shortly." },
        { status: 429, headers: { ...corsHeaders, "Retry-After": String(rate.retryAfterSeconds) } },
      )
    }

    const json = await request.json()
    const parsed = eventSchema.safeParse(json)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid event payload", details: parsed.error.flatten() },
        { status: 400, headers: corsHeaders }
      )
    }

    const session = await getSessionFromRequest()
    
    const result = await recordOrQueueAnalyticsEvent({
      eventName: parsed.data.eventName,
      userId: session?.sub ?? null,
      surveyId: parsed.data.surveyId ?? null,
      responseId: parsed.data.responseId ?? null,
      eventData: parsed.data.eventData ?? {},
    })

    return NextResponse.json(
      {
        success: true,
        deliveryMode: result.mode,
        jobId: result.mode === "queued" ? result.jobId : null,
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    logServerError("api.analytics", "record_failed", error, {
      requestId: getRequestId(request.headers),
    })
    return NextResponse.json({ error: "Failed to record event" }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, { methods: "POST, OPTIONS" }),
  })
}
