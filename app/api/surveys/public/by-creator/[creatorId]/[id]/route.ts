import { NextRequest, NextResponse } from "next/server"
import {
  getLatestPublishedSurveyQuestions,
  getPublishedSurveyByCreatorAndId,
} from "@/lib/server/survey-store"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ creatorId: string; id: string }> },
) {
  try {
    const { creatorId, id } = await context.params
    const survey = await getPublishedSurveyByCreatorAndId(creatorId, id)
    if (!survey) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404 })
    }
    const questions = await getLatestPublishedSurveyQuestions(survey.id)

    return NextResponse.json({
      survey: {
        id: survey.id,
        creatorId: survey.createdBy,
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
