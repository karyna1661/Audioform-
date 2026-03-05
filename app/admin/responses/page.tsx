"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Bricolage_Grotesque, Lora } from "next/font/google"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Flag, Mic, Play, Trash2 } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import { useRequireAdmin } from "@/lib/auth-context"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "700"] })
const body = Lora({ subsets: ["latin"], weight: ["400", "500", "600"] })

type ResponseItem = {
  id: string
  surveyId: string
  questionId: string
  userId: string
  fileSize: number
  flagged: boolean
  highSignal: boolean
  bookmarked: boolean
  publicUrl?: string
  playbackUrl?: string
  timestamp: string
}

export default function AdminResponsesPage() {
  const { status } = useRequireAdmin()
  const searchParams = useSearchParams()
  const surveyId = searchParams.get("surveyId")
  const focus = searchParams.get("focus")
  const [queue, setQueue] = useState<ResponseItem[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return

    const loadQueue = async () => {
      try {
        const query = surveyId ? `?surveyId=${encodeURIComponent(surveyId)}` : ""
        const response = await fetch(`/api/responses${query}`, {
          credentials: "include",
          cache: "no-store",
        })
        if (!response.ok) {
          throw new Error("Failed to load moderation queue.")
        }
        const json = (await response.json()) as { responses?: ResponseItem[] }
        const sorted = [...(json.responses ?? [])].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        setQueue(sorted)
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to load moderation queue.")
      }
    }

    loadQueue()
  }, [status, surveyId])

  const queueView = useMemo(() => {
    return queue.map((item) => ({
      ...item,
      duration: `${Math.max(1, Math.round(item.fileSize / 32000))}s est`,
      reason: `Question ${item.questionId} | ${new Date(item.timestamp).toLocaleString()}`,
    }))
  }, [queue])

  const updateModeration = async (
    item: ResponseItem,
    patch: Partial<Pick<ResponseItem, "flagged" | "highSignal" | "bookmarked">>,
  ) => {
    setSavingId(item.id)
    setLoadError(null)

    try {
      const response = await fetch("/api/responses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: item.id, ...patch }),
      })
      if (!response.ok) throw new Error("Failed to update moderation state.")

      setQueue((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, ...patch } : entry)))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to update moderation state.")
    } finally {
      setSavingId(null)
    }
  }

  const handleExportClip = async (item: (typeof queueView)[number]) => {
    const clipNote = `${item.surveyId} | ${item.duration} | ${item.reason}`
    try {
      await navigator.clipboard.writeText(clipNote)
      trackEvent("response_bookmarked", {
        survey_id: item.surveyId ?? surveyId ?? "unknown-survey",
        bookmark_action: true,
        source: "moderation_clip_export",
      })
      await updateModeration(item, { bookmarked: true })
    } catch {
      trackEvent("response_bookmarked", {
        survey_id: surveyId ?? "unknown-survey",
        bookmark_action: false,
        source: "moderation_clip_export_failed",
      })
    }
  }

  const handleDeleteResponse = async (id: string) => {
    const confirmed = window.confirm("Delete this response permanently? This cannot be undone.")
    if (!confirmed) return

    setDeletingId(id)
    setLoadError(null)
    try {
      const response = await fetch(`/api/responses?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) throw new Error("Failed to delete response.")
      setQueue((prev) => prev.filter((item) => item.id !== id))
      if (playingId === id) setPlayingId(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to delete response.")
    } finally {
      setDeletingId(null)
    }
  }

  if (status === "loading") {
    return <SurveyLoadingSkeleton label="Loading moderation queue..." />
  }

  return (
    <main className={`${display.className} min-h-dvh bg-[#f3ecdf] p-4 sm:p-6`}>
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-[#dbcdb8] bg-[#f9f4ea] p-5 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dbcdb8] pb-4">
          <div>
            <p className={`${body.className} text-sm text-[#5c5146]`}>Moderation Queue</p>
            <h1 className="text-3xl font-semibold text-balance">Review Voice Responses</h1>
            <p className={`${body.className} mt-1 text-sm text-[#5c5146]`}>
              Response-level queue for triage and review. Survey Stack in dashboard stays survey-level.
            </p>
            {loadError ? <p className={`${body.className} mt-1 text-sm text-[#8a3d2b]`}>{loadError}</p> : null}
            {surveyId ? (
              <p className={`${body.className} mt-1 text-xs text-[#5c5146]`}>
                Focused from Survey Stack: survey {surveyId} {focus ? `(${focus})` : ""}.
              </p>
            ) : null}
          </div>
          <Link href="/admin/dashboard/v4">
            <Button variant="outline" className="border-[#dbcdb8] bg-[#f3ecdf]">
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              Back to dashboard
            </Button>
          </Link>
        </header>

        <div className="mt-5 space-y-3">
          {queue.length === 0 ? (
            <article className="rounded-xl border border-[#dbcdb8] bg-[#fff6ed] p-4">
              <p className="text-sm font-semibold text-balance">Queue is clear</p>
              <p className={`${body.className} mt-1 text-sm text-[#5c5146]`}>
                No responses need triage right now. Share your survey to collect more signal.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/admin/questionnaires"
                  className="rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] px-3 py-2 text-sm hover:bg-[#efe4d3]"
                >
                  Create survey
                </Link>
                <Link
                  href="/admin/dashboard/v4"
                  className="rounded-lg border border-[#dbcdb8] bg-[#f9f4ea] px-3 py-2 text-sm hover:bg-[#efe4d3]"
                >
                  Return to dashboard
                </Link>
              </div>
            </article>
          ) : (
            queueView.map((item) => (
              <article key={item.id} className="rounded-xl border border-[#dbcdb8] bg-[#fff6ed] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-balance">{item.surveyId}</p>
                  <p className={`${body.className} text-sm text-[#5c5146]`}>{item.duration}</p>
                </div>
                <p className={`${body.className} mt-2 text-sm text-[#5c5146]`}>{item.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="border-[#dbcdb8] bg-[#f9f4ea]"
                    disabled={!item.playbackUrl}
                    onClick={() => setPlayingId((prev) => (prev === item.id ? null : item.id))}
                  >
                    <Play className="mr-2 size-4" aria-hidden="true" />
                    {playingId === item.id ? "Hide player" : "Replay clip"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#dbcdb8] bg-[#f9f4ea]"
                    disabled={savingId === item.id}
                    onClick={() => updateModeration(item, { flagged: !item.flagged })}
                  >
                    <Flag className="mr-2 size-4" aria-hidden="true" />
                    {item.flagged ? "Unflag" : "Flag for follow-up"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#dbcdb8] bg-[#f9f4ea]"
                    disabled={savingId === item.id}
                    onClick={() => updateModeration(item, { highSignal: !item.highSignal })}
                  >
                    <Mic className="mr-2 size-4" aria-hidden="true" />
                    {item.highSignal ? "Remove high signal" : "Mark high signal"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#dbcdb8] bg-[#f9f4ea]"
                    disabled={savingId === item.id}
                    onClick={() => handleExportClip(item)}
                  >
                    Export share clip note
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#e3c3b5] bg-[#fff0e9] text-[#8a3d2b] hover:bg-[#f7e2d8]"
                    disabled={deletingId === item.id}
                    onClick={() => handleDeleteResponse(item.id)}
                  >
                    <Trash2 className="mr-2 size-4" aria-hidden="true" />
                    {deletingId === item.id ? "Deleting..." : "Delete response"}
                  </Button>
                </div>
                {playingId === item.id && item.playbackUrl ? (
                  <audio
                    className="mt-3 w-full"
                    controls
                    preload="none"
                    src={item.playbackUrl}
                  />
                ) : null}
                <p className={`${body.className} mt-2 text-xs text-[#5c5146]`}>
                  Status: {item.flagged ? "Flagged" : "Clear"} | {item.highSignal ? "High signal" : "Normal"} |{" "}
                  {item.bookmarked ? "Bookmarked" : "Not bookmarked"}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
