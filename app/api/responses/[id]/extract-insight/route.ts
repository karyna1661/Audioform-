import { readFile } from "node:fs/promises"
import { type NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getCorsHeaders, hasAllowedApiOrigin } from "@/lib/server/cors"
import { downloadFromB2StoragePath } from "@/lib/server/b2-storage"
import { enqueueTranscriptionJob, isTranscriptionJobsEnabled } from "@/lib/server/job-queue"
import { applyRateLimit, getRequestClientIp } from "@/lib/server/rate-limit"
import { getStoredResponseByIdForSurveyIds } from "@/lib/server/response-store"
import { listSurveys } from "@/lib/server/survey-store"
import { createPendingTranscript } from "@/lib/server/transcript-store"

async function downloadFromPublicUrl(publicUrl: string): Promise<Buffer | null> {
  const response = await fetch(publicUrl, { cache: "no-store" })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`public audio download failed (${response.status}): ${text.slice(0, 220)}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function loadStoredAudio(response: Awaited<ReturnType<typeof getStoredResponseByIdForSurveyIds>>) {
  if (!response?.storagePath) return null
  if (response.storagePath.startsWith("b2://")) {
    try {
      return await downloadFromB2StoragePath(response.storagePath)
    } catch {
      if (response.publicUrl) {
        return downloadFromPublicUrl(response.publicUrl)
      }
      throw new Error("B2-backed audio requires credentials or a public URL fallback.")
    }
  }
  return readFile(response.storagePath)
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const corsHeaders = getCorsHeaders(request, { methods: "POST, OPTIONS" })
  try {
    const session = await getSessionFromRequest()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
    }

    if (!hasAllowedApiOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: corsHeaders })
    }

    if (!isTranscriptionJobsEnabled()) {
      return NextResponse.json({ error: "Transcription jobs are not enabled." }, { status: 503, headers: corsHeaders })
    }

    const ip = getRequestClientIp(request.headers)
    const rate = await applyRateLimit({
      key: `extract-insight:${ip}`,
      windowMs: 60_000,
      max: 20,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many extractor requests. Please retry shortly." },
        { status: 429, headers: { ...corsHeaders, "Retry-After": String(rate.retryAfterSeconds) } },
      )
    }

    const { id } = await context.params
    const ownedSurveyIds = (await listSurveys({ createdBy: session.sub })).map((survey) => survey.id)
    const stored = await getStoredResponseByIdForSurveyIds(id, ownedSurveyIds)
    if (!stored || stored.status !== "uploaded") {
      return NextResponse.json({ error: "Response not found." }, { status: 404, headers: corsHeaders })
    }

    const buffer = await loadStoredAudio(stored)
    if (!buffer) {
      return NextResponse.json({ error: "Stored audio is unavailable." }, { status: 404, headers: corsHeaders })
    }

    const job = await enqueueTranscriptionJob({
      responseId: stored.id,
      questionId: stored.questionId,
      mimeType: stored.mimeType || "audio/webm",
      fileName: stored.fileName || `${stored.id}.webm`,
      audioBase64: Buffer.from(buffer).toString("base64"),
    })

    await createPendingTranscript({
      jobId: job.id,
      responseId: stored.id,
      questionId: stored.questionId,
      provider: "openai",
    })

    return NextResponse.json({ success: true, jobId: job.id }, { status: 202, headers: corsHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to extract insight."
    console.error("[extract-insight] failed", {
      responseId: await context.params.then((value) => value.id).catch(() => null),
      message,
    })
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === "development" ? message : "Failed to extract insight.",
      },
      { status: 500, headers: getCorsHeaders(request, { methods: "POST, OPTIONS" }) },
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, { methods: "POST, OPTIONS" }),
  })
}
