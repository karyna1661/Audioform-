"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Mic, Sparkles, AudioWaveform, ChevronRight } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { trackEvent } from "@/lib/analytics"
import { useAuth } from "@/lib/auth-context"
import { getActiveSurveyId } from "@/lib/behavior-metrics"

export default function Home() {
  const { status } = useAuth()
  const prefersReducedMotion = useReducedMotion()
  const [isHydrated, setIsHydrated] = useState(false)
  const lineOne = "Ask one focused question. Collect voice signal. Decide what to ship next."
  const lineTwo = "Audioform turns short responses into decision-ready signal."
  const [typedLineOne, setTypedLineOne] = useState(prefersReducedMotion ? lineOne : "")
  const [typedLineTwo, setTypedLineTwo] = useState(prefersReducedMotion ? lineTwo : "")
  const signalLoopHref = status === "authenticated" ? "/admin/dashboard/v4" : "/signup"
  
  // Homepage feedback survey - always points to official Audioform feedback survey
  const feedbackSurveyId = process.env.NEXT_PUBLIC_AUDIOFORM_FEEDBACK_SURVEY_ID
  const homepageQuestionnaireHref = feedbackSurveyId
    ? `/questionnaire/v1?surveyId=${encodeURIComponent(feedbackSurveyId)}&t=${Date.now()}`
    : "/questionnaire/v1"
  
  // Admin dashboard preview - points to user's active survey
  const activeSurveyId = status === "authenticated" ? getActiveSurveyId() : null
  const adminPreviewHref = activeSurveyId
    ? `/questionnaire/v1?surveyId=${encodeURIComponent(activeSurveyId)}`
    : "/admin/questionnaires/v1"

  useEffect(() => {
    trackEvent("creator_onboarding_started")
    trackEvent("decision_intent_prompt_viewed")
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) {
      setTypedLineOne(lineOne)
      setTypedLineTwo(lineTwo)
      return
    }

    setTypedLineOne("")
    setTypedLineTwo("")

    let lineOneIndex = 0
    let lineTwoIndex = 0
    let lineTwoTimer: number | null = null

    const lineOneTimer = window.setInterval(() => {
      lineOneIndex += 1
      setTypedLineOne(lineOne.slice(0, lineOneIndex))
      if (lineOneIndex >= lineOne.length) {
        window.clearInterval(lineOneTimer)
        lineTwoTimer = window.setInterval(() => {
          lineTwoIndex += 1
          setTypedLineTwo(lineTwo.slice(0, lineTwoIndex))
          if (lineTwoIndex >= lineTwo.length) {
            if (lineTwoTimer) {
              window.clearInterval(lineTwoTimer)
            }
          }
        }, 18)
      }
    }, 18)

    return () => {
      window.clearInterval(lineOneTimer)
      if (lineTwoTimer) {
        window.clearInterval(lineTwoTimer)
      }
    }
  }, [lineOne, lineTwo, prefersReducedMotion])

  if (!isHydrated) {
    return (
      <main className="min-h-dvh bg-[#f3ecdf] text-[#1f1b17]">
        <div className="mx-auto max-w-6xl animate-pulse px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dbcdb8] bg-[#f7efe2] px-4 py-3 sm:rounded-full sm:px-5">
            <div className="h-6 w-36 rounded bg-[#e9decd]" />
            <div className="flex w-full gap-2 sm:w-auto">
              <div className="h-10 w-full rounded-full bg-[#e9decd] sm:w-24" />
              <div className="h-10 w-full rounded-full bg-[#d9c3a9] sm:w-28" />
            </div>
          </header>

          <section className="mt-8 rounded-[1.75rem] border border-[#dbcdb8] bg-[#f9f4ea] p-5 sm:mt-10 sm:rounded-[2.5rem] sm:p-12">
            <div className="h-4 w-64 rounded bg-[#e9decd]" />
            <div className="mt-4 h-9 rounded-md bg-[#e9decd] sm:h-14" />
            <div className="mt-5 space-y-2">
              <div className="h-5 rounded bg-[#e9decd]" />
              <div className="h-5 w-[92%] rounded bg-[#e9decd]" />
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <div className="h-20 rounded-xl bg-[#e9decd]" />
              <div className="h-20 rounded-xl bg-[#e9decd]" />
              <div className="h-20 rounded-xl bg-[#e9decd]" />
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <div className="h-11 w-full rounded-full bg-[#d9c3a9] sm:w-48" />
              <div className="h-11 w-full rounded-full bg-[#e9decd] sm:w-80" />
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="h-44 rounded-3xl bg-[#e9decd]" />
            <div className="h-44 rounded-3xl bg-[#e9decd]" />
            <div className="h-44 rounded-3xl bg-[#e9decd]" />
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="af-shell min-h-dvh text-[#1f1b17]">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8">
        <header className="af-fade-up flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dbcdb8] bg-[#f7efe2] px-4 py-3 sm:rounded-full sm:px-5">
          <p className="text-sm font-medium uppercase text-balance">AudioForm</p>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Link
              href="/login"
              onClick={() => trackEvent("creator_clicked_start", { entry_point: "home_login" })}
              className="w-full rounded-full border border-[#dbcdb8] px-4 py-2 text-center text-sm hover:bg-[#fff6ed] sm:w-auto"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => trackEvent("creator_clicked_start", { entry_point: "home_start_free" })}
              className="w-full rounded-full bg-[#b85e2d] px-4 py-2 text-center text-sm font-medium text-[#fff6ed] hover:bg-[#a85327] sm:w-auto"
            >
              Start free
            </Link>
          </div>
        </header>

        <section className="af-panel af-fade-up af-delay-1 mt-8 rounded-[1.75rem] border p-5 sm:mt-10 sm:rounded-[2.5rem] sm:p-12">
          <p className="font-body text-sm uppercase text-[#5c5146] text-balance">Decision-ready voice signal for builders</p>
          <motion.div className="mt-4 max-w-3xl overflow-hidden sm:mt-5">
            <motion.h1
              className="font-display text-3xl font-bold leading-tight text-balance sm:text-6xl"
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 26, scale: 0.985 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              Ask one focused question. Hear conviction. Decide your next move.
            </motion.h1>
          </motion.div>
          <div className="font-body mt-5 max-w-2xl text-pretty text-base leading-relaxed text-[#5c5146] sm:text-lg">
            <motion.p
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: "easeOut", delay: 0.36 }}
            >
              {typedLineOne}
            </motion.p>
            <motion.p
              className="mt-1"
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: "easeOut", delay: 0.44 }}
            >
              {typedLineTwo}
            </motion.p>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {[
              "Define the decision you need to make this week.",
              "Collect 30-second takes that reveal conviction and friction.",
            ].map((line) => (
              <div
                key={line}
              className="af-chip af-fade-up af-delay-2 font-body flex min-h-20 items-center justify-center rounded-xl border px-3 py-3 text-center text-sm font-medium leading-snug text-[#5c5146]"
              >
                {line}
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
            <Link
              href={signalLoopHref}
              onClick={() => trackEvent("creator_clicked_start", { entry_point: "home_open_dashboard" })}
              className="af-glow-hover w-full rounded-full bg-[#b85e2d] px-5 py-3 text-center text-sm font-medium text-[#fff6ed] hover:bg-[#a85327] sm:w-auto"
            >
              Create your survey
            </Link>
            <Link
              href={homepageQuestionnaireHref}
              onClick={() => trackEvent("creator_clicked_start", { entry_point: "home_try_voice_survey" })}
              className="af-chip af-glow-hover inline-flex w-full items-center justify-center gap-2 rounded-full border px-5 py-3 text-center text-sm font-medium text-[#1f1b17] hover:bg-[#f5ebdd] sm:w-auto sm:justify-start"
            >
              Preview respondent flow
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <Mic className="size-5" aria-hidden="true" />,
              title: "Frame one decision",
              text: "Start with one product decision and ask prompts that reveal real tension, not polite noise.",
            },
            {
              icon: <AudioWaveform className="size-5" aria-hidden="true" />,
              title: "Capture conviction in voice",
              text: "Hear confidence, hesitation, and friction that text comments usually hide.",
            },
            {
              icon: <Sparkles className="size-5" aria-hidden="true" />,
              title: "Decide what to ship next",
              text: "Replay strongest responses, identify the blocking tension, and commit to the next action.",
            },
          ].map((item) => (
            <article key={item.title} className="af-accent-card af-glow-hover af-fade-up af-delay-3 rounded-3xl border p-6">
              <div className="inline-flex rounded-full border border-[#dbcdb8] p-2 text-[#b85e2d]">{item.icon}</div>
              <h2 className="mt-4 text-xl font-medium text-balance">{item.title}</h2>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-[#5c5146]">{item.text}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
