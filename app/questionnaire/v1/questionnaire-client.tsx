"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, AudioWaveform, Headphones, Mic, Sparkles } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AudioRecorder } from "@/components/audio-recorder"
import { Button } from "@/components/ui/button"
import { useMobile } from "@/hooks/use-mobile"
import { trackEvent } from "@/lib/analytics"
import { getActiveSurveyId, recordFirstResponseForActiveSurvey } from "@/lib/behavior-metrics"
import { useAuth } from "@/lib/auth-context"
import { classifyResponseDuration } from "@/lib/response-duration"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"
import { PocketActionStack, PocketSection, PocketShell } from "@/components/mobile/pocket-shell"
import { normalizeArrivalSource } from "@/lib/share-links"

type PublicSurvey = {
  id: string
  title: string
  decisionFocus: string | null
  intent: string | null
  questionCount: number
  publicListeningEnabled?: boolean
  status?: string
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
  const [publicListeningEnabled, setPublicListeningEnabled] = useState(false)
  const [allowPublicOptIn, setAllowPublicOptIn] = useState(false)
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
  const arrivalSource = normalizeArrivalSource(searchParams.get("src"))
  const isQrEntry = arrivalSource === "qr"
  const isSocialEntry = arrivalSource === "social"
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
          setPublicListeningEnabled(Boolean(json.survey.publicListeningEnabled) && json.survey.status !== "closed")
          setAllowPublicOptIn(Boolean(json.survey.publicListeningEnabled) && json.survey.status !== "closed")
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
      formData.append("publicOptIn", allowPublicOptIn ? "true" : "false")

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
    const completedResponseId = uploadSessionsRef.current[questionId]?.responseId ?? null
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
    const thankYouParams = new URLSearchParams()
    if (resolvedSurveyId) thankYouParams.set("surveyId", resolvedSurveyId)
    if (completedResponseId) thankYouParams.set("responseId", completedResponseId)
    if (arrivalSource !== "direct") thankYouParams.set("src", arrivalSource)
    const thankYouHref = `/questionnaire/thank-you${thankYouParams.toString() ? `?${thankYouParams.toString()}` : ""}`
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
    if (isMobile) {
      return (
        <PocketShell
          eyebrow="Audioform survey"
          title="Microphone access needed"
          description="Enable microphone permission in your browser settings, then come back here to record your answer."
          footer={
            <Button className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]" onClick={() => window.location.reload()}>
              Retry microphone access
            </Button>
          }
        >
          <Alert className="border-[#e3c3b5] bg-[#fff0e9] text-[#8a3d2b]">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Microphone unavailable</AlertTitle>
            <AlertDescription className="font-body text-pretty">
              Audioform needs microphone access before this survey can continue.
            </AlertDescription>
          </Alert>
        </PocketShell>
      )
    }

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

  if (isMobile) {
    const answeredCount = Object.keys(answers).length
    const progressPercent = Math.round((answeredCount / questionList.length) * 100)
    const introTitle = isQrEntry ? "Scan. Speak. Listen." : isSocialEntry ? "Hear. Speak. Join." : "Speak and contribute."
    const introBody = publicListeningEnabled
      ? isSocialEntry
        ? "This release opens into a responder listening room after submission."
        : "This release includes a responder listening room after submission."
      : isSocialEntry
        ? "This release is collecting private voice takes for the creator."
        : "This release is set up for a clean scan-and-speak flow."

    return (
      <PocketShell
        eyebrow={`Question ${Math.min(index + 1, questionList.length)} of ${questionList.length}`}
        title={current.text}
        description={
          isQrEntry
            ? "Scan in, speak clearly, then unlock the listening room after you submit if this release has public listening on."
            : isSocialEntry
              ? "Hear the prompt, add your voice, then join the listening room after you submit if this release is open."
              : "Answer clearly by voice, then unlock the listening room after you submit if this release has public listening on."
        }
        footer={
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 text-xs text-[#5c5146]">
              <span>{answeredCount} answered so far</span>
              <span className="tabular-nums">{progressPercent}% complete</span>
            </div>
            <div className="h-2 rounded-full bg-[#e8dcc9]">
              <div className="h-2 rounded-full bg-[#b85e2d]" style={{ width: `${progressPercent}%` }} />
            </div>
            <Button
              variant="outline"
              className="w-full border-[#dbcdb8] bg-[#f3ecdf]"
              disabled={index === 0 || isSubmittingAnswer}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
            >
              Previous prompt
            </Button>
          </div>
        }
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#dbcdb8] bg-[#fffdf8] px-3 py-1.5 text-[11px] font-medium text-[#5c5146]">
          {isQrEntry ? <Headphones className="size-3.5 text-[#2d5a17]" /> : isSocialEntry ? <Sparkles className="size-3.5 text-[#8a431f]" /> : <Mic className="size-3.5 text-[#8a431f]" />}
          {isQrEntry ? "Entering the room" : isSocialEntry ? "Joining the conversation" : "Voice response"}
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-[1.15rem] border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a6146]">Prompt</p>
            <p className="mt-1 text-base font-semibold text-[var(--af-color-primary)]">{index + 1}</p>
            <p className="mt-1 text-[11px] leading-4 text-[#665746]">currently live</p>
          </div>
          <div className="rounded-[1.15rem] border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a6146]">Answered</p>
            <p className="mt-1 text-base font-semibold text-[var(--af-color-primary)]">{answeredCount}</p>
            <p className="mt-1 text-[11px] leading-4 text-[#665746]">takes submitted</p>
          </div>
          <div className="rounded-[1.15rem] border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a6146]">Mode</p>
            <p className="mt-1 text-base font-semibold text-[var(--af-color-primary)]">{publicListeningEnabled ? "Open" : "Private"}</p>
            <p className="mt-1 text-[11px] leading-4 text-[#665746]">after submit</p>
          </div>
        </div>

        {authStatus === "authenticated" && user?.role === "admin" ? (
          <div className="mb-4">
            <Link href="/admin/dashboard/v4" className="font-body text-sm text-[#8a431f] underline">
              Back to Listen
            </Link>
          </div>
        ) : null}

        <PocketSection title={introTitle} description={introBody} className="bg-[#fff6ed]">
          <div className="space-y-2">
            <div className="rounded-[1rem] border border-[#dbcdb8] bg-[#fffdf8] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a6146]">How it works</p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="inline-flex size-9 items-center justify-center rounded-full bg-[#f2ddcd] text-[#8a431f]"><Mic className="size-4" /></div>
                  <p className="text-[12px] leading-5 text-[#5c5146]">Share your voice with one concrete moment.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="inline-flex size-9 items-center justify-center rounded-full bg-[#f3ecdf] text-[#7a6146]"><AudioWaveform className="size-4" /></div>
                  <p className="text-[12px] leading-5 text-[#5c5146]">Your take lands in the creator's listening workspace.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`inline-flex size-9 items-center justify-center rounded-full ${publicListeningEnabled ? "bg-[#e8f2e0] text-[#2d5a17]" : "bg-[#f3ecdf] text-[#7a6146]"}`}><Headphones className="size-4" /></div>
                  <p className="text-[12px] leading-5 text-[#5c5146]">
                    {publicListeningEnabled ? "Unlock the listening room after you submit if this release stays open." : "This release stays private and goes straight to creator review."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </PocketSection>

        <PocketSection title="Your voice take" description="Record once, preview it, then send when it sounds right.">
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
        </PocketSection>

        <div className="af-mobile-rail mt-4">
          {[
            "The creator will hear conviction, hesitation, and specificity, not just the words.",
            publicListeningEnabled
              ? "If you opt in, the public listening room unlocks after submission while the release is still open."
              : "This release stays private after submission and goes straight into creator review.",
          ].map((line) => (
            <div key={line} className="af-mobile-rail-card rounded-[1.1rem] border border-[#dbcdb8] bg-[#fffdf8] p-3.5 text-sm leading-6 text-[#5c5146]">
              {line}
            </div>
          ))}
        </div>

        <PocketActionStack className="mt-4">
          {publicListeningEnabled ? (
            <PocketSection
              title="Join the responder listening room"
              description="If you opt in, your take can appear anonymously after submission while this release is open."
              className="bg-[#fff6ed]"
            >
              <label className="flex items-start gap-3 rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-3 py-3 text-sm text-[#5c5146]">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[#b85e2d]"
                  checked={allowPublicOptIn}
                  onChange={(event) => setAllowPublicOptIn(event.target.checked)}
                />
                <span>Allow my response to be included in the anonymous listening room after I submit.</span>
              </label>
            </PocketSection>
          ) : null}

          {shortResponseHint ? (
            <Alert className="border-[#dbcdb8] bg-[#fff6ed] text-[#5c5146]">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Want a stronger answer?</AlertTitle>
              <AlertDescription className="font-body text-pretty">{shortResponseHint}</AlertDescription>
            </Alert>
          ) : null}

          {uploadError ? (
            <Alert className="border-[#e3c3b5] bg-[#fff0e9] text-[#8a3d2b]">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Upload paused</AlertTitle>
              <AlertDescription className="font-body text-pretty">
                {uploadError}
                {lastDurationSeconds ? ` Your ${lastDurationSeconds}s take is still here so you can retry without re-recording.` : ""}
              </AlertDescription>
            </Alert>
          ) : null}

          <PocketSection
            title="Why voice works here"
            description="The creator will hear your tone, conviction, and hesitation, not just a short text reply."
            className="bg-[#fff6ed]"
          >
            <ul className="font-body space-y-2 text-sm leading-6 text-[#5c5146]">
              <li>Keep it to one concrete moment.</li>
              <li>Say what felt confusing, useful, or missing.</li>
              <li>If you can, end with one clear suggestion.</li>
            </ul>
          </PocketSection>
        </PocketActionStack>
      </PocketShell>
    )
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#f3ecdf] px-3 py-4 sm:p-6">
      <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-[1.35rem] border border-[#dbcdb8] bg-[#f9f4ea] p-4 sm:rounded-[2rem] sm:p-6">
        {authStatus === "authenticated" && user?.role === "admin" ? (
          <div className="mb-4">
            <Link href="/admin/dashboard/v4" className="font-body text-sm text-[#8a431f] underline">
              Back to Listen
            </Link>
          </div>
        ) : null}
        <div className="rounded-[1.5rem] border border-[#dbcdb8] bg-[#fff6ed] p-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="inline-flex size-10 items-center justify-center rounded-full border border-[#dbcdb8] bg-[#fffdf8]">
              <AudioWaveform className="size-4 text-[#8a431f]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a431f]">
                {isQrEntry ? "Scan. Speak. Listen." : isSocialEntry ? "Hear. Speak. Join." : "Voice response"}
              </p>
              <p className="font-body mt-2 text-[13px] leading-6 text-[#5c5146] text-pretty sm:text-sm">
                {isQrEntry
                  ? "Give one clear voice response so the creator can hear the real shape of your opinion. If public listening is enabled, you can unlock the player after you submit."
                  : isSocialEntry
                    ? "You came in through a shared release link. Add one clear voice take so the creator can hear your perspective, then join the player if public listening is open."
                    : "Give one clear voice response so the creator can hear the real shape of your opinion. If public listening is enabled, you can unlock the player after you submit."}
              </p>
            </div>
          </div>
        </div>
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

        {publicListeningEnabled ? (
          <div className="mt-4 rounded-2xl border border-[#dbcdb8] bg-[#fff6ed] p-4">
            <div className="mb-3 flex items-center gap-2 text-[#8a431f]">
              <Headphones className="size-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">Responder listening room</p>
            </div>
            <label className="flex items-start gap-3 text-sm text-[#5c5146]">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[#b85e2d]"
                checked={allowPublicOptIn}
                onChange={(event) => setAllowPublicOptIn(event.target.checked)}
              />
              <span>Allow my response to be included anonymously in this release's public listening room after submit.</span>
            </label>
          </div>
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
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a431f]">Step 1</p>
            <p className="mt-2 text-sm font-medium text-[var(--af-color-primary)]">Record</p>
          </div>
          <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a431f]">Step 2</p>
            <p className="mt-2 text-sm font-medium text-[var(--af-color-primary)]">Submit</p>
          </div>
          <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a431f]">Step 3</p>
            <p className="mt-2 text-sm font-medium text-[var(--af-color-primary)]">
              {publicListeningEnabled ? "Listen" : "Done"}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
