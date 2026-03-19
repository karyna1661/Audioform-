import { NextResponse } from "next/server"
import { z } from "zod"
import { recordAnalyticsEvent } from "@/lib/server/analytics-store"
import { getSessionFromRequest } from "@/lib/server/auth-session"

const eventSchema = z.object({
  eventName: z.string(),
  surveyId: z.string().optional(),
  responseId: z.string().optional(),
  eventData: z.record(z.unknown()).optional(),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const parsed = eventSchema.safeParse(json)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid event payload", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const session = await getSessionFromRequest()
    
    // Record event to database
    await recordAnalyticsEvent({
      eventName: parsed.data.eventName,
      userId: session?.sub ?? null,
      surveyId: parsed.data.surveyId ?? null,
      responseId: parsed.data.responseId ?? null,
      eventData: parsed.data.eventData ?? {},
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to record analytics event:", error)
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 })
  }
}
