import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { z } from "zod"
import {
  cleanupStoredFile,
  finalizeUploadedResponse,
  initPendingResponse,
  markResponseFailed,
  uploadAudioToStorage,
  deleteStoredResponseForSurveyIds,
  getStoredResponseByIdForSurveyIds,
  listStoredResponses,
  updateStoredResponseForSurveyIds,
} from "@/lib/server/response-store"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getOrCreateAnonSessionId, setAnonSessionCookie } from "@/lib/server/anon-session"
import {
  getLatestPublishedSurveyQuestions,
  getPublishedSurveyById,
  getSurveyById,
  listSurveys,
  recordDashboardEvent,
} from "@/lib/server/survey-store"
import { getNotificationConfigByUserId } from "@/lib/server/notification-store"
import { findUserById } from "@/lib/server/auth-store"
import { sendOrQueueEmail } from "@/lib/server/queued-email"
import { getCorsHeaders, hasAllowedApiOrigin } from "@/lib/server/cors"
import { applyRateLimit, getRequestClientIp } from "@/lib/server/rate-limit"
import { hasTrustedOrigin } from "@/lib/server/request-guards"

const uploadSchema = z.object({
  questionId: z.string().min(1),
  surveyId: z.string().min(1).default("audioform-survey"),
  durationSeconds: z.number().optional(),
})

const ALLOWED_AUDIO_MIME = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
])
const MAX_AUDIO_SIZE_BYTES = 8 * 1024 * 1024

const moderationSchema = z.object({
  id: z.string().min(1),
  flagged: z.boolean().optional(),
  highSignal: z.boolean().optional(),
  bookmarked: z.boolean().optional(),
})

function newIdempotencyKey(): string {
  return `resp_${randomUUID().replaceAll("-", "")}`
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request, { methods: "POST, GET, PATCH, DELETE, OPTIONS" })

  try {
    if (!hasAllowedApiOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: corsHeaders })
    }

    const ip = getRequestClientIp(request.headers)
    const rate = await applyRateLimit({
      key: `responses:post:${ip}`,
      windowMs: 60_000,
      max: 20,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many submissions. Please retry shortly." },
        { status: 429, headers: { ...corsHeaders, "Retry-After": String(rate.retryAfterSeconds) } },
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const parsed = uploadSchema.safeParse({
      questionId: formData.get("questionId"),
      surveyId: formData.get("surveyId"),
      durationSeconds: formData.get("durationSeconds") ? Number(formData.get("durationSeconds")) : undefined,
    })

    if (!audioFile || !parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.success ? undefined : parsed.error.flatten() },
        { status: 400, headers: corsHeaders },
      )
    }

    if (audioFile.size <= 0 || audioFile.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Invalid audio size. Max allowed is ${Math.floor(MAX_AUDIO_SIZE_BYTES / (1024 * 1024))}MB.` },
        { status: 413, headers: corsHeaders },
      )
    }

    const mimeType = (audioFile.type || "").toLowerCase()
    if (!ALLOWED_AUDIO_MIME.has(mimeType)) {
      return NextResponse.json({ error: "Unsupported audio format." }, { status: 415, headers: corsHeaders })
    }

    const publishedSurvey = await getPublishedSurveyById(parsed.data.surveyId)
    if (!publishedSurvey) {
      return NextResponse.json({ error: "Survey is unavailable or unpublished." }, { status: 404, headers: corsHeaders })
    }
    const publishedQuestions = await getLatestPublishedSurveyQuestions(parsed.data.surveyId)
    const allowedQuestionIds = new Set(
      publishedQuestions.map((_, index) => `q${index + 1}`),
    )
    if (!allowedQuestionIds.has(parsed.data.questionId)) {
      return NextResponse.json(
        { error: "Question does not belong to this published survey." },
        { status: 400, headers: corsHeaders },
      )
    }

    const session = await getSessionFromRequest()
    const anonSessionId = await getOrCreateAnonSessionId()
    console.log("Creating response storage:", {
      questionId: parsed.data.questionId,
      surveyId: parsed.data.surveyId,
      userId: session?.sub ?? null,
      sessionId: anonSessionId,
      audioFileSize: audioFile.size,
      audioFileType: audioFile.type,
      durationSeconds: parsed.data.durationSeconds,
      nodeEnv: process.env.NODE_ENV,
      b2Configured: process.env.B2_KEY_ID ? true : false,
    })

    // 2-phase pipeline in a single request (legacy compatibility)
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() || newIdempotencyKey()
    const pending = await initPendingResponse({
      questionId: parsed.data.questionId,
      surveyId: parsed.data.surveyId,
      userId: session?.sub ?? null,
      sessionId: anonSessionId,
      idempotencyKey,
    })

    let storagePath: string | null = null
    let storageFileId: string | null = null
    try {
      const uploaded = await uploadAudioToStorage({
        responseId: pending.id,
        audioFile,
      })
      storagePath = uploaded.storagePath
      storageFileId = uploaded.storageFileId ?? null

      const stored = await finalizeUploadedResponse({
        id: pending.id,
        fileName: audioFile.name || `${pending.id}.audio`,
        mimeType: audioFile.type || "application/octet-stream",
        size: audioFile.size,
        storagePath,
        storageFileId,
        publicUrl: uploaded.publicUrl ?? null,
        durationSeconds: parsed.data.durationSeconds ?? null,
      })

      if (!stored) {
        await cleanupStoredFile({ storagePath, storageFileId })
        await markResponseFailed(pending.id)
        return NextResponse.json({ error: "Failed to finalize response." }, { status: 503, headers: corsHeaders })
      }

      console.log("Response stored successfully:", {
        id: stored.id,
        storagePath: stored.storagePath,
        publicUrl: stored.publicUrl,
      })

      try {
        await recordDashboardEvent({
          type: "response_recorded",
          surveyId: stored.surveyId,
          message: `New response recorded for ${publishedSurvey.title}`,
          metadata: {
            questionId: stored.questionId,
            userId: stored.userId,
            sessionId: stored.sessionId,
            fileSize: stored.size,
            durationSeconds: stored.durationSeconds,
            durationBucket: stored.durationBucket,
          },
        })
      } catch {
        // Non-blocking.
      }

      // Auto-notify survey creator on new responses when their saved rule is enabled.
      try {
        const survey = await getSurveyById(stored.surveyId)
        if (survey) {
          const owner = await findUserById(survey.createdBy)
          const config = await getNotificationConfigByUserId(survey.createdBy)
          if (owner && config.newResponse) {
            const responseCount = (
              await listStoredResponses({
                surveyId: stored.surveyId,
              })
            ).length
            const recipients = config.recipients.length ? config.recipients : [owner.email]
            const submissionDate = new Date(stored.createdAt).toLocaleString()

            const respondentName = stored.userId || "Anonymous responder"
            const subject = config.templateSubject
              .replaceAll("[Questionnaire Name]", survey.title)
              .replaceAll("[Respondent Name]", respondentName)
              .replaceAll("[Submission Date]", submissionDate)
              .replaceAll("[Response Count]", String(responseCount))

            const text = config.templateBody
              .replaceAll("[Questionnaire Name]", survey.title)
              .replaceAll("[Respondent Name]", respondentName)
              .replaceAll("[Submission Date]", submissionDate)
              .replaceAll("[Response Count]", String(responseCount))

            const emailResult = await sendOrQueueEmail({
              to: recipients,
              subject,
              text,
              html: `<div style="font-family:sans-serif;max-width:640px;margin:0 auto;">
                <h1 style="font-size:20px;margin-bottom:12px;">${subject}</h1>
                <p style="line-height:1.5;white-space:pre-line;">${text}</p>
              </div>`,
            })

            await recordDashboardEvent({
              type: "notification_sent",
              surveyId: stored.surveyId,
              message:
                emailResult.mode === "queued"
                  ? `New response notification queued for ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}`
                  : `New response notification sent to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}`,
              metadata: {
                recipientCount: recipients.length,
                notificationType: "new_response",
                deliveryMode: emailResult.mode,
              },
            })
          }
        }
      } catch {
        // Non-blocking notification pipeline.
      }

      const response = NextResponse.json(
        {
          success: true,
          message: "Audio response saved successfully",
          data: {
            id: stored.id,
            questionId: stored.questionId,
            surveyId: stored.surveyId,
            userId: stored.userId,
            sessionId: stored.sessionId,
            fileName: stored.fileName,
            fileSize: stored.size,
            mimeType: stored.mimeType,
            timestamp: stored.createdAt,
          },
        },
        { status: 201, headers: corsHeaders },
      )
      setAnonSessionCookie(response, anonSessionId)
      return response
    } catch (inner) {
      await markResponseFailed(pending.id)
      await cleanupStoredFile({ storagePath, storageFileId })
      throw inner
    }
  } catch (error) {
    console.error("Error handling audio upload:", error)
    const message = error instanceof Error ? error.message : "Failed to process audio upload"
    
    // More specific error messages
    if (message.includes("B2 storage is not configured")) {
      return NextResponse.json(
        { error: "Storage configuration issue. Please try again or contact support." },
        { status: 503, headers: corsHeaders },
      )
    }
    
    if (message.includes("Supabase") || message.includes("database")) {
      return NextResponse.json(
        { error: "Database connection failed. Please retry your response." },
        { status: 503, headers: corsHeaders },
      )
    }
    
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, { methods: "POST, GET, PATCH, DELETE, OPTIONS" }),
  })
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request, { methods: "POST, GET, PATCH, DELETE, OPTIONS" })

  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
  }

  const searchParams = request.nextUrl.searchParams
  const surveyId = searchParams.get("surveyId") || undefined
  const questionId = searchParams.get("questionId") || undefined
  const userId = searchParams.get("userId")
  const limitParam = Number.parseInt(searchParams.get("limit") || "", 10)
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : undefined

  const ownedSurveys = await listSurveys({ createdBy: session.sub })
  const ownedSurveyIds = new Set(ownedSurveys.map((survey) => survey.id))
  const surveyTitleById = new Map(ownedSurveys.map((survey) => [survey.id, survey.title]))
  const scopedSurveyIds = surveyId ? [surveyId] : Array.from(ownedSurveyIds)
  if (surveyId && !ownedSurveyIds.has(surveyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!scopedSurveyIds.length) {
    return NextResponse.json({ responses: [] })
  }

  const responses = await listStoredResponses({
    surveyId: surveyId || undefined,
    surveyIds: surveyId ? undefined : scopedSurveyIds,
    questionId,
    userId: userId || undefined,
    limit,
  })
  const surveyQuestionEntries = await Promise.all(
    scopedSurveyIds.map(async (id) => [id, await getLatestPublishedSurveyQuestions(id)] as const),
  )
  const surveyQuestionsById = new Map(surveyQuestionEntries)

  return NextResponse.json({
    responses: responses.map((item) => {
      const questionList = surveyQuestionsById.get(item.surveyId) ?? []
      const questionIndex = Number.parseInt(item.questionId.replace(/^q/i, ""), 10) - 1
      const questionText = Number.isFinite(questionIndex) && questionIndex >= 0 ? questionList[questionIndex] ?? null : null

      return {
      id: item.id,
      surveyId: item.surveyId,
      surveyTitle: surveyTitleById.get(item.surveyId) || "Untitled survey",
      questionId: item.questionId,
      questionText,
      userId: item.userId,
      fileName: item.fileName,
      mimeType: item.mimeType,
      fileSize: item.size,
      durationSeconds: item.durationSeconds,
      durationBucket: item.durationBucket,
      playbackUrl: `/api/responses/${item.id}/audio`,
      flagged: item.flagged,
      highSignal: item.highSignal,
      bookmarked: item.bookmarked,
      moderationUpdatedAt: item.moderationUpdatedAt,
      timestamp: item.createdAt,
      }
    }),
  }, { headers: corsHeaders })
}

export async function PATCH(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request, { methods: "POST, GET, PATCH, DELETE, OPTIONS" })

  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
  }

  try {
    if (
      !hasTrustedOrigin({
        requestOrigin: request.headers.get("origin"),
        requestReferer: request.headers.get("referer"),
        requestUrl: request.url,
        configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      })
    ) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
    }

    const json = await request.json()
    const parsed = moderationSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid moderation payload", details: parsed.error.flatten() }, { status: 400 })
    }

    const { id, flagged, highSignal, bookmarked } = parsed.data
    if (flagged === undefined && highSignal === undefined && bookmarked === undefined) {
      return NextResponse.json({ error: "No moderation fields provided." }, { status: 400 })
    }

    const ownedSurveyIds = (await listSurveys({ createdBy: session.sub })).map((survey) => survey.id)
    const existing = await getStoredResponseByIdForSurveyIds(id, ownedSurveyIds)
    if (!existing) {
      return NextResponse.json({ error: "Response not found." }, { status: 404 })
    }

    const updated = await updateStoredResponseForSurveyIds(id, ownedSurveyIds, {
      flagged,
      highSignal,
      bookmarked,
    })
    if (!updated) {
      return NextResponse.json({ error: "Response not found." }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      response: {
        id: updated.id,
        surveyId: updated.surveyId,
        questionId: updated.questionId,
        userId: updated.userId,
        fileName: updated.fileName,
        mimeType: updated.mimeType,
        fileSize: updated.size,
        flagged: updated.flagged,
        highSignal: updated.highSignal,
        bookmarked: updated.bookmarked,
        moderationUpdatedAt: updated.moderationUpdatedAt,
        timestamp: updated.createdAt,
      },
    })
  } catch (error) {
    console.error("Error updating response moderation:", error)
    return NextResponse.json({ error: "Failed to update response moderation." }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request, { methods: "POST, GET, PATCH, DELETE, OPTIONS" })

  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
  }

  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Missing response id." }, { status: 400 })
  }

  if (
    !hasTrustedOrigin({
      requestOrigin: request.headers.get("origin"),
      requestReferer: request.headers.get("referer"),
      requestUrl: request.url,
      configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    })
  ) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
  }

  const ownedSurveyIds = (await listSurveys({ createdBy: session.sub })).map((survey) => survey.id)
  const deleted = await deleteStoredResponseForSurveyIds(id, ownedSurveyIds)
  if (!deleted) {
    return NextResponse.json({ error: "Response not found." }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
