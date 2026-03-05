import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import {
  deleteSurveyById,
  getLatestSurveyQuestions,
  getSurveyById,
  listSurveys,
  recordDashboardEvent,
  upsertSurvey,
} from "@/lib/server/survey-store"

const surveySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  decisionFocus: z.string().optional(),
  intent: z.string().optional(),
  templatePack: z.string().optional(),
  questions: z.array(z.string().min(1)).max(20).optional(),
  questionCount: z.number().int().min(0),
  status: z.enum(["draft", "published"]),
})

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get("id")
  if (id) {
    const survey = await getSurveyById(id)
    if (!survey) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404 })
    }
    if (survey.createdBy !== session.sub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const questions = await getLatestSurveyQuestions(survey.id)
    return NextResponse.json({ survey: { ...survey, questions } })
  }

  const statusParam = request.nextUrl.searchParams.get("status")
  const status = statusParam === "draft" || statusParam === "published" ? statusParam : undefined
  const surveys = await listSurveys({ status, createdBy: session.sub })
  return NextResponse.json({ surveys })
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const json = await request.json()
    const parsed = surveySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid survey payload", details: parsed.error.flatten() }, { status: 400 })
    }

    const survey = await upsertSurvey({
      ...parsed.data,
      createdBy: session.sub,
    })

    try {
      await recordDashboardEvent({
        type: parsed.data.status === "published" ? "survey_published" : "survey_draft_saved",
        surveyId: survey.id,
        message:
          parsed.data.status === "published"
            ? `Survey published: ${survey.title}`
            : `Draft saved: ${survey.title}`,
        metadata: {
          intent: survey.intent,
          questionCount: survey.questionCount,
          questions: parsed.data.questions ?? [],
        },
      })
    } catch {
      // Non-blocking event write.
    }

    return NextResponse.json({ success: true, survey })
  } catch {
    return NextResponse.json({ error: "Failed to save survey." }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Missing survey id." }, { status: 400 })
  }

  const survey = await getSurveyById(id)
  if (!survey) {
    return NextResponse.json({ error: "Survey not found." }, { status: 404 })
  }
  if (survey.createdBy !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await deleteSurveyById(id)
  return NextResponse.json({ success: true })
}
