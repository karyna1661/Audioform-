import { NextRequest, NextResponse } from "next/server"
import { getLatestPublishedSurveyQuestions, getPublishedSurveyById } from "@/lib/server/survey-store"
import { buildCacheHeaders, getCachedJson, setCachedJson } from "@/lib/server/cache"

const PUBLIC_SURVEY_TTL_SECONDS = 120

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const cacheKey = `public-survey:${id}`
    const cached = await getCachedJson<{ survey: {
      id: string
      title: string
      decisionFocus: string | null
      intent: string | null
      templatePack: string | null
      questionCount: number
      publicListeningEnabled: boolean
      status: string
      questions: string[]
    } }>(cacheKey)

    if (cached) {
      return NextResponse.json(cached, { headers: buildCacheHeaders(PUBLIC_SURVEY_TTL_SECONDS) })
    }

    const survey = await getPublishedSurveyById(id)
    if (!survey) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404 })
    }
    const questions = await getLatestPublishedSurveyQuestions(survey.id)

    const payload = {
      survey: {
        id: survey.id,
        title: survey.title,
        decisionFocus: survey.decisionFocus,
        intent: survey.intent,
        templatePack: survey.templatePack,
        questionCount: survey.questionCount,
        publicListeningEnabled: survey.publicListeningEnabled,
        status: survey.status,
        questions,
      },
    }

    await setCachedJson(cacheKey, payload, PUBLIC_SURVEY_TTL_SECONDS)

    return NextResponse.json(payload, { headers: buildCacheHeaders(PUBLIC_SURVEY_TTL_SECONDS) })
  } catch {
    return NextResponse.json({ error: "Failed to load survey." }, { status: 500 })
  }
}
