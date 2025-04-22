import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const questionId = formData.get("questionId") as string

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.log("Transcription would be processed (OPENAI_API_KEY not configured)")

      // Return mock transcription for development
      return NextResponse.json({
        success: true,
        transcription:
          "This is a mock transcription since OPENAI_API_KEY is not configured. In a production environment, this would be the actual transcription of the audio.",
        questionId,
        info: "OPENAI_API_KEY not configured - using mock transcription",
      })
    }

    // In a real implementation, we would call the OpenAI API here
    // For now, we'll just return a mock response
    console.log(`Transcription requested for audio related to question ${questionId}`)

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return NextResponse.json({
      success: true,
      transcription:
        "This is a simulated transcription of the audio recording. In a production environment with a valid OpenAI API key, this would be the actual transcription.",
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
