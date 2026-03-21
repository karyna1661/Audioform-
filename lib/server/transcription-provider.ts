export async function transcribeAudioFile(audioFile: File): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Transcription provider is not configured in production.")
    }

    return "This is a mock transcription since OPENAI_API_KEY is not configured. In a production environment, this would be the actual transcription of the audio."
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
    await response.text().catch(() => "")
    throw new Error("Transcription provider request failed")
  }

  const data = (await response.json()) as { text?: string }
  return data.text || ""
}
