import { NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { listDashboardEvents, listSurveys } from "@/lib/server/survey-store"

export async function GET() {
  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [events, surveys] = await Promise.all([
      listDashboardEvents(200),
      listSurveys({ createdBy: session.sub }),
    ])
    const ownedSurveyIds = new Set(surveys.map((survey) => survey.id))
    const scopedEvents = events
      .filter((event) => event.surveyId && ownedSurveyIds.has(event.surveyId))
      .slice(0, 20)
    return NextResponse.json({ events: scopedEvents })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to load dashboard activity." }, { status: 500 })
  }
}
