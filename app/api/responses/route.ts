import { type NextRequest, NextResponse } from "next/server"

// In a real application, this would connect to MongoDB or another database
// For this demo, we'll just simulate storing the data

export async function POST(request: NextRequest) {
  try {
    // In a real app, we would parse the form data to get the audio file
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const questionId = formData.get("questionId") as string
    const userId = (formData.get("userId") as string) || "anonymous"

    if (!audioFile || !questionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // In a real app, we would:
    // 1. Store the audio file in MongoDB GridFS or S3
    // 2. Create a record in the database with metadata
    // 3. Optionally queue the file for transcription

    console.log(`Received audio response for question ${questionId} from user ${userId}`)

    // Simulate successful storage
    return NextResponse.json(
      {
        success: true,
        message: "Audio response saved successfully",
        data: {
          questionId,
          userId,
          fileName: audioFile.name,
          fileSize: audioFile.size,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error handling audio upload:", error)
    return NextResponse.json({ error: "Failed to process audio upload" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // In a real app, this would fetch responses from the database
  // For this demo, we'll return mock data

  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get("userId")

  // Mock data
  const responses = [
    {
      id: "resp1",
      userId: "user123",
      questionId: "q1",
      audioUrl: "/api/audio/resp1.webm",
      duration: 28,
      transcriptStatus: "pending",
      timestamp: "2023-04-20T14:30:00Z",
    },
    {
      id: "resp2",
      userId: "user123",
      questionId: "q2",
      audioUrl: "/api/audio/resp2.webm",
      duration: 45,
      transcriptStatus: "pending",
      timestamp: "2023-04-20T14:32:00Z",
    },
  ]

  // Filter by userId if provided
  const filteredResponses = userId ? responses.filter((resp) => resp.userId === userId) : responses

  return NextResponse.json({ responses: filteredResponses })
}
