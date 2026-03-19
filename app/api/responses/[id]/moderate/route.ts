import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { 
  getStoredResponseById,
  updateStoredResponseForSurveyIds,
  listSurveys,
} from "@/lib/server"

const moderateSchema = z.object({
  flagged: z.boolean().optional(),
  highSignal: z.boolean().optional(),
  bookmarked: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const json = await request.json()
    const parsed = moderateSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid moderation payload", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Get owned surveys to verify access
    const ownedSurveys = await listSurveys({ createdBy: session.sub })
    const ownedSurveyIds = ownedSurveys.map((s) => s.id)

    // Verify response belongs to user's survey
    const response = await getStoredResponseById(id)
    if (!response || !ownedSurveyIds.includes(response.surveyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update moderation flags
    const updates: Record<string, boolean> = {}
    if (parsed.data.flagged !== undefined) updates.flagged = parsed.data.flagged
    if (parsed.data.highSignal !== undefined) updates.highSignal = parsed.data.highSignal
    if (parsed.data.bookmarked !== undefined) updates.bookmarked = parsed.data.bookmarked

    const updated = await updateStoredResponseForSurveyIds(id, ownedSurveyIds, {
      ...updates,
      moderationUpdatedAt: new Date().toISOString(),
    })

    if (!updated) {
      return NextResponse.json({ error: "Failed to update response" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      response: {
        id: updated.id,
        flagged: updated.flagged,
        highSignal: updated.highSignal,
        bookmarked: updated.bookmarked,
        moderationUpdatedAt: updated.moderationUpdatedAt,
      },
    })
  } catch (error) {
    console.error("Moderation failed:", error)
    return NextResponse.json({ error: "Failed to moderate response" }, { status: 500 })
  }
}
