import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const questionId = formData.get("questionId") as string

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Convert File to Buffer for OpenAI API
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Call OpenAI Whisper API for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: new File([buffer], audioFile.name, { type: audioFile.type }),
      model: "whisper-1",
    })

    // In a real app, you would store the transcription in your database
    console.log(`Transcribed audio for question ${questionId}:`, transcription.text)

    return NextResponse.json({
      success: true,
      transcription: transcription.text,
      questionId,
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
