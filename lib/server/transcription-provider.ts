import { logServerError, retryAsync, withTimeout } from "@/lib/server/observability"

export async function transcribeAudioFile(audioFile: File): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Transcription provider is not configured in production.")
    }

    return "This is a mock transcription since OPENAI_API_KEY is not configured. In a production environment, this would be the actual transcription of the audio."
  }

  const response = await retryAsync(
    async () => {
      const openaiForm = new FormData()
      openaiForm.append("file", audioFile)
      openaiForm.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe")

      const result = await withTimeout(
        () =>
          fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: openaiForm,
          }),
        20_000,
        "OpenAI transcription request",
      )

      if (!result.ok && (result.status === 429 || result.status >= 500)) {
        const text = await result.text().catch(() => "")
        throw new Error(`Transcription provider retryable failure (${result.status}): ${text.slice(0, 200)}`)
      }

      return result
    },
    {
      attempts: 3,
      initialDelayMs: 500,
      shouldRetry: (error) => error instanceof Error && /timed out|retryable failure|fetch failed/i.test(error.message),
    },
  ).catch((error) => {
    logServerError("server.transcription", "provider_failed", error, {
      fileName: audioFile.name,
      size: audioFile.size,
    })
    throw error
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`Transcription provider request failed (${response.status}): ${text.slice(0, 400)}`)
  }

  const data = (await response.json()) as { text?: string }
  return data.text || ""
}
