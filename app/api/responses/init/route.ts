import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { z } from "zod"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getOrCreateAnonSessionId, setAnonSessionCookie } from "@/lib/server/anon-session"
import { initPendingResponse } from "@/lib/server/response-store"
import { getPublishedSurveyById, getLatestPublishedSurveyQuestions } from "@/lib/server/survey-store"
import { applyRateLimit, getRequestClientIp } from "@/lib/server/rate-limit"

const initSchema = z.object({
  surveyId: z.string().min(1),
  questionId: z.string().min(1),
  idempotencyKey: z.string().min(10).optional(),
})

function newIdempotencyKey(): string {
  // URL-safe, deterministic length, easy to log.
  return `resp_${randomUUID().replaceAll("-", "")}`
}

export async function POST(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  }

  try {
    const ip = getRequestClientIp(request.headers)
    const rate = applyRateLimit({
      key: `responses:init:${ip}`,
      windowMs: 60_000,
      max: 60,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please retry shortly." },
        { status: 429, headers: { ...corsHeaders, "Retry-After": String(rate.retryAfterSeconds) } },
      )
    }

    const json = await request.json().catch(() => null)
    const parsed = initSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400, headers: corsHeaders })
    }

    const publishedSurvey = await getPublishedSurveyById(parsed.data.surveyId)
    if (!publishedSurvey) {
      return NextResponse.json({ error: "Survey is unavailable or unpublished." }, { status: 404, headers: corsHeaders })
    }

    const publishedQuestions = await getLatestPublishedSurveyQuestions(parsed.data.surveyId)
    const allowedQuestionIds = new Set(publishedQuestions.map((_, index) => `q${index + 1}`))
    if (!allowedQuestionIds.has(parsed.data.questionId)) {
      return NextResponse.json({ error: "Question does not belong to this published survey." }, { status: 400, headers: corsHeaders })
    }

    const authSession = await getSessionFromRequest()
    const anonSessionId = await getOrCreateAnonSessionId()
    const idempotencyKey = parsed.data.idempotencyKey || newIdempotencyKey()

    const pending = await initPendingResponse({
      surveyId: parsed.data.surveyId,
      questionId: parsed.data.questionId,
      userId: authSession?.sub ?? null,
      sessionId: anonSessionId,
      idempotencyKey,
    })

    const response = NextResponse.json(
      {
        responseId: pending.id,
        idempotencyKey: pending.idempotencyKey,
        sessionId: pending.sessionId,
        uploadUrl: "/api/responses/upload",
      },
      { status: 201, headers: corsHeaders },
    )
    setAnonSessionCookie(response, anonSessionId)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to init response."
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    },
  })
}

