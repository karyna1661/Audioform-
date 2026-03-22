"use client"

import { useEffect, useRef, useState } from "react"
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
import { classifyResponseDuration } from "@/lib/response-duration"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"

type PublicSurvey = {
  id: string
  title: string
  decisionFocus: string | null
  intent: string | null
  questionCount: number
  questions?: string[]
}

type UploadSession = {
  responseId: string
  idempotencyKey: string
  sessionId: string
  uploadUrl: string
}

function buildPromptsFromSurvey(survey: PublicSurvey): Array<{ id: string; text: string }> {
  if (!Array.isArray(survey.questions) || survey.questions.length === 0) return []
  return survey.questions.slice(0, 8).map((text, index) => ({
    id: `q${index + 1}`,
    text,
  }))
}

async function initializeUploadSession(surveyId: string, questionId: string): Promise<UploadSession> {
  const initController = new AbortController()
  const initTimeout = window.setTimeout(() => initController.abort(), 15000)
  const initResponse = await fetch("/api/responses/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ surveyId, questionId }),
    signal: initController.signal,
  }).finally(() => window.clearTimeout(initTimeout))

  if (!initResponse.ok) {
    const errorPayload = (await initResponse.json().catch(() => null)) as { error?: string } | null
    throw new Error(errorPayload?.error || "Failed to initialize upload.")
  }

  const initPayload = (await initResponse.json()) as Partial<UploadSession>
  if (!initPayload.responseId || !initPayload.idempotencyKey || !initPayload.sessionId || !initPayload.uploadUrl) {
    throw new Error("Upload session payload missing.")
  }

  return {
    responseId: initPayload.responseId,
    idempotencyKey: initPayload.idempotencyKey,
    sessionId: initPayload.sessionId,
    uploadUrl: initPayload.uploadUrl,
  }
}

export default function QuestionnaireClientPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status: authStatus, user } = useAuth()
  const isMobile = useMobile()
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Blob>>({})
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pendingUploads, setPendingUploads] = useState(0)
  const [failedQueue, setFailedQueue] = useState<Array<{ questionId: string; blob: Blob; durationSeconds: number | null }>>([])
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [lastDurationSeconds, setLastDurationSeconds] = useState<number | null>(null)
  const [recordingDurations, setRecordingDurations] = useState<Record<string, number>>({})
  const [recorderSubmitState, setRecorderSubmitState] = useState<"idle" | "uploading" | "error" | "success">("idle")
  const [surveyLoading, setSurveyLoading] = useState(true)
  const [surveyError, setSurveyError] = useState<string | null>(null)
  const [questionList, setQuestionList] = useState<Array<{ id: string; text: string }>>([])
  const [shortResponseHint, setShortResponseHint] = useState<string | null>(null)
  const isMountedRef = useRef(true)
  const uploadSessionsRef = useRef<Record<string, UploadSession>>({})

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

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
          setQuestionList([])
          setSurveyError(error instanceof Error ? error.message : "Failed to load survey.")
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

  const uploadResponse = async (
    questionId: string,
    blob: Blob,
    durationSeconds: number | null,
    attempt = 1,
    existingSession?: UploadSession,
  ): Promise<boolean> => {
    if (!resolvedSurveyId) {
      setUploadError("No survey selected.")
      return false
    }

    if (isMountedRef.current) {
      setPendingUploads((value) => value + 1)
    }

    try {
      const session = existingSession || uploadSessionsRef.current[questionId] || await initializeUploadSession(resolvedSurveyId, questionId)
      uploadSessionsRef.current[questionId] = session

      const formData = new FormData()
      formData.append("audio", blob, `${questionId}-${Date.now()}.webm`)
      formData.append("responseId", session.responseId)
      formData.append("idempotencyKey", session.idempotencyKey)
      formData.append("sessionId", session.sessionId)
      if (typeof durationSeconds === "number") {
        formData.append("durationSeconds", String(durationSeconds))
      }

      const uploadController = new AbortController()
      const uploadTimeout = window.setTimeout(() => uploadController.abort(), 45000)
      const response = await fetch(session.uploadUrl, {
        method: "POST",
        body: formData,
        credentials: "include",
        signal: uploadController.signal,
      }).finally(() => window.clearTimeout(uploadTimeout))

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(errorPayload?.error || "Failed to save response.")
      }

      return true
    } catch (error) {
      if (attempt < 4) {
        const delayMs = 500 * Math.pow(2, attempt - 1)
        await new Promise((resolve) => window.setTimeout(resolve, delayMs))
        return uploadResponse(questionId, blob, durationSeconds, attempt + 1, uploadSessionsRef.current[questionId])
      }

      if (isMountedRef.current) {
        setUploadError(error instanceof Error ? error.message : "Failed to save response.")
        setFailedQueue((items) => [...items, { questionId, blob, durationSeconds }])
      }
      return false
    } finally {
      if (isMountedRef.current) {
        setPendingUploads((value) => Math.max(0, value - 1))
      }
    }
  }

  const flushFailedQueue = async () => {
    if (!failedQueue.length) return
    const queued = [...failedQueue]
    setFailedQueue([])
    await Promise.all(queued.map((item) => uploadResponse(item.questionId, item.blob, item.durationSeconds)))
  }

  useEffect(() => {
    if (!failedQueue.length) return
    const onOnline = () => {
      void flushFailedQueue()
    }
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [failedQueue])

  const submitAndAdvance = async (blob: Blob, questionId: string, currentIndex: number) => {
    if (isSubmittingAnswer) return
    setIsSubmittingAnswer(true)

    setUploadError(null)
    setRecorderSubmitState("uploading")
    const durationSeconds = recordingDurations[questionId] ?? null
    const uploaded = await uploadResponse(questionId, blob, durationSeconds)
    if (!isMountedRef.current) return
    if (!uploaded) {
      setRecorderSubmitState("error")
      setIsSubmittingAnswer(false)
      return
    }

    if (resolvedSurveyId && typeof durationSeconds === "number") {
      trackEvent("response_recording_submitted", {
        survey_id: resolvedSurveyId,
        question_id: questionId,
        duration_seconds: durationSeconds,
      })
      trackEvent("response_duration_bucketed", {
        survey_id: resolvedSurveyId,
        question_id: questionId,
        duration_seconds: durationSeconds,
        duration_bucket: classifyResponseDuration(durationSeconds),
      })
    }

    setRecorderSubmitState("success")
    setAnswers((prev) => ({ ...prev, [questionId]: blob }))
    delete uploadSessionsRef.current[questionId]

    if (currentIndex < questionList.length - 1) {
      setIndex((prev) => prev + 1)
      setRecorderSubmitState("idle")
      setIsSubmittingAnswer(false)
      return
    }

    trackEvent("respondent_completed", {
      question_count: questionList.length,
      answered_count: Object.keys(answers).length + 1,
    })
    if (resolvedSurveyId) {
      recordFirstResponseForActiveSurvey()
    }
    setIsSubmittingAnswer(false)
    const thankYouHref = resolvedSurveyId
      ? `/questionnaire/thank-you?surveyId=${encodeURIComponent(resolvedSurveyId)}`
      : "/questionnaire/thank-you"
    router.push(thankYouHref)
  }

  if (surveyLoading || permissionGranted === null) {
    return <SurveyLoadingSkeleton label="Loading voice survey..." />
  }

  if (surveyError) {
    return (
      <main className="min-h-dvh overflow-x-hidden bg-[#f3ecdf] p-4 sm:p-6">
        <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-[#dbcdb8] bg-[#f9f4ea] p-6">
          <Alert className="border-[#e3c3b5] bg-[#fff0e9] text-[#8a3d2b]">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Survey unavailable</AlertTitle>
            <AlertDescription className="font-body">{surveyError}</AlertDescription>
          </Alert>
        </section>
      </main>
    )
  }

  if (permissionGranted === false) {
    return (
      <main className="min-h-dvh overflow-x-hidden bg-[#f3ecdf] p-4 sm:p-6">
        <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-[#dbcdb8] bg-[#f9f4ea] p-6">
          <Alert className="border-[#e3c3b5] bg-[#fff0e9] text-[#8a3d2b]">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Microphone access needed</AlertTitle>
            <AlertDescription className="font-body text-pretty">
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
    <main className="min-h-dvh overflow-x-hidden bg-[#f3ecdf] px-3 py-4 sm:p-6">
      <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-[1.35rem] border border-[#dbcdb8] bg-[#f9f4ea] p-4 sm:rounded-[2rem] sm:p-6">
        {authStatus === "authenticated" && user?.role === "admin" ? (
          <div className="mb-4">
            <Link href="/admin/dashboard/v4" className="font-body text-sm text-[#8a431f] underline">
              Back to dashboard
            </Link>
          </div>
        ) : null}
        <p className="font-body text-[13px] leading-6 text-[#5c5146] text-pretty sm:text-sm">
          Give one clear 30-second response so the builder can decide what to improve next.
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="min-w-0 font-body text-[13px] leading-5 text-[#5c5146] sm:text-sm">
            Question {Math.min(index + 1, questionList.length)} of {questionList.length}
          </p>
          <p className="shrink-0 font-body text-[13px] tabular-nums text-[#5c5146] sm:text-sm">{Math.round((Object.keys(answers).length / questionList.length) * 100)}%</p>
        </div>

        <div className="mt-2 h-2 rounded-full bg-[#e8dcc9]">
          <div className="h-2 rounded-full bg-[#b85e2d]" style={{ width: `${(Object.keys(answers).length / questionList.length) * 100}%` }} />
        </div>

        <div className="mt-6 min-w-0 sm:mt-8">
          <h1 className="text-[1.65rem] font-semibold leading-[1.15] text-balance break-words sm:text-3xl">{current.text}</h1>
          <p className="font-body mt-2 text-[13px] leading-6 text-[#5c5146] text-pretty sm:text-sm">
            Speak directly. One concrete moment in 20-45 seconds is ideal.
          </p>
        </div>

        <div className="mt-5 sm:mt-6">
          <AudioRecorder
            key={current.id}
            onSubmit={(blob) => void submitAndAdvance(blob, current.id, index)}
            questionId={current.id}
            isMobile={isMobile}
            isUploading={isSubmittingAnswer || pendingUploads > 0}
            submitState={recorderSubmitState}
            onRecordingStart={() => trackEvent("response_recording_started", { question_id: current.id })}
            onRecordingSubmit={({ questionId, durationSeconds }) => {
              setLastDurationSeconds(durationSeconds)
              setRecordingDurations((prev) => ({ ...prev, [questionId]: durationSeconds }))
              setShortResponseHint(
                durationSeconds < 10
                  ? "This take is on the short side. If you can, add one concrete moment or example before sending."
                  : null,
              )
            }}
          />
        </div>

        {shortResponseHint ? (
          <Alert className="mt-4 border-[#dbcdb8] bg-[#fff6ed] text-[#5c5146]">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Want a stronger answer?</AlertTitle>
            <AlertDescription className="font-body text-pretty">{shortResponseHint}</AlertDescription>
          </Alert>
        ) : null}

        {uploadError ? (
          <Alert className="mt-4 border-[#e3c3b5] bg-[#fff0e9] text-[#8a3d2b]">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Upload paused</AlertTitle>
            <AlertDescription className="font-body text-pretty">
              {uploadError}
              {lastDurationSeconds ? ` Your ${lastDurationSeconds}s take is still here so you can retry without re-recording.` : ""}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3 sm:mt-8">
          <Button
            variant="outline"
            className="border-[#dbcdb8] bg-[#fff6ed] px-4"
            disabled={index === 0 || isSubmittingAnswer}
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
          >
            Previous
          </Button>
          <p className="min-w-0 text-right font-body text-[11px] leading-5 text-[#5c5146] sm:text-xs">
            {Object.keys(answers).length} answered so far
          </p>
        </div>
      </section>
    </main>
  )
}
