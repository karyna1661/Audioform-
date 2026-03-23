import { NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { listDashboardEventsForSurveyIds, listSurveys } from "@/lib/server/survey-store"

export async function GET() {
  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const surveys = await listSurveys({ createdBy: session.sub })
    const events = await listDashboardEventsForSurveyIds(
      surveys.map((survey) => survey.id),
      20,
    )
    return NextResponse.json({ events })
  } catch {
    return NextResponse.json({ error: "Failed to load dashboard activity." }, { status: 500 })
  }
}
