import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getCorsHeaders, hasAllowedApiOrigin } from "@/lib/server/cors"
import { getRequestId, logServerError } from "@/lib/server/observability"
import { recordDashboardEvent } from "@/lib/server/survey-store"
import { sendOrQueueEmail } from "@/lib/server/queued-email"
import { applyRateLimit, getRequestClientIp } from "@/lib/server/rate-limit"

const emailSchema = z.object({
  to: z.union([
    z.string().min(1),
    z.array(z.string().email()).min(1).max(50),
  ]),
  subject: z.string().trim().min(1).max(200),
  html: z.string().trim().min(1).max(100_000).optional(),
  text: z.string().trim().min(1).max(50_000).optional(),
}).refine((value) => Boolean(value.html || value.text), {
  message: "Email body is required.",
  path: ["html"],
})

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request, { methods: "POST, OPTIONS" })

  try {
    if (!hasAllowedApiOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: corsHeaders })
    }

    const ip = getRequestClientIp(request.headers)
    const rate = await applyRateLimit({
      key: `email:send:${ip}`,
      windowMs: 60_000,
      max: 10,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many email requests. Please retry shortly." },
        { status: 429, headers: { ...corsHeaders, "Retry-After": String(rate.retryAfterSeconds) } },
      )
    }

    const session = await getSessionFromRequest()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
    }

    const json = await request.json().catch(() => null)
    const parsed = emailSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email payload", details: parsed.error.flatten() }, { status: 400, headers: corsHeaders })
    }

    const { to, subject, html, text } = parsed.data
    const toList = Array.isArray(to)
      ? to.map((entry) => entry.trim()).filter(Boolean)
      : to
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
    const result = await sendOrQueueEmail({ to: toList, subject, html, text })

    try {
      await recordDashboardEvent({
        type: result.mode === "queued" ? "notification_sent" : "reminder_sent",
        message:
          result.mode === "queued"
            ? `Reminder queued for ${toList.length} participant${toList.length === 1 ? "" : "s"}`
            : `Reminder sent to ${toList.length} participant${toList.length === 1 ? "" : "s"}`,
        metadata: {
          recipientCount: toList.length,
          subject,
          deliveryMode: result.mode,
        },
      })
    } catch {
      // Non-blocking event write.
    }

    return NextResponse.json({
      success: true,
      deliveryMode: result.mode,
      messageId: result.mode === "inline" ? result.messageId : null,
      previewUrl: result.mode === "inline" ? result.previewUrl : null,
      jobId: result.mode === "queued" ? result.jobId : null,
    }, { headers: corsHeaders })
  } catch (error: any) {
    logServerError("api.email", "send_failed", error, {
      requestId: getRequestId(request.headers),
    })

    return NextResponse.json(
      {
        error: "Failed to send email",
      },
      { status: 500, headers: corsHeaders },
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, { methods: "POST, OPTIONS" }),
  })
}
