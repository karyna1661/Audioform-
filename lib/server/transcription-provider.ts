import { logServerError, retryAsync, withTimeout } from "@/lib/server/observability"

function getTranscriptionProvider(): "deepgram" | "openai" {
  const configured = (process.env.TRANSCRIPTION_PROVIDER || "").trim().toLowerCase()
  if (configured === "openai") return "openai"
  if (configured === "deepgram") return "deepgram"
  if (process.env.DEEPGRAM_API_KEY) return "deepgram"
  return "openai"
}

async function transcribeWithOpenAI(audioFile: File): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OpenAI transcription provider is not configured in production.")
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
  )

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`Transcription provider request failed (${response.status}): ${text.slice(0, 400)}`)
  }

  const data = (await response.json()) as { text?: string }
  return data.text || ""
}

async function transcribeWithDeepgram(audioFile: File): Promise<string> {
  if (!process.env.DEEPGRAM_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Deepgram transcription provider is not configured in production.")
    }

    return "This is a mock transcription since DEEPGRAM_API_KEY is not configured. In a production environment, this would be the actual transcription of the audio."
  }

  const buffer = Buffer.from(await audioFile.arrayBuffer())
  const model = process.env.DEEPGRAM_MODEL || "nova-2"

  const response = await retryAsync(
    async () => {
      const result = await withTimeout(
        () =>
          fetch(`https://api.deepgram.com/v1/listen?model=${encodeURIComponent(model)}&smart_format=true`, {
            method: "POST",
            headers: {
              Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
              "Content-Type": audioFile.type || "audio/webm",
            },
            body: Uint8Array.from(buffer),
          }),
        20_000,
        "Deepgram transcription request",
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
  )

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`Transcription provider request failed (${response.status}): ${text.slice(0, 400)}`)
  }

  const data = (await response.json()) as {
    results?: {
      channels?: Array<{
        alternatives?: Array<{
          transcript?: string
        }>
      }>
    }
  }

  return data.results?.channels?.[0]?.alternatives?.[0]?.transcript || ""
}

export async function transcribeAudioFile(audioFile: File): Promise<string> {
  const provider = getTranscriptionProvider()

  try {
    if (provider === "deepgram") {
      return await transcribeWithDeepgram(audioFile)
    }

    return await transcribeWithOpenAI(audioFile)
  } catch (error) {
    logServerError("server.transcription", "provider_failed", error, {
      provider,
      fileName: audioFile.name,
      size: audioFile.size,
    })
    throw error
  }
}
