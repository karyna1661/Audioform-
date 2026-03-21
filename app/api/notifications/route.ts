import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getCorsHeaders, hasAllowedApiOrigin } from "@/lib/server/cors"
import {
  getNotificationConfigByUserId,
  upsertNotificationConfig,
} from "@/lib/server/notification-store"
import { applyRateLimit, getRequestClientIp } from "@/lib/server/rate-limit"

const configSchema = z.object({
  newResponse: z.boolean(),
  completedQuestionnaire: z.boolean(),
  dailySummary: z.boolean(),
  weeklySummary: z.boolean(),
  templateSubject: z.string().min(1),
  templateBody: z.string().min(1),
  recipients: z.array(z.string().email()).max(20),
})

export async function GET() {
  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const config = await getNotificationConfigByUserId(session.sub)
    return NextResponse.json({ config })
  } catch {
    return NextResponse.json({ error: "Failed to load notification settings." }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request, { methods: "PUT, OPTIONS" })
  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
  }

  try {
    if (!hasAllowedApiOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: corsHeaders })
    }

    const ip = getRequestClientIp(request.headers)
    const rate = await applyRateLimit({
      key: `notifications:update:${session.sub}:${ip}`,
      windowMs: 60_000,
      max: 20,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many notification updates. Please retry shortly." },
        { status: 429, headers: { ...corsHeaders, "Retry-After": String(rate.retryAfterSeconds) } },
      )
    }

    const json = await request.json()
    const parsed = configSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid notification config payload", details: parsed.error.flatten() },
        { status: 400, headers: corsHeaders },
      )
    }

    const config = await upsertNotificationConfig({
      userId: session.sub,
      ...parsed.data,
    })

    return NextResponse.json({ success: true, config }, { headers: corsHeaders })
  } catch {
    return NextResponse.json({ error: "Failed to save notification settings." }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, { methods: "PUT, OPTIONS" }),
  })
}
