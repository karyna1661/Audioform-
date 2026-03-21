import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getCorsHeaders, hasAllowedApiOrigin } from "@/lib/server/cors"
import { applyRateLimit, getRequestClientIp } from "@/lib/server/rate-limit"

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

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Transcription provider is not configured in production." },
          { status: 503, headers: corsHeaders },
        )
      }
      return NextResponse.json({
        success: true,
        transcription:
          "This is a mock transcription since OPENAI_API_KEY is not configured. In a production environment, this would be the actual transcription of the audio.",
        questionId: parsed.data.questionId,
        info: "OPENAI_API_KEY not configured - using mock transcription",
      }, { headers: corsHeaders })
    }

    const openaiForm = new FormData()
    openaiForm.append("file", audioFile)
    openaiForm.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe")

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: openaiForm,
    })

    if (!response.ok) {
      await response.text()
      return NextResponse.json(
        { error: "Transcription provider request failed" },
        { status: 502, headers: corsHeaders },
      )
    }

    const data = (await response.json()) as { text?: string }
    return NextResponse.json({
      success: true,
      transcription: data.text || "",
      questionId: parsed.data.questionId,
    }, { headers: corsHeaders })
  } catch (error: any) {
    console.error("Error transcribing audio:", error)

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
