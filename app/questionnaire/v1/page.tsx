"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AudioRecorder } from "@/components/audio-recorder"
import { Button } from "@/components/ui/button"
import { useMobile } from "@/hooks/use-mobile"
import { trackEvent } from "@/lib/analytics"
import { getActiveSurveyId, recordFirstResponseForActiveSurvey } from "@/lib/behavior-metrics"
import { useAuth } from "@/lib/auth-context"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"


type PublicSurvey = {
  id: string
  title: string
  decisionFocus: string | null
  intent: string | null
  questionCount: number
  questions?: string[]
}

function buildPromptsFromSurvey(survey: PublicSurvey): Array<{ id: string; text: string }> {
  if (!Array.isArray(survey.questions) || survey.questions.length === 0) return []
  return survey.questions.slice(0, 8).map((text, index) => ({
    id: `q${index + 1}`,
    text,
  }))
}

export default function QuestionnaireV1Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status: authStatus, user } = useAuth()
  const isMobile = useMobile()
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Blob>>({})
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pendingUploads, setPendingUploads] = useState(0)
  const [failedQueue, setFailedQueue] = useState<Array<{ questionId: string; blob: Blob }>>([])
  const [lastDurationSeconds, setLastDurationSeconds] = useState<number | null>(null)
  const [surveyLoading, setSurveyLoading] = useState(true)
  const [surveyError, setSurveyError] = useState<string | null>(null)
  const [questionList, setQuestionList] = useState<Array<{ id: string; text: string }>>([])

  useEffect(() => {
    trackEvent("respondent_started")
    const run = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((t) => t.stop())
        setPermissionGranted(true)
      } catch {
        setPermissionGranted(false)
      }
    }
    run()
  }, [])

  const resolvedSurveyId = searchParams.get("surveyId") || getActiveSurveyId() || null
  const current = questionList[index]

  useEffect(() => {
    let isMounted = true
    const loadSurveyPrompts = async () => {
      setSurveyLoading(true)
      setSurveyError(null)
      if (!resolvedSurveyId) {
        if (isMounted) {
          setQuestionList([])
          setSurveyError("No survey selected. Open a published survey link from a creator.")
          setSurveyLoading(false)
        }
        return
      }
      try {
        const response = await fetch(`/api/surveys/public/${encodeURIComponent(resolvedSurveyId)}`, {
          cache: "no-store",
        })
        if (!response.ok) {
          if (isMounted) {
            setQuestionList([])
            setSurveyError("This survey is unavailable or unpublished.")
          }
          return
        }

        const json = (await response.json()) as { survey?: PublicSurvey }
        if (!json.survey) {
          if (isMounted) {
            setQuestionList([])
            setSurveyError("Survey payload missing.")
          }
          return
        }

        const prompts = buildPromptsFromSurvey(json.survey)
        if (isMounted) {
          if (!prompts.length) {
            setQuestionList([])
            setSurveyError("This published survey has no saved prompts yet.")
          } else {
            setQuestionList(prompts)
          }
        }
      } catch (error) {
        if (isMounted) {
          setSurveyError(error instanceof Error ? error.message : "Failed to load survey prompts.")
          setQuestionList([])
        }
      } finally {
        if (isMounted) setSurveyLoading(false)
      }
    }

    void loadSurveyPrompts()
    return () => {
      isMounted = false
    }
  }, [resolvedSurveyId])

  const uploadResponse = async (questionId: string, blob: Blob, attempt = 1): Promise<void> => {
    if (!resolvedSurveyId) {
      setUploadError("Survey id missing. Re-open the creator's survey link.")
      return
    }
    setPendingUploads((value) => value + 1)
    try {
      const formData = new FormData()
      formData.append("audio", blob, `${questionId}-${Date.now()}.webm`)
      formData.append("questionId", questionId)
      formData.append("surveyId", resolvedSurveyId)

      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 15000)
      const response = await fetch("/api/responses", {
        method: "POST",
        body: formData,
        credentials: "include",
        keepalive: true,
        signal: controller.signal,
      }).finally(() => window.clearTimeout(timeout))

      if (!response.ok) {
        throw new Error("Failed to save response.")
      }

      recordFirstResponseForActiveSurvey()
    } catch (error) {
      if (attempt < 4) {
        const delayMs = 500 * Math.pow(2, attempt - 1)
        await new Promise((resolve) => window.setTimeout(resolve, delayMs))
        await uploadResponse(questionId, blob, attempt + 1)
      } else {
        setUploadError(error instanceof Error ? error.message : "Failed to save response.")
        setFailedQueue((items) => [...items, { questionId, blob }])
      }
    } finally {
      setPendingUploads((value) => Math.max(0, value - 1))
    }
  }

  const onSubmit = (blob: Blob) => {
    const questionId = current.id
    setUploadError(null)
    setAnswers((prev) => ({ ...prev, [questionId]: blob }))
    void uploadResponse(questionId, blob)

    if (index < questionList.length - 1) {
      setIndex((prev) => prev + 1)
      return
    }

    trackEvent("respondent_completed")
    const target = resolvedSurveyId
      ? `/questionnaire/thank-you?surveyId=${encodeURIComponent(resolvedSurveyId)}`
      : "/questionnaire/thank-you"
    router.push(target)
  }

  const retryFailedUploads = async () => {
    const queued = [...failedQueue]
    setFailedQueue([])
    setUploadError(null)
    await Promise.all(queued.map((item) => uploadResponse(item.questionId, item.blob)))
  }

  if (surveyLoading) return <SurveyLoadingSkeleton />

  if (surveyError || questionList.length === 0) {
    return (
      <main className={`min-h-dvh bg-[#f3ecdf] p-4 sm:p-6`}>
        <section className="mx-auto max-w-3xl rounded-[1.5rem] border border-[#dbcdb8] bg-[#f9f4ea] p-4 sm:rounded-[2rem] sm:p-6">
          <h1 className="text-2xl font-semibold text-balance">Survey unavailable</h1>
          <p className={`font-body mt-2 text-sm text-[#5c5146] text-pretty`}>
            {surveyError || "This survey cannot be loaded."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/" className="rounded-full border border-[#dbcdb8] bg-[#fff6ed] px-4 py-2 text-sm hover:bg-[#f5ebdd]">
              Return home
            </Link>
            {authStatus === "authenticated" && user?.role === "admin" ? (
              <Link href="/admin/questionnaires" className="rounded-full bg-[#b85e2d] px-4 py-2 text-sm text-[#fff6ed] hover:bg-[#a05227]">
                Create survey
              </Link>
            ) : null}
          </div>
        </section>
      </main>
    )
  }

  if (permissionGranted === false) {
    return (
      <main className={`min-h-dvh bg-[#f3ecdf] p-4 sm:p-6`}>
        <div className="mx-auto max-w-md">
          <Alert variant="destructive" aria-live="assertive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Microphone Access Required</AlertTitle>
            <AlertDescription className={`font-body text-pretty`}>
              We could not access your microphone. Enable mic permission in browser settings, then reload this page to continue.
            </AlertDescription>
          </Alert>
          <Button className="mt-4 w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]" onClick={() => window.location.reload()}>
            Retry microphone access
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className={`min-h-dvh bg-[#f3ecdf] p-4 sm:p-6`}>
      <section className="mx-auto max-w-3xl rounded-[1.5rem] border border-[#dbcdb8] bg-[#f9f4ea] p-4 sm:rounded-[2rem] sm:p-6">
        {authStatus === "authenticated" && user?.role === "admin" ? (
          <div className="mb-4">
            <Link href="/admin/dashboard/v4" className={`font-body text-sm text-[#8a431f] underline`}>
              Back to dashboard
            </Link>
          </div>
        ) : null}
          <p className={`font-body text-sm text-[#5c5146] text-pretty`}>
            We are deciding what to build next. Your 30-second voice take directly shapes our roadmap.
          </p>
        <div className="mt-3 flex items-center justify-between">
          <p className={`font-body text-sm text-[#5c5146]`}>
            Question {Math.min(index + 1, questionList.length)} of {questionList.length}
          </p>
          <p className={`font-body text-sm tabular-nums text-[#5c5146]`}>{Math.round((Object.keys(answers).length / questionList.length) * 100)}%</p>
        </div>

        <div className="mt-2 h-2 rounded-full bg-[#e8dcc9]">
          <div className="h-2 rounded-full bg-[#b85e2d]" style={{ width: `${(Object.keys(answers).length / questionList.length) * 100}%` }} />
        </div>

        <div className="mt-8">
            <h1 className="text-2xl font-semibold text-balance sm:text-3xl">{current.text}</h1>
            <p className={`font-body mt-2 text-sm text-[#5c5146] text-pretty`}>
              Give your honest take as if the builder will hear this directly. 20-45 seconds is ideal.
            </p>
            <div className="mt-6 rounded-2xl border border-[#dbcdb8] bg-[#fff6ed] p-4">
              <AudioRecorder
                onSubmit={onSubmit}
                questionId={current.id}
                isMobile={isMobile}
                isUploading={false}
                onRecordingStart={() => trackEvent("response_recording_started", { question_id: current.id })}
                onRecordingSubmit={({ questionId, durationSeconds }) => {
                  setLastDurationSeconds(durationSeconds)
                  trackEvent("response_recording_submitted", {
                    survey_id: resolvedSurveyId,
                    question_id: questionId,
                    duration_seconds: durationSeconds,
                  })
                  trackEvent("response_duration_bucketed", {
                    survey_id: resolvedSurveyId,
                    question_id: questionId,
                    duration_seconds: durationSeconds,
                    duration_bucket: durationSeconds > 20 ? "deep" : durationSeconds >= 10 ? "medium" : "short",
                  })
                }}
              />
            </div>
            {uploadError ? (
              <div className={`font-body mt-3 rounded-lg border border-[#e0b8ad] bg-[#f9e6e0] px-3 py-2 text-sm text-[#8a3d2b]`}>
                <p>{uploadError}</p>
                {failedQueue.length > 0 ? (
                  <Button
                    variant="outline"
                    className="mt-2 border-[#e0b8ad] bg-[#fff6ed]"
                    onClick={() => void retryFailedUploads()}
                  >
                    Retry failed upload{failedQueue.length > 1 ? "s" : ""}
                  </Button>
                ) : null}
              </div>
            ) : null}
            {lastDurationSeconds !== null && lastDurationSeconds < 10 ? (
              <p className={`font-body mt-3 rounded-lg border border-[#dbcdb8] bg-[#f3ecdf] px-3 py-2 text-sm text-[#5c5146]`}>
                Add one concrete example before submitting. High-signal answers are usually 20+ seconds.
              </p>
            ) : null}
            {pendingUploads > 0 ? (
              <p className={`font-body mt-3 rounded-lg border border-[#dbcdb8] bg-[#f3ecdf] px-3 py-2 text-sm text-[#5c5146]`}>
                Syncing {pendingUploads} response{pendingUploads === 1 ? "" : "s"} in the background...
              </p>
            ) : null}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="outline" className="w-full border-[#dbcdb8] bg-[#f3ecdf] sm:w-auto" onClick={() => setIndex((prev) => Math.max(0, prev - 1))} disabled={index === 0}>
                Previous
              </Button>
              <p className={`font-body text-center text-sm text-[#5c5146] sm:text-left`}>{Object.keys(answers).length} answered</p>
            </div>
          </div>
      </section>
    </main>
  )
}



