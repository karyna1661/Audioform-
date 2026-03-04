import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import {
  getNotificationConfigByUserId,
  upsertNotificationConfig,
} from "@/lib/server/notification-store"

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
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load notification settings." },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const json = await request.json()
    const parsed = configSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid notification config payload", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const config = await upsertNotificationConfig({
      userId: session.sub,
      ...parsed.data,
    })

    return NextResponse.json({ success: true, config })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to save notification settings." },
      { status: 500 },
    )
  }
}
