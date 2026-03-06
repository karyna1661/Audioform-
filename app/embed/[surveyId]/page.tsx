"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AudioRecorder } from "@/components/audio-recorder"
import { useMobile } from "@/hooks/use-mobile"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"


type PublicSurvey = {
  id: string
  title: string
  decisionFocus: string | null
  intent: string | null
  templatePack?: string | null
  questionCount: number
  questions?: string[]
}

type PromptItem = {
  id: string
  text: string
}

function buildPrompts(survey: PublicSurvey): PromptItem[] {
  if (!Array.isArray(survey.questions) || survey.questions.length === 0) return []
  return survey.questions.slice(0, 8).map((text, index) => ({
    id: `q${index + 1}`,
    text,
  }))
}

export default function EmbedSurveyPage() {
  const router = useRouter()
  const params = useParams<{ surveyId: string }>()
  const surveyId = params.surveyId
  const isMobile = useMobile()

  const [survey, setSurvey] = useState<PublicSurvey | null>(null)
  const [surveyError, setSurveyError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [pendingUploads, setPendingUploads] = useState(0)
  const [failedQueue, setFailedQueue] = useState<Array<{ questionId: string; blob: Blob }>>([])

  useEffect(() => {
    const loadSurvey = async () => {
      setLoading(true)
      setSurveyError(null)
      try {
        const response = await fetch(`/api/surveys/public/${encodeURIComponent(surveyId)}`, {
          cache: "no-store",
        })
        if (!response.ok) throw new Error("Survey is unavailable.")
        const json = (await response.json()) as { survey?: PublicSurvey }
        if (!json.survey) throw new Error("Survey payload is missing.")
        setSurvey(json.survey)
      } catch (err) {
        setSurveyError(err instanceof Error ? err.message : "Failed to load survey.")
      } finally {
        setLoading(false)
      }
    }

    loadSurvey()
  }, [surveyId])

  const prompts = useMemo(() => (survey ? buildPrompts(survey) : []), [survey])
  const currentPrompt = prompts[index]

  const uploadResponse = async (questionId: string, blob: Blob, attempt = 1): Promise<void> => {
    setPendingUploads((value) => value + 1)
    try {
      const formData = new FormData()
      formData.append("audio", blob, `${questionId}-${Date.now()}.webm`)
      formData.append("questionId", questionId)
      formData.append("surveyId", surveyId)

      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 15000)
      const response = await fetch("/api/responses", {
        method: "POST",
        body: formData,
        keepalive: true,
        signal: controller.signal,
      }).finally(() => window.clearTimeout(timeout))
      if (!response.ok) throw new Error("Failed to submit your voice take.")
    } catch (err) {
      if (attempt < 4) {
        const delayMs = 500 * Math.pow(2, attempt - 1)
        await new Promise((resolve) => window.setTimeout(resolve, delayMs))
        await uploadResponse(questionId, blob, attempt + 1)
      } else {
        setUploadError(err instanceof Error ? err.message : "Failed to submit your voice take.")
        setFailedQueue((items) => [...items, { questionId, blob }])
      }
    } finally {
      setPendingUploads((value) => Math.max(0, value - 1))
    }
  }

  const onSubmit = (blob: Blob) => {
    if (!currentPrompt) return
    const submittedQuestionId = currentPrompt.id
    setUploadError(null)
    setSubmittedCount((value) => value + 1)
    void uploadResponse(submittedQuestionId, blob)
    if (index < prompts.length - 1) {
      setIndex((prev) => prev + 1)
      return
    }
    router.push(`/questionnaire/thank-you?surveyId=${encodeURIComponent(surveyId)}`)
  }

  const retryFailedUploads = async () => {
    const queued = [...failedQueue]
    setFailedQueue([])
    setUploadError(null)
    await Promise.all(queued.map((item) => uploadResponse(item.questionId, item.blob)))
  }

  if (loading) {
    return <SurveyLoadingSkeleton />
  }

  if (surveyError || !survey) {
    return (
      <main className={`min-h-dvh bg-[#f3ecdf] p-4`}>
        <section className="mx-auto max-w-2xl rounded-3xl border border-[#dbcdb8] bg-[#f9f4ea] p-6">
          <p className="text-lg font-semibold">Survey unavailable</p>
          <p className={`font-body mt-2 text-sm text-[#5c5146]`}>
            {surveyError || "This survey is unavailable right now."}
          </p>
        </section>
      </main>
    )
  }

  if (!prompts.length) {
    return (
      <main className={`min-h-dvh bg-[#f3ecdf] p-4`}>
        <section className="mx-auto max-w-2xl rounded-3xl border border-[#dbcdb8] bg-[#f9f4ea] p-6">
          <p className="text-lg font-semibold">Survey unavailable</p>
          <p className={`font-body mt-2 text-sm text-[#5c5146]`}>
            This survey has no published prompts yet. Ask the creator to publish it again.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className={`min-h-dvh bg-[#f3ecdf] p-4`}>
      <section className="mx-auto max-w-2xl rounded-3xl border border-[#dbcdb8] bg-[#f9f4ea] p-6">
        <p className={`font-body text-xs uppercase tracking-wide text-[#5c5146]`}>Embedded voice survey</p>
        <h1 className="mt-2 text-3xl font-semibold text-balance">{survey.title}</h1>
        <p className={`font-body mt-2 text-sm text-[#5c5146]`}>
          Help us decide what to build next. Leave a 30-second voice take.
        </p>

        <div className="mt-4 h-2 rounded-full bg-[#e8dcc9]">
          <div
            className="h-2 rounded-full bg-[#b85e2d]"
            style={{
              width: `${prompts.length ? Math.round((submittedCount / prompts.length) * 100) : 0}%`,
            }}
          />
        </div>

        <>
          <h2 className="mt-6 text-2xl font-semibold text-balance">{currentPrompt?.text}</h2>
          <p className={`font-body mt-2 text-sm text-[#5c5146]`}>
            Prompt {index + 1} of {prompts.length}. Keep it concrete and specific.
          </p>
          <div className="mt-4 rounded-2xl border border-[#dbcdb8] bg-[#fff6ed] p-4">
            <AudioRecorder
              onSubmit={onSubmit}
              questionId={currentPrompt?.id || "q1"}
              isMobile={isMobile}
              isUploading={false}
            />
          </div>
          {uploadError ? (
            <div className={`font-body mt-3 rounded-lg border border-[#e0b8ad] bg-[#f9e6e0] px-3 py-2 text-sm text-[#8a3d2b]`}>
              <p>{uploadError}</p>
              {failedQueue.length > 0 ? (
                <button
                  type="button"
                  className="mt-2 rounded-lg border border-[#e0b8ad] bg-[#fff6ed] px-3 py-2 text-sm hover:bg-[#f5ebdd]"
                  onClick={() => void retryFailedUploads()}
                >
                  Retry failed upload{failedQueue.length > 1 ? "s" : ""}
                </button>
              ) : null}
            </div>
          ) : null}
          {pendingUploads > 0 ? (
            <p className={`font-body mt-3 rounded-lg border border-[#dbcdb8] bg-[#f3ecdf] px-3 py-2 text-sm text-[#5c5146]`}>
              Syncing {pendingUploads} response{pendingUploads === 1 ? "" : "s"} in the background...
            </p>
          ) : null}
        </>

        <p className={`font-body mt-6 text-center text-xs text-[#5c5146]`}>
          Powered by{" "}
          <Link href="/" className="font-semibold underline">
            Audioform
          </Link>
        </p>
      </section>
    </main>
  )
}

