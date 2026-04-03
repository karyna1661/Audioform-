import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getCorsHeaders, hasAllowedApiOrigin } from "@/lib/server/cors"
import { getRequestId, logServerEvent, logServerError } from "@/lib/server/observability"
import { applyRateLimit, getRequestClientIp } from "@/lib/server/rate-limit"
import {
  deleteSurveyByIdForCreator,
  getSurveyByIdForCreator,
  getLatestSurveyQuestions,
  listSurveys,
  recordDashboardEvent,
  saveSurveyForCreator,
} from "@/lib/server/survey-store"

const surveySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  decisionFocus: z.string().optional(),
  intent: z.string().optional(),
  templatePack: z.string().optional(),
  questions: z.array(z.string().min(1)).max(20).optional(),
  questionCount: z.number().int().min(0),
  status: z.enum(["draft", "published", "live", "closed"]),
  publicListeningEnabled: z.boolean().optional(),
})

function logSurvey(event: string, payload: Record<string, unknown>) {
  logServerEvent("api.surveys", event, payload)
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const id = request.nextUrl.searchParams.get("id")
  if (id) {
    const survey = await getSurveyByIdForCreator(id, session.sub)
    if (!survey) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404 })
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
  const corsHeaders = getCorsHeaders(request, { methods: "POST, OPTIONS" })
  const session = await getSessionFromRequest()
  if (!session) {
    logSurvey("unauthorized", { method: "POST" })
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
  }
  if (session.role !== "admin") {
    logSurvey("forbidden", { method: "POST", userId: session.sub })
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders })
  }

  try {
    const requestId = getRequestId(request.headers)
    const ip = getRequestClientIp(request.headers)
    const rate = await applyRateLimit({
      key: `surveys:save:${session.sub}:${ip}`,
      windowMs: 60_000,
      max: 30,
    })
    if (!rate.allowed) {
      logSurvey("rate_limited", { userId: session.sub, method: "POST", ip, retryAfterSeconds: rate.retryAfterSeconds })
      return NextResponse.json(
        { error: "Too many survey save requests. Please retry shortly." },
        { status: 429, headers: { ...corsHeaders, "Retry-After": String(rate.retryAfterSeconds) } },
      )
    }

    if (!hasAllowedApiOrigin(request)) {
      logSurvey("invalid_origin", {
        userId: session.sub,
        origin: request.headers.get("origin"),
        referer: request.headers.get("referer"),
        requestUrl: request.url,
      })
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: corsHeaders })
    }

    const json = await request.json()
    const parsed = surveySchema.safeParse(json)
    if (!parsed.success) {
      logSurvey("invalid_payload", {
        userId: session.sub,
        title: typeof json?.title === "string" ? json.title : null,
        status: typeof json?.status === "string" ? json.status : null,
      })
      return NextResponse.json({ error: "Invalid survey payload", details: parsed.error.flatten() }, { status: 400, headers: corsHeaders })
    }

      logSurvey("save_requested", {
      requestId,
      userId: session.sub,
      surveyId: parsed.data.id,
      status: parsed.data.status,
      questionCount: parsed.data.questionCount,
      title: parsed.data.title,
    })

    const survey = await saveSurveyForCreator({
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

      logSurvey("saved", {
      requestId,
      userId: session.sub,
      surveyId: survey.id,
      status: survey.status,
      questionCount: survey.questionCount,
    })

    return NextResponse.json({ success: true, survey }, { headers: corsHeaders })
  } catch (error) {
    logServerError("api.surveys", "save_failed", error, { userId: session.sub })
    if (error instanceof Error && error.message === "Forbidden survey access.") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders })
    }
    const details = error instanceof Error ? error.message : "Unknown survey save error."
    return NextResponse.json({ error: "Failed to save survey.", details }, { status: 500, headers: corsHeaders })
  }
}

export async function DELETE(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request, { methods: "DELETE, OPTIONS" })
  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders })
  }

  const ip = getRequestClientIp(request.headers)
  const rate = await applyRateLimit({
    key: `surveys:delete:${session.sub}:${ip}`,
    windowMs: 60_000,
    max: 20,
  })
  if (!rate.allowed) {
    logSurvey("rate_limited", { userId: session.sub, method: "DELETE", ip, retryAfterSeconds: rate.retryAfterSeconds })
    return NextResponse.json(
      { error: "Too many survey delete requests. Please retry shortly." },
      { status: 429, headers: { ...corsHeaders, "Retry-After": String(rate.retryAfterSeconds) } },
    )
  }

  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Missing survey id." }, { status: 400, headers: corsHeaders })
  }

  if (!hasAllowedApiOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: corsHeaders })
  }

  const deleted = await deleteSurveyByIdForCreator(id, session.sub)
  if (!deleted) {
    return NextResponse.json({ error: "Survey not found." }, { status: 404, headers: corsHeaders })
  }
  return NextResponse.json({ success: true }, { headers: corsHeaders })
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, { methods: "POST, DELETE, OPTIONS" }),
  })
}
