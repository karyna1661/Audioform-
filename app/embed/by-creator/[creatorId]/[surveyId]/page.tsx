"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Bricolage_Grotesque, Lora } from "next/font/google"
import { AudioRecorder } from "@/components/audio-recorder"
import { useMobile } from "@/hooks/use-mobile"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "700"] })
const body = Lora({ subsets: ["latin"], weight: ["400", "500", "600"] })

type PublicSurvey = {
  id: string
  creatorId: string
  title: string
  decisionFocus: string | null
  intent: string | null
  templatePack?: string | null
  questionCount: number
  questions?: string[]
}

type PromptItem = { id: string; text: string }

function buildPrompts(survey: PublicSurvey): PromptItem[] {
  if (!Array.isArray(survey.questions) || survey.questions.length === 0) return []
  return survey.questions.slice(0, 8).map((text, index) => ({ id: `q${index + 1}`, text }))
}

export default function CreatorScopedEmbedPage() {
  const params = useParams<{ creatorId: string; surveyId: string }>()
  const creatorId = params.creatorId
  const surveyId = params.surveyId
  const isMobile = useMobile()

  const [survey, setSurvey] = useState<PublicSurvey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    const loadSurvey = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/surveys/public/by-creator/${encodeURIComponent(creatorId)}/${encodeURIComponent(surveyId)}`,
          { cache: "no-store" },
        )
        if (!response.ok) throw new Error("Survey is unavailable.")
        const json = (await response.json()) as { survey?: PublicSurvey }
        if (!json.survey) throw new Error("Survey payload is missing.")
        setSurvey(json.survey)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load survey.")
      } finally {
        setLoading(false)
      }
    }
    loadSurvey()
  }, [creatorId, surveyId])

  const prompts = useMemo(() => (survey ? buildPrompts(survey) : []), [survey])
  const currentPrompt = prompts[index]

  const onSubmit = async (blob: Blob) => {
    if (!currentPrompt) return
    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("audio", blob, `${currentPrompt.id}.webm`)
      formData.append("questionId", currentPrompt.id)
      formData.append("surveyId", surveyId)
      const response = await fetch("/api/responses", { method: "POST", body: formData })
      if (!response.ok) throw new Error("Failed to submit your voice take.")
      const nextSubmitted = submittedCount + 1
      setSubmittedCount(nextSubmitted)
      if (index < prompts.length - 1) setIndex((prev) => prev + 1)
      else setIsDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit your voice take.")
    } finally {
      setIsUploading(false)
    }
  }

  if (loading) return <SurveyLoadingSkeleton />
  if (error || !survey) return <main className={`${display.className} min-h-dvh bg-[#f3ecdf] p-4`}>Survey unavailable</main>
  if (!prompts.length) {
    return (
      <main className={`${display.className} min-h-dvh bg-[#f3ecdf] p-4`}>
        <section className="mx-auto max-w-2xl rounded-3xl border border-[#dbcdb8] bg-[#f9f4ea] p-6">
          <p className="text-lg font-semibold">Survey unavailable</p>
          <p className={`${body.className} mt-2 text-sm text-[#5c5146]`}>
            This survey has no published prompts yet. Ask the creator to publish it again.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className={`${display.className} min-h-dvh bg-[#f3ecdf] p-4`}>
      <section className="mx-auto max-w-2xl rounded-3xl border border-[#dbcdb8] bg-[#f9f4ea] p-6">
        <p className={`${body.className} text-xs uppercase tracking-wide text-[#5c5146]`}>Embedded voice survey</p>
        <h1 className="mt-2 text-3xl font-semibold text-balance">{survey.title}</h1>
        <p className={`${body.className} mt-2 text-sm text-[#5c5146]`}>
          Help us decide what to build next. Leave a 30-second voice take.
        </p>

        <div className="mt-4 h-2 rounded-full bg-[#e8dcc9]">
          <div className="h-2 rounded-full bg-[#b85e2d]" style={{ width: `${prompts.length ? Math.round((submittedCount / prompts.length) * 100) : 0}%` }} />
        </div>

        {isDone ? (
          <div className="mt-6 rounded-2xl border border-[#dbcdb8] bg-[#fff6ed] p-5">
            <p className="text-lg font-semibold">Voice take received.</p>
            <p className={`${body.className} mt-1 text-sm text-[#5c5146]`}>Thanks for helping shape what ships next.</p>
          </div>
        ) : (
          <>
            <h2 className="mt-6 text-2xl font-semibold text-balance">{currentPrompt?.text}</h2>
            <p className={`${body.className} mt-2 text-sm text-[#5c5146]`}>
              Prompt {index + 1} of {prompts.length}. Keep it concrete and specific.
            </p>
            <div className="mt-4 rounded-2xl border border-[#dbcdb8] bg-[#fff6ed] p-4">
              <AudioRecorder onSubmit={onSubmit} questionId={currentPrompt?.id || "q1"} isMobile={isMobile} isUploading={isUploading} />
            </div>
          </>
        )}

        <p className={`${body.className} mt-6 text-center text-xs text-[#5c5146]`}>
          Powered by{" "}
          <Link href="/" className="font-semibold underline">
            Audioform
          </Link>
        </p>
      </section>
    </main>
  )
}
