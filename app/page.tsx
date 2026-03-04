"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Bricolage_Grotesque, Lora } from "next/font/google"
import { Mic, Sparkles, AudioWaveform, ChevronRight } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { trackEvent } from "@/lib/analytics"
import { useAuth } from "@/lib/auth-context"
import { getActiveSurveyId } from "@/lib/behavior-metrics"

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "700"] })
const body = Lora({ subsets: ["latin"], weight: ["400", "500", "600"] })

export default function Home() {
  const { status } = useAuth()
  const prefersReducedMotion = useReducedMotion()
  const [isHydrated, setIsHydrated] = useState(false)
  const signalLoopHref = status === "authenticated" ? "/admin/dashboard/v4" : "/signup"
  const activeSurveyId = status === "authenticated" ? getActiveSurveyId() : null
  const questionnaireHref = activeSurveyId ? `/questionnaire/v1?surveyId=${encodeURIComponent(activeSurveyId)}` : "/questionnaire/v1"

  useEffect(() => {
    trackEvent("creator_onboarding_started")
    trackEvent("decision_intent_prompt_viewed")
    setIsHydrated(true)
  }, [])

  if (!isHydrated) {
    return (
      <main className={`${display.className} min-h-dvh bg-[#f3ecdf] text-[#1f1b17]`}>
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
    <main className={`${display.className} min-h-dvh bg-[#f3ecdf] text-[#1f1b17]`}>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dbcdb8] bg-[#f7efe2] px-4 py-3 sm:rounded-full sm:px-5">
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

        <section className="mt-8 rounded-[1.75rem] border border-[#dbcdb8] bg-[#f9f4ea] p-5 sm:mt-10 sm:rounded-[2.5rem] sm:p-12">
          <p className={`${body.className} text-sm uppercase text-[#5c5146] text-balance`}>High-signal feedback for builders</p>
          <motion.div className="mt-4 max-w-3xl overflow-hidden sm:mt-5">
            <motion.h1
              className={`${display.className} text-3xl font-bold leading-tight text-balance sm:text-6xl`}
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 26, scale: 0.985 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              Feedback is everywhere. Insight is nowhere.
            </motion.h1>
          </motion.div>
          <div className={`${body.className} mt-5 max-w-2xl text-pretty text-base leading-relaxed text-[#5c5146] sm:text-lg`}>
            <motion.p
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: "easeOut", delay: 0.36 }}
            >
              Builders don&apos;t struggle with feedback. They struggle with judgment.
            </motion.p>
            <motion.p
              className="mt-1"
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: "easeOut", delay: 0.44 }}
            >
              We&apos;re building Audioform to help you decide faster in the right direction.
            </motion.p>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {[
              "What are you trying to decide this week?",
              "What signal would give you conviction?",
              "What's missing from the feedback you get today?",
            ].map((line) => (
              <div
                key={line}
                className={`${body.className} flex min-h-20 items-center justify-center rounded-xl border border-[#dbcdb8] bg-[#fff6ed] px-3 py-3 text-center text-sm font-medium leading-snug text-[#5c5146]`}
              >
                {line}
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
            <Link
              href={signalLoopHref}
              onClick={() => trackEvent("creator_clicked_start", { entry_point: "home_open_dashboard" })}
              className="w-full rounded-full bg-[#b85e2d] px-5 py-3 text-center text-sm font-medium text-[#fff6ed] hover:bg-[#a85327] sm:w-auto"
            >
              Start your signal loop
            </Link>
            <Link
              href={questionnaireHref}
              onClick={() => trackEvent("creator_clicked_start", { entry_point: "home_try_voice_survey" })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#dbcdb8] bg-[#fff6ed] px-5 py-3 text-center text-sm font-medium text-[#1f1b17] hover:bg-[#f5ebdd] sm:w-auto sm:justify-start"
            >
              Help us decide what to build next - leave a 30s voice take
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <Mic className="size-5" aria-hidden="true" />,
              title: "Ask better prompts",
              text: "Lead with one decision-focused prompt and collect clearer, higher-conviction responses.",
            },
            {
              icon: <AudioWaveform className="size-5" aria-hidden="true" />,
              title: "Capture conviction",
              text: "Hear confidence, hesitation, and uncertainty that text feedback often flattens.",
            },
            {
              icon: <Sparkles className="size-5" aria-hidden="true" />,
              title: "Ship faster with better signal",
              text: "Run a weekly loop: ship update, collect voice takes, decide next move.",
            },
          ].map((item) => (
            <article key={item.title} className="rounded-3xl border border-[#dbcdb8] bg-[#faf6ee] p-6">
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
