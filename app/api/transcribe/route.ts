import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getCorsHeaders, hasAllowedApiOrigin } from "@/lib/server/cors"
import { enqueueTranscriptionJob, isTranscriptionJobsEnabled } from "@/lib/server/job-queue"
import { getRequestId, logServerError } from "@/lib/server/observability"
import { applyRateLimit, getRequestClientIp } from "@/lib/server/rate-limit"
import { transcribeAudioFile } from "@/lib/server/transcription-provider"

const requestSchema = z.object({
  questionId: z.string().min(1),
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
const MAX_QUEUED_TRANSCRIPTION_BYTES = 3 * 1024 * 1024

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request, { methods: "POST, OPTIONS" })

  try {
    if (!hasAllowedApiOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: corsHeaders })
    }

    const session = await getSessionFromRequest()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
    }

    const ip = getRequestClientIp(request.headers)
    const rate = await applyRateLimit({
      key: `transcribe:post:${ip}`,
      windowMs: 60_000,
      max: 10,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many transcription requests. Please retry shortly." },
        { status: 429, headers: { ...corsHeaders, "Retry-After": String(rate.retryAfterSeconds) } },
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const parsed = requestSchema.safeParse({
      questionId: formData.get("questionId"),
    })

    if (!audioFile || !parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid transcription request",
          details: parsed.success ? undefined : parsed.error.flatten(),
        },
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

    const asyncModeRequested = request.nextUrl.searchParams.get("mode") === "async"
    if (asyncModeRequested && isTranscriptionJobsEnabled()) {
      if (audioFile.size > MAX_QUEUED_TRANSCRIPTION_BYTES) {
        return NextResponse.json(
          { error: `Queued transcription currently supports files up to ${Math.floor(MAX_QUEUED_TRANSCRIPTION_BYTES / (1024 * 1024))}MB.` },
          { status: 413, headers: corsHeaders },
        )
      }

      const buffer = Buffer.from(await audioFile.arrayBuffer())
      const job = await enqueueTranscriptionJob({
        questionId: parsed.data.questionId,
        mimeType: audioFile.type || "application/octet-stream",
        fileName: audioFile.name || `${parsed.data.questionId}.audio`,
        audioBase64: buffer.toString("base64"),
      })

      return NextResponse.json({
        success: true,
        queued: true,
        jobId: job.id,
        questionId: parsed.data.questionId,
      }, { status: 202, headers: corsHeaders })
    }

    const transcription = await transcribeAudioFile(audioFile)
    return NextResponse.json({
      success: true,
      transcription,
      questionId: parsed.data.questionId,
    }, { headers: corsHeaders })
  } catch (error: any) {
    logServerError("api.transcribe", "transcription_failed", error, {
      requestId: getRequestId(request.headers),
    })

    return NextResponse.json(
      {
        error: "Failed to transcribe audio",
      },
      { status: 500, headers: corsHeaders },
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, { methods: "POST, OPTIONS" }),
  })
}
