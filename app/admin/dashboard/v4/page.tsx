"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRequireAdmin } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowUpRight, Calendar, CheckCircle2, Mic, Target, Trash2 } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import { shouldTrackCreatorRevisitWithin7d } from "@/lib/behavior-metrics"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"
import { AdminMobileNav } from "@/components/admin-mobile-nav"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


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
  userId: string | null
  timestamp: string
  transcript?: {
    id: string
    status: "pending" | "completed" | "failed"
    text: string | null
    provider: string | null
    errorMessage: string | null
  } | null
  insight?: {
    id: string
    summary: string | null
    primaryTheme: string | null
    themes: string[]
    sentiment: string | null
    sentimentScore: number | null
    signalScore: number | null
    quotes: string[]
    provider: string | null
    extractorVersion: string | null
  } | null
}

type DashboardEventItem = {
  id: string
  message: string
  surveyId?: string | null
}

function humanizeDashboardEventMessage(
  event: DashboardEventItem,
  surveyTitleById: Map<string, string>,
): string {
  if (!event.message) return "New activity"
  const bySurveyId = event.surveyId ? surveyTitleById.get(event.surveyId) : null
  if (bySurveyId) {
    return event.message.replace(/for survey [a-z0-9-]+/i, `for ${bySurveyId}`)
  }
  return event.message
}

export default function AdminDashboardV4Page() {
  const router = useRouter()
  const { user, status } = useRequireAdmin()
  const { signOut } = useAuth()
  const [surveys, setSurveys] = useState<SurveyItem[]>([])
  const [responses, setResponses] = useState<ResponseItem[]>([])
  const [timeline, setTimeline] = useState<DashboardEventItem[]>([])
  const [bootLoading, setBootLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deletingSurveyId, setDeletingSurveyId] = useState<string | null>(null)
  const [surveyDeleteDialogId, setSurveyDeleteDialogId] = useState<string | null>(null)
  const [uiMessage, setUiMessage] = useState<string | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return

      let cancelled = false

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
        if (!cancelled) {
          setSurveys(loadedSurveys)
          setTimeline(activityJson.events ?? [])
        }

        trackEvent("response_inbox_opened")
        if (user?.id && shouldTrackCreatorRevisitWithin7d(user.id, "dashboard")) {
          trackEvent("creator_returned_within_7d", { surface: "dashboard" })
        }
        const firstPublished = loadedSurveys.find((survey) => survey.status === "published")
        if (firstPublished?.id) {
          trackEvent("first_response_viewed", { survey_id: firstPublished.id })
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load dashboard.")
        }
      }
    }

    const loadResponses = async () => {
      try {
        const responseRes = await fetch("/api/responses?limit=50", {
          credentials: "include",
          cache: "no-store",
        })
        if (!responseRes.ok) return
        const responseJson = (await responseRes.json()) as { responses?: ResponseItem[] }
        if (!cancelled) {
          setResponses(responseJson.responses ?? [])
        }
      } catch {
        // Non-blocking.
      }
    }

    const loadBoot = async () => {
      setBootLoading(true)
      await Promise.allSettled([loadData(), loadResponses()])
      setBootLoading(false)
    }

    void loadBoot()
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadResponses()
      }
    }, 10000)

    router.prefetch("/admin/questionnaires/v1")
    router.prefetch("/admin/responses")
    router.prefetch("/admin/notifications")
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [status, router, user?.id])

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
  const extractorMetrics = useMemo(() => {
    const withTranscript = responses.filter((item) => item.transcript).length
    const transcriptPending = responses.filter((item) => item.transcript?.status === "pending").length
    const transcriptFailed = responses.filter((item) => item.transcript?.status === "failed").length
    const withInsight = responses.filter((item) => item.insight).length
    return { withTranscript, transcriptPending, transcriptFailed, withInsight }
  }, [responses])
  const groupedThemes = useMemo(() => {
    const counts = new Map<string, number>()
    for (const response of responses) {
      for (const theme of response.insight?.themes ?? []) {
        counts.set(theme, (counts.get(theme) ?? 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [responses])
  const themeCoverage = useMemo(() => {
    const base = extractorMetrics.withInsight || 1
    return groupedThemes.map(([theme, count]) => ({
      theme,
      count,
      coverage: Math.max(1, Math.round((count / base) * 100)),
    }))
  }, [groupedThemes, extractorMetrics.withInsight])
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
  const activeSurveyId = publishedSurveys[0]?.id ?? null
  const onboardingChecklist = useMemo(
    () => [
      {
        id: "first-survey",
        label: "Create your first survey",
        done: surveys.length > 0,
      },
      {
        id: "publish",
        label: "Publish one survey",
        done: publishedSurveys.length > 0,
      },
      {
        id: "first-response",
        label: "Collect one voice response",
        done: responses.length > 0,
      },
    ],
    [surveys.length, publishedSurveys.length, responses.length],
  )
  const surveyTitleById = useMemo(() => new Map(surveys.map((survey) => [survey.id, survey.title])), [surveys])

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
      setSurveyDeleteDialogId(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to delete survey.")
    } finally {
      setDeletingSurveyId(null)
    }
  }

  if (status === "loading" || (status === "authenticated" && bootLoading)) {
    return <SurveyLoadingSkeleton label="Loading signal inbox..." />
  }

  return (
    <main className={`af-shell min-h-dvh p-3 pb-28 sm:p-6 sm:pb-6`}>
      <div className="af-panel af-fade-up mx-auto max-w-7xl rounded-[1.2rem] border p-3 sm:rounded-[2rem] sm:p-6">
        <div className="mb-2 flex justify-end sm:hidden">
          <Button
            variant="outline"
            className="border-[#dbcdb8] bg-[#f3ecdf]"
            onClick={async () => {
              await signOut()
              router.push("/login")
            }}
          >
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#dbcdb8] pb-4">
          <div className="block">
            <p className={`font-body text-sm text-[#5c5146] text-pretty`}>Builder workspace</p>
            <h1 className="text-[clamp(1.55rem,6vw,1.9rem)] font-semibold text-balance">Signal Inbox</h1>
            <p className={`font-body mt-1 text-sm text-[#5c5146] text-pretty`}>Hi {user?.name}, hear clear signal and decide your next product move faster.</p>
            {uiMessage ? <p className={`font-body mt-1 text-sm text-[#5c5146]`}>{uiMessage}</p> : null}
            {loadError ? <p className={`font-body mt-1 text-sm text-[#8a3d2b]`}>{loadError}</p> : null}
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-start sm:self-start">
            <Button
              variant="outline"
              className="hidden border-[#dbcdb8] bg-[#f3ecdf] sm:inline-flex"
              onClick={async () => {
                await signOut()
                router.push("/login")
              }}
            >
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              Sign out
            </Button>
            <a
              href="/admin/questionnaires/v1"
              className="hidden h-10 w-full items-center justify-center rounded-md bg-[#b85e2d] px-4 py-2 text-sm font-medium text-[#fff6ed] transition-colors hover:bg-[#a05227] sm:inline-flex sm:w-auto"
            >
              <Mic className="mr-2 size-4" aria-hidden="true" />
              Create new survey
            </a>
          </div>
        </header>

        <section className="af-accent-card af-fade-up af-delay-1 mt-4 rounded-2xl border p-3 sm:mt-5 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-balance sm:text-lg">First-run checklist</h2>
          </div>
          <ul className="mt-2 grid gap-2 sm:grid-cols-3 sm:mt-3">
            {onboardingChecklist.map((item) => (
              <li key={item.id} className="rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] p-2 sm:p-3">
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-balance sm:gap-2">
                  <CheckCircle2
                    className="size-3.5 sm:size-4"
                    aria-hidden="true"
                  />
                  {item.label}
                </p>
                <p className="font-body mt-0.5 text-xs text-[#5c5146]">{item.done ? "Done" : "Next"}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr_300px]">
          <aside className="order-2 af-accent-card af-fade-up af-delay-1 rounded-2xl border p-4 lg:order-none lg:p-4">
            <h2 className="text-lg font-semibold text-balance">Quick Actions</h2>
            <div className="mt-3 grid gap-2 sm:grid">
              <Link href="/admin/responses" className="inline-flex items-center justify-between rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] px-3 py-2 text-sm hover:bg-[#efe4d3]">
                Moderate queue (response-level)
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/admin/notifications" className="hidden rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] px-3 py-2 text-sm hover:bg-[#efe4d3] sm:block">
                Configure creator notifications
              </Link>
              <Link
                href={activeSurveyId ? `/questionnaire/v1?surveyId=${encodeURIComponent(activeSurveyId)}` : "/admin/questionnaires/v1"}
                className="rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] px-3 py-2 text-sm hover:bg-[#efe4d3]"
              >
                Open respondent flow preview
              </Link>
            </div>

            <div className="my-4 border-t border-[#dbcdb8]" />

            <h2 className="text-lg font-semibold text-balance">Decision KPIs</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-lg font-semibold text-[#261c14]">{publishedRate}%</p>
                <p className="text-xs text-[#5c5146]">Published</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-[#261c14]">{uniqueRespondents}</p>
                <p className="text-xs text-[#5c5146]">Respondents</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-[#261c14]">{ttfrLabel}</p>
                <p className="text-xs text-[#5c5146]">TTFR</p>
              </div>
            </div>
          </aside>

          <section className="order-1 af-accent-card af-fade-up af-delay-1 rounded-2xl border p-3 sm:p-5 lg:order-none">
            <h2 className="text-xl font-semibold text-balance sm:text-2xl">Survey Stack</h2>
            <p className={`font-body mt-1 text-sm text-[#5c5146] text-pretty`}>
              One row per survey. Open a survey to review responses and decide your next change.
            </p>
            <article className="mt-3 rounded-xl border border-[#dbcdb8] bg-[#f3ecdf] p-3 sm:p-4">
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
                <article className="rounded-xl border border-[#dbcdb8] bg-[#f9f4ea] p-3 sm:p-4">
                  <p className="text-sm font-semibold text-balance">No surveys yet</p>
                  <p className={`font-body mt-1 text-sm text-[#5c5146]`}>
                    Start with one decision question and publish your first survey.
                  </p>
                  <ol className={`font-body mt-2 space-y-1 text-sm text-[#5c5146]`}>
                    <li>1. Write one focused prompt.</li>
                    <li>2. Publish.</li>
                    <li>3. Collect and review first responses.</li>
                  </ol>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <a
                      href="/admin/questionnaires/v1"
                      className="inline-flex items-center justify-center rounded-lg bg-[#b85e2d] px-3 py-2 text-sm text-[#fff6ed] transition-colors hover:bg-[#a05227]"
                    >
                      Create first survey
                    </a>
                  </div>
                </article>
              ) : (
                surveys.map((survey) => (
                <article
                  key={survey.id}
                  className="rounded-xl border border-[#dbcdb8] bg-[#f9f4ea] p-3 sm:p-4 cursor-pointer hover:bg-[#f3e7d8]"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (survey.status === "draft") {
                      router.push(`/admin/questionnaires/v1?surveyId=${encodeURIComponent(survey.id)}`)
                      return
                    }
                    trackEvent("response_replayed", { survey_id: survey.id, source: "survey_stack_top_signal" })
                    router.push(`/admin/responses?surveyId=${survey.id}&focus=top-signal`)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      if (survey.status === "draft") {
                        router.push(`/admin/questionnaires/v1?surveyId=${encodeURIComponent(survey.id)}`)
                        return
                      }
                      trackEvent("response_replayed", { survey_id: survey.id, source: "survey_stack_top_signal" })
                      router.push(`/admin/responses?surveyId=${survey.id}&focus=top-signal`)
                    }
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-balance sm:text-lg">{survey.title}</h3>
                    <span className="rounded-full bg-[#e6f0df] px-2 py-0.5 text-xs text-[#2d5a17]">{survey.status}</span>
                  </div>
                  <div className={`font-body mt-2 grid gap-1.5 sm:grid-cols-3 sm:gap-2 text-xs sm:text-sm text-[#5c5146]`}>
                    <p className="inline-flex items-center gap-1 sm:gap-2">
                      <Target className="size-3.5 sm:size-4" aria-hidden="true" />
                      {survey.questionCount} prompts
                    </p>
                    <p className="inline-flex items-center gap-1 sm:gap-2 tabular-nums">
                      <Calendar className="size-3.5 sm:size-4" aria-hidden="true" />
                      <span className="hidden sm:inline">updated </span>{new Date(survey.updatedAt).toLocaleDateString()}
                    </p>
                    <p className="tabular-nums">{responsesBySurvey[survey.id] ?? 0} responses</p>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    {survey.status === "published" ? (
                      <Button
                        variant="outline"
                        className="w-full border-[#dbcdb8] bg-[#fff6ed] sm:w-auto"
                        onClick={async (event) => {
                          event.stopPropagation()
                          if (typeof window === "undefined") return
                          const link = `${window.location.origin}/share/survey/${encodeURIComponent(
                            survey.id,
                          )}?v=${new Date(survey.updatedAt).getTime()}`
                          try {
                            await navigator.clipboard.writeText(link)
                            setUiMessage(`Survey link copied for "${survey.title}".`)
                            trackEvent("share_link_copied", { share_link: link, share_type: "survey_stack_survey" })
                          } catch {
                            setUiMessage("Could not copy survey link. Copy it from the browser address bar.")
                          }
                        }}
                      >
                        Copy survey link
                      </Button>
                    ) : null}
                    {survey.status === "published" && user?.id ? (
                      <Button
                        variant="outline"
                        className="w-full border-[#dbcdb8] bg-[#fff6ed] sm:w-auto"
                        onClick={async (event) => {
                          event.stopPropagation()
                          if (typeof window === "undefined") return
                          const creatorId = user.id
                          const embedLink = `${window.location.origin}/embed/by-creator/${creatorId}/${survey.id}`
                          const iframeSnippet = `<iframe src="${embedLink}" width="100%" height="760" style="border:0;border-radius:16px;" title="Audioform survey"></iframe>`
                          try {
                            await navigator.clipboard.writeText(iframeSnippet)
                            setUiMessage(`Embed code copied for "${survey.title}".`)
                            trackEvent("share_link_copied", {
                              share_link: embedLink,
                              share_type: "survey_stack_embed_iframe",
                            })
                          } catch {
                            setUiMessage("Could not copy iframe code. Please try again.")
                          }
                        }}
                      >
                        Copy iframe code
                      </Button>
                    ) : null}
                    {survey.status === "draft" ? (
                      <Button
                        variant="outline"
                        className="w-full border-[#dbcdb8] bg-[#fff6ed] sm:w-auto"
                        onClick={async (event) => {
                          event.stopPropagation()
                          try {
                            const draftLink = `${window.location.origin}/admin/questionnaires/v1?surveyId=${encodeURIComponent(survey.id)}`
                            await navigator.clipboard.writeText(draftLink)
                            setUiMessage(`Draft link copied for "${survey.title}".`)
                          } catch {
                            setUiMessage("Could not copy draft link. Please copy from the browser address bar.")
                          }
                        }}
                      >
                        Copy draft link
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      className="h-8 w-full border-[#e3c3b5] bg-[#fff0e9] text-[#8a3d2b] hover:bg-[#f7e2d8] sm:h-9 sm:w-auto"
                      disabled={deletingSurveyId === survey.id}
                      onClick={() => setSurveyDeleteDialogId(survey.id)}
                    >
                      <Trash2 className="mr-1 size-3.5 sm:size-4" aria-hidden="true" />
                      <span className="hidden sm:inline">
                        {deletingSurveyId === survey.id ? "Deleting..." : "Delete"}
                      </span>
                    </Button>
                  </div>
                  <p className={`font-body mt-2 text-xs text-[#5c5146] hidden sm:block`}>
                    Clip export/share lives in Moderation Queue after opening the top signal.
                  </p>
                </article>
                ))
              )}
            </div>
          </section>

          <aside className="space-y-4 hidden lg:block">
            <article className="af-accent-card af-fade-up af-delay-2 rounded-2xl border p-4">
              <h2 className="text-lg font-semibold text-balance">Today</h2>
              <p className={`font-body mt-1 text-xs text-[#5c5146]`}>
                Real-time activity feed from survey, response, and reminder events.
              </p>
              <ul className={`font-body mt-3 space-y-2 text-sm text-[#5c5146]`}>
                {timeline.length ? (
                  timeline.map((event) => (
                    <li key={event.id} className="rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] p-3">
                      {humanizeDashboardEventMessage(event, surveyTitleById)}
                    </li>
                  ))
                ) : (
                  <li className="rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] p-3">
                    No activity yet. Publish a survey or collect a response to populate this feed.
                  </li>
                )}
              </ul>
            </article>
          </aside>

          <section className="order-3 space-y-4 lg:hidden">
            <article className="af-accent-card af-fade-up af-delay-2 rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="block">
                  <h2 className="text-lg font-semibold text-balance">Insight Extractor</h2>
                  <p className="font-body mt-1 text-xs text-[#5c5146]">Theme groups and extractor health.</p>
                </div>
                <div className="rounded-full bg-[#f3ecdf] px-2 py-1 text-xs text-[#7a6146]">{extractorMetrics.withInsight} ready</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Metric label="Insights" value={`${extractorMetrics.withInsight}`} />
                <Metric label="Pending" value={`${extractorMetrics.transcriptPending}`} />
              </div>
              <ul className="mt-3 space-y-2 text-sm text-[#5c5146]">
                {themeCoverage.slice(0, 3).map(({ theme, count }) => (
                  <li key={theme} className="flex items-center justify-between rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] px-3 py-2">
                    <span className="capitalize text-[#261c14]">{theme}</span>
                    <span className="text-xs tabular-nums">{count}</span>
                  </li>
                ))}
                {!themeCoverage.length ? (
                  <li className="rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] p-3 text-xs">
                    Run extraction on a few responses to see grouped themes here.
                  </li>
                ) : null}
              </ul>
            </article>
            <article className="af-accent-card af-fade-up af-delay-2 rounded-2xl border p-4">
              <h2 className="text-lg font-semibold text-balance">Today</h2>
              <p className="font-body mt-1 text-xs text-[#5c5146]">Recent survey and response activity.</p>
              <ul className="mt-3 space-y-2 text-sm text-[#5c5146]">
                {timeline.slice(0, 3).map((event) => (
                  <li key={event.id} className="rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] p-3">
                    {humanizeDashboardEventMessage(event, surveyTitleById)}
                  </li>
                ))}
                {!timeline.length ? (
                  <li className="rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] p-3 text-xs">
                    No activity yet. Publish a survey or collect a response to populate this feed.
                  </li>
                ) : null}
              </ul>
            </article>
          </section>
        </section>
      </div>

      <AlertDialog open={!!surveyDeleteDialogId} onOpenChange={(open) => !open && setSurveyDeleteDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete survey?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this survey and its responses permanently? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingSurveyId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#8a3d2b] text-[#fff6ed] hover:bg-[#6f2f21]"
              disabled={!surveyDeleteDialogId || !!deletingSurveyId}
              onClick={() => {
                if (!surveyDeleteDialogId) return
                void handleDeleteSurvey(surveyDeleteDialogId)
              }}
            >
              {deletingSurveyId ? "Deleting..." : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminMobileNav />
    </main>
  )
}

function Metric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="block rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] p-3">
      <p className="text-sm text-[#5c5146]">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {helper ? <p className="mt-1 text-xs text-[#5c5146]">{helper}</p> : null}
    </div>
  )
}

