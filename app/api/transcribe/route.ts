import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const requestSchema = z.object({
  questionId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
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
        { status: 400 },
      )
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Transcription provider is not configured in production." },
          { status: 503 },
        )
      }
      return NextResponse.json({
        success: true,
        transcription:
          "This is a mock transcription since OPENAI_API_KEY is not configured. In a production environment, this would be the actual transcription of the audio.",
        questionId: parsed.data.questionId,
        info: "OPENAI_API_KEY not configured - using mock transcription",
      })
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
      const errorText = await response.text()
      return NextResponse.json(
        { error: "Transcription provider request failed", details: errorText },
        { status: 502 },
      )
    }

    const data = (await response.json()) as { text?: string }
    return NextResponse.json({
      success: true,
      transcription: data.text || "",
      questionId: parsed.data.questionId,
    })
  } catch (error: any) {
    console.error("Error transcribing audio:", error)

    return NextResponse.json(
      {
        error: "Failed to transcribe audio",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
