import { NextRequest, NextResponse } from "next/server"
import { getLatestPublishedSurveyQuestions, getPublishedSurveyById } from "@/lib/server/survey-store"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const survey = await getPublishedSurveyById(id)
    if (!survey) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404 })
    }
    const questions = await getLatestPublishedSurveyQuestions(survey.id)

    return NextResponse.json({
      survey: {
        id: survey.id,
        title: survey.title,
        decisionFocus: survey.decisionFocus,
        intent: survey.intent,
        templatePack: survey.templatePack,
        questionCount: survey.questionCount,
        questions,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load survey." },
      { status: 500 },
    )
  }
}
