"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Mic, Sparkles, AudioWaveform, ChevronRight } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { trackEvent } from "@/lib/analytics"
import { useAuth } from "@/lib/auth-context"
import { getActiveSurveyId } from "@/lib/behavior-metrics"
import { buildSurveySharePath, isUuidLike } from "@/lib/share-links"

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
  const homepageQuestionnaireHref = isUuidLike(feedbackSurveyId)
    ? buildSurveySharePath(feedbackSurveyId)
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
    <main className="af-shell af-noise-wrap min-h-dvh text-[#1f1b17]">
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

        <section className="af-panel af-sprinkle af-fade-up af-delay-1 mt-8 rounded-[1.75rem] border p-4 sm:mt-10 sm:rounded-[2.5rem] sm:p-12">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-2">
            <div className="lg:pr-8 xl:pr-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dbcdb8] bg-[#fff7ee] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a5a33]">
                <span className="inline-block size-2 rounded-full bg-[#4e9c63]" />
                Decision-ready voice signal
              </div>
              <motion.h1
                className="mt-4 max-w-2xl font-display text-[2.15rem] font-bold leading-[0.94] tracking-[-0.035em] text-balance sm:mt-6 sm:text-[3.7rem]"
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 26, scale: 0.985 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                Collect answers people can actually feel.
              </motion.h1>
              <div className="mt-5 max-w-xl border-l-2 border-[#e3c3a5] pl-4 sm:mt-7 sm:pl-5">
                <p className="font-body text-sm uppercase tracking-[0.12em] text-[#8a5a33]">
                  For builders
                </p>
                <div className="block font-body mt-3 text-pretty text-[0.98rem] leading-relaxed text-[#5c5146] sm:text-lg">
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
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
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
            </div>
            <motion.aside
              initial={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
              transition={{ duration: 0.36, ease: "easeOut", delay: 0.24 }}
              className="order-first -mx-1 self-start sm:order-none sm:mx-0 lg:mt-12"
            >
              <div className="af-noise-wrap af-sprinkle-soft rounded-[1.5rem] bg-[linear-gradient(165deg,rgba(255,250,244,0.75)_0%,rgba(247,236,221,0.62)_100%)] p-0 shadow-none sm:rounded-[1.9rem] sm:border sm:border-[#d7c0a4] sm:p-4 sm:shadow-[0_18px_45px_rgba(86,57,25,0.08)] lg:p-5">
                <div className="rounded-[1.35rem] bg-transparent px-0 py-0 sm:rounded-[1.55rem] sm:border sm:border-[#eadbc7] sm:bg-[#fffdf9] sm:px-4 sm:py-4 lg:px-5">
                  <div className="hidden items-center justify-between gap-3 border-b border-[#eee1cf] pb-3 sm:flex">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8f6438]">Voice room view</p>
                      <p className="mt-1 text-xs text-[#7a6146]">Conversation, signal, and synthesis in one frame.</p>
                    </div>
                    <div className="rounded-full border border-[#e2d2bc] bg-[#fff8ef] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[#9a7857]">
                      live concept
                    </div>
                  </div>

                  <div className="af-noise-wrap mt-0 overflow-hidden rounded-[1.35rem] border border-[#eadfce] bg-[radial-gradient(circle_at_top,rgba(238,246,255,0.82),transparent_58%),linear-gradient(180deg,#fffdf9_0%,#f9f4ea_100%)] sm:mt-4 sm:rounded-[1.25rem] sm:border-[#f0e5d6] lg:mt-5">
                    <Image
                      src="/homepage-collab-hero.png"
                      alt="Illustration of people sharing voice notes and insights around a waveform"
                      width={1152}
                      height={768}
                      className="h-auto w-full scale-[1.02] object-contain sm:scale-[1.06] lg:scale-[1.12]"
                      priority
                    />
                  </div>
                </div>
              </div>
            </motion.aside>
          </div>

          <div className="mt-5 grid gap-2 sm:mt-7 sm:grid-cols-2">
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
