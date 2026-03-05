"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRequireAdmin } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowUpRight, Bell, Calendar, Mic, Target, Trash2 } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"
import { AdminMobileNav } from "@/components/admin-mobile-nav"


type SurveyItem = {
  id: string
  title: string
  questionCount: number
  status: "draft" | "published"
  updatedAt: string
  publishedAt: string | null
}

type ResponseItem = {
  id: string
  surveyId: string
  userId: string
  timestamp: string
}

type DashboardEventItem = {
  id: string
  message: string
  surveyId?: string | null
}

export default function AdminDashboardV4Page() {
  const router = useRouter()
  const { user, status } = useRequireAdmin()
  const { signOut } = useAuth()
  const [surveys, setSurveys] = useState<SurveyItem[]>([])
  const [responses, setResponses] = useState<ResponseItem[]>([])
  const [timeline, setTimeline] = useState<DashboardEventItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deletingSurveyId, setDeletingSurveyId] = useState<string | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return

    const loadData = async () => {
      try {
        const [surveyRes, activityRes] = await Promise.all([
          fetch("/api/surveys", { credentials: "include", cache: "no-store" }),
          fetch("/api/dashboard/activity", { credentials: "include", cache: "no-store" }),
        ])

        if (!surveyRes.ok || !activityRes.ok) {
          throw new Error("Failed to load dashboard data.")
        }

        const surveyJson = (await surveyRes.json()) as { surveys?: SurveyItem[] }
        const activityJson = (await activityRes.json()) as { events?: DashboardEventItem[] }

        const loadedSurveys = surveyJson.surveys ?? []
        setSurveys(loadedSurveys)
        setTimeline(activityJson.events ?? [])

        trackEvent("response_inbox_opened")
        const firstPublished = loadedSurveys.find((survey) => survey.status === "published")
        if (firstPublished?.id) {
          trackEvent("first_response_viewed", { survey_id: firstPublished.id })
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to load dashboard.")
      }
    }

    const loadResponses = async () => {
      try {
        const responseRes = await fetch("/api/responses?limit=200", {
          credentials: "include",
          cache: "no-store",
        })
        if (!responseRes.ok) return
        const responseJson = (await responseRes.json()) as { responses?: ResponseItem[] }
        setResponses(responseJson.responses ?? [])
      } catch {
        // Non-blocking.
      }
    }

    void loadData()
    void loadResponses()
    router.prefetch("/admin/questionnaires/v1")
    router.prefetch("/admin/responses")
    router.prefetch("/admin/notifications")
  }, [status])

  const responsesBySurvey = useMemo(() => {
    return responses.reduce<Record<string, number>>((acc, item) => {
      acc[item.surveyId] = (acc[item.surveyId] ?? 0) + 1
      return acc
    }, {})
  }, [responses])

  const firstResponseBySurvey = useMemo(() => {
    return responses.reduce<Record<string, number>>((acc, item) => {
      const ts = new Date(item.timestamp).getTime()
      if (!Number.isFinite(ts)) return acc
      if (!acc[item.surveyId] || ts < acc[item.surveyId]) {
        acc[item.surveyId] = ts
      }
      return acc
    }, {})
  }, [responses])

  const uniqueRespondents = useMemo(() => new Set(responses.map((item) => item.userId)).size, [responses])
  const publishedRate = useMemo(() => {
    if (!surveys.length) return 0
    return Math.round((surveys.filter((s) => s.status === "published").length / surveys.length) * 100)
  }, [surveys])

  const ttfrSeconds = useMemo(() => {
    const candidates = surveys
      .filter((survey) => survey.status === "published" && survey.publishedAt)
      .map((survey) => {
        const publishedAtMs = new Date(survey.publishedAt as string).getTime()
        const firstResponseMs = firstResponseBySurvey[survey.id]
        if (!Number.isFinite(publishedAtMs) || !firstResponseMs) return null
        return Math.max(0, Math.round((firstResponseMs - publishedAtMs) / 1000))
      })
      .filter((value): value is number => value !== null)
    if (!candidates.length) return null
    return Math.min(...candidates)
  }, [surveys, firstResponseBySurvey])

  const publishedSurveys = useMemo(
    () => surveys.filter((survey) => survey.status === "published"),
    [surveys],
  )

  const ttfrLabel = useMemo(() => {
    if (ttfrSeconds == null) return "Pending"
    if (ttfrSeconds < 60) return `${ttfrSeconds}s`
    return `${Math.round(ttfrSeconds / 60)}m`
  }, [ttfrSeconds])

  const ttfrTrendLabel = useMemo(() => {
    if (ttfrSeconds == null) return "Awaiting first response"
    return "Based on first response timestamp"
  }, [ttfrSeconds])

  const handleDeleteSurvey = async (surveyId: string) => {
    const confirmed = window.confirm(
      "Delete this survey and its responses permanently? This cannot be undone.",
    )
    if (!confirmed) return

    setDeletingSurveyId(surveyId)
    setLoadError(null)
    try {
      const response = await fetch(`/api/surveys?id=${encodeURIComponent(surveyId)}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) throw new Error("Failed to delete survey.")
      setSurveys((prev) => prev.filter((survey) => survey.id !== surveyId))
      setResponses((prev) => prev.filter((item) => item.surveyId !== surveyId))
      setTimeline((prev) => prev.filter((event) => event.surveyId !== surveyId))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to delete survey.")
    } finally {
      setDeletingSurveyId(null)
    }
  }

  if (status === "loading") {
    return <SurveyLoadingSkeleton label="Loading signal inbox..." />
  }

  return (
    <main className={`min-h-dvh bg-[#f3ecdf] p-4 pb-28 sm:p-6 sm:pb-6`}>
      <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-[#dbcdb8] bg-[#f9f4ea] p-4 sm:rounded-[2rem] sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dbcdb8] pb-4">
          <div>
            <p className={`font-body text-sm text-[#5c5146] text-pretty`}>Builder workspace</p>
            <h1 className="text-3xl font-semibold text-balance">Signal Inbox</h1>
            <p className={`font-body mt-1 text-sm text-[#5c5146] text-pretty`}>Hi {user?.name}, hear clear signal and decide your next product move faster.</p>
            {loadError ? <p className={`font-body mt-1 text-sm text-[#8a3d2b]`}>{loadError}</p> : null}
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Link href="/admin/notifications" aria-label="Open notifications" className="inline-flex sm:hidden">
              <Button variant="outline" size="icon" className="border-[#dbcdb8] bg-[#f3ecdf]">
                <Bell className="size-4" aria-hidden="true" />
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full border-[#dbcdb8] bg-[#f3ecdf] sm:w-auto"
              onClick={async () => {
                await signOut()
                router.push("/login")
              }}
            >
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              Sign out
            </Button>
            <Link href="/admin/questionnaires">
              <Button className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227] sm:w-auto">
                <Mic className="mr-2 size-4" aria-hidden="true" />
                Create new survey
              </Button>
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr_300px]">
          <aside className="rounded-2xl border border-[#dbcdb8] bg-[#f3ecdf] p-4">
            <h2 className="text-xl font-semibold text-balance">Decision KPIs</h2>
            <div className="mt-3 space-y-2">
              <Metric label="Published rate" value={`${publishedRate}%`} />
              <Metric label="Unique respondents" value={`${uniqueRespondents}`} />
              <Metric label="TTFR" value={ttfrLabel} helper={ttfrTrendLabel} />
            </div>
          </aside>

          <section className="rounded-2xl border border-[#dbcdb8] bg-[#fff6ed] p-5">
            <h2 className="text-2xl font-semibold text-balance">Survey Stack</h2>
            <p className={`font-body mt-1 text-sm text-[#5c5146] text-pretty`}>
              One row per survey. Open a survey to review responses and decide your next change.
            </p>
            <article className="mt-4 rounded-xl border border-[#dbcdb8] bg-[#f3ecdf] p-4">
              <p className="text-sm font-semibold text-balance">First Response Spotlight</p>
              <p className={`font-body mt-1 text-sm text-[#5c5146] text-pretty`}>
                {ttfrSeconds == null
                  ? "No first response yet. Share your survey link to get first signal."
                  : `First response arrived in ${ttfrLabel}.`}
              </p>
              <Button
                variant="outline"
                className="mt-3 border-[#dbcdb8] bg-[#fff6ed]"
                onClick={() => {
                  const surveyId = publishedSurveys[0]?.id
                  if (!surveyId) return
                  trackEvent("response_replayed", { survey_id: surveyId, source: "first_response_spotlight" })
                  router.push(`/admin/responses?surveyId=${encodeURIComponent(surveyId)}&focus=first-response`)
                }}
                disabled={!publishedSurveys[0]?.id}
              >
                Replay first response
              </Button>
            </article>
            <div className="mt-4 space-y-3">
                {surveys.length === 0 ? (
                <article className="rounded-xl border border-[#dbcdb8] bg-[#f9f4ea] p-4">
                  <p className="text-sm font-semibold text-balance">No surveys yet</p>
                  <p className={`font-body mt-1 text-sm text-[#5c5146]`}>
                    Start in under 60 seconds: define one decision, pick an intent mode, publish three prompts.
                  </p>
                  <ol className={`font-body mt-3 space-y-1 text-sm text-[#5c5146]`}>
                    <li>1. Define one decision you need to make this week.</li>
                    <li>2. Pick a truth lens: validation, critique, confusion, or emotion.</li>
                    <li>3. Publish and collect your first 5 voice responses.</li>
                  </ol>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Link href="/admin/questionnaires" className="inline-flex items-center justify-center rounded-lg bg-[#b85e2d] px-3 py-2 text-sm text-[#fff6ed] hover:bg-[#a05227]">
                      Create first survey
                    </Link>
                    <Link href="/questionnaire/v1" className="inline-flex items-center justify-center rounded-lg border border-[#dbcdb8] bg-[#fff6ed] px-3 py-2 text-sm hover:bg-[#efe4d3]">
                      Preview respondent flow
                    </Link>
                  </div>
                </article>
              ) : (
                surveys.map((survey) => (
                <article key={survey.id} className="rounded-xl border border-[#dbcdb8] bg-[#f9f4ea] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-balance">{survey.title}</h3>
                    <span className="rounded-full bg-[#e6f0df] px-2 py-1 text-xs text-[#2d5a17]">{survey.status}</span>
                  </div>
                  <div className={`font-body mt-3 grid gap-2 sm:grid-cols-3 text-sm text-[#5c5146]`}>
                    <p className="inline-flex items-center gap-2">
                      <Target className="size-4" aria-hidden="true" />
                      {survey.questionCount} prompts
                    </p>
                    <p className="inline-flex items-center gap-2 tabular-nums">
                      <Calendar className="size-4" aria-hidden="true" />
                      updated {new Date(survey.updatedAt).toLocaleDateString()}
                    </p>
                    <p className="tabular-nums">{responsesBySurvey[survey.id] ?? 0} responses</p>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      className="w-full border-[#dbcdb8] bg-[#fff6ed] sm:w-auto"
                      onClick={() => {
                        trackEvent("response_replayed", { survey_id: survey.id, source: "survey_stack_top_signal" })
                        router.push(`/admin/responses?surveyId=${survey.id}&focus=top-signal`)
                      }}
                    >
                      Open top signal
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-[#dbcdb8] bg-[#fff6ed] sm:w-auto"
                      onClick={() => trackEvent("response_bookmarked", { survey_id: survey.id, bookmark_action: true })}
                    >
                      Save to clip bin
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-[#e3c3b5] bg-[#fff0e9] text-[#8a3d2b] hover:bg-[#f7e2d8] sm:w-auto"
                      disabled={deletingSurveyId === survey.id}
                      onClick={() => void handleDeleteSurvey(survey.id)}
                    >
                      <Trash2 className="mr-2 size-4" aria-hidden="true" />
                      {deletingSurveyId === survey.id ? "Deleting..." : "Delete survey"}
                    </Button>
                  </div>
                  <p className={`font-body mt-2 text-xs text-[#5c5146]`}>
                    Clip export/share lives in Moderation Queue after opening the top signal.
                  </p>
                </article>
                ))
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <article className="rounded-2xl border border-[#dbcdb8] bg-[#f3ecdf] p-4">
              <h2 className="text-lg font-semibold text-balance">Today</h2>
              <p className={`font-body mt-1 text-xs text-[#5c5146]`}>
                Real-time activity feed from survey, response, and reminder events.
              </p>
              <ul className={`font-body mt-3 space-y-2 text-sm text-[#5c5146]`}>
                {timeline.length ? (
                  timeline.map((event) => (
                    <li key={event.id} className="rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] p-3">
                      {event.message}
                    </li>
                  ))
                ) : (
                  <li className="rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] p-3">
                    No activity yet. Publish a survey or collect a response to populate this feed.
                  </li>
                )}
              </ul>
            </article>
            <article className="rounded-2xl border border-[#dbcdb8] bg-[#f3ecdf] p-4">
              <h2 className="text-lg font-semibold text-balance">Quick Actions</h2>
              <div className="mt-3 hidden gap-2 sm:grid">
                <Link href="/admin/responses" className="inline-flex items-center justify-between rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] px-3 py-2 text-sm hover:bg-[#efe4d3]">
                  Moderate queue (response-level)
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
                <Link href="/admin/notifications" className="rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] px-3 py-2 text-sm hover:bg-[#efe4d3]">
                  Configure creator notifications
                </Link>
                <Link href="/questionnaire/v1" className="rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] px-3 py-2 text-sm hover:bg-[#efe4d3]">
                  Open respondent flow preview
                </Link>
              </div>
            </article>
          </aside>
        </section>
      </div>

      <AdminMobileNav />
    </main>
  )
}

function Metric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] p-3">
      <p className="text-sm text-[#5c5146]">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {helper ? <p className="mt-1 text-xs text-[#5c5146]">{helper}</p> : null}
    </div>
  )
}

