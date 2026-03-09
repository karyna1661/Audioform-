import { type NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { recordDashboardEvent } from "@/lib/server/survey-store"
import { sendEmail } from "@/lib/server/email-sender"
import { hasTrustedOrigin } from "@/lib/server/request-guards"

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (
      !hasTrustedOrigin({
        requestOrigin: request.headers.get("origin"),
        requestReferer: request.headers.get("referer"),
        requestUrl: request.url,
        configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      })
    ) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
    }

    const { to, subject, html, text } = await request.json()

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const toList = Array.isArray(to)
      ? to.map((entry) => String(entry).trim()).filter(Boolean)
      : String(to)
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
    const sent = await sendEmail({ to: toList, subject, html, text })

    try {
      await recordDashboardEvent({
        type: "reminder_sent",
        message: `Reminder sent to ${toList.length} participant${toList.length === 1 ? "" : "s"}`,
        metadata: {
          recipientCount: toList.length,
          subject,
        },
      })
    } catch {
      // Non-blocking event write.
    }

    return NextResponse.json({
      success: true,
      messageId: sent.messageId,
      previewUrl: sent.previewUrl,
    })
  } catch (error: any) {
    console.error("Error sending email:", error)

    return NextResponse.json(
      {
        error: "Failed to send email",
      },
      { status: 500 },
    )
  }
}
