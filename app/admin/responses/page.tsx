"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth, useRequireAdmin } from "@/lib/auth-context"
import { ResponseInbox } from "@/components/response-inbox"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AudioWaveform, Filter } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import { AdminMobileNav } from "@/components/admin-mobile-nav"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"

type ResponseWithMetadata = {
  id: string
  surveyId: string
  surveyTitle: string
  questionId: string
   questionText?: string | null
   userId: string | null
  fileName: string
  mimeType: string
  fileSize: number
  durationSeconds?: number | null
  durationBucket?: "short" | "medium" | "deep" | null
  playbackUrl: string
  flagged: boolean
  highSignal: boolean
  bookmarked: boolean
  moderationUpdatedAt: string | null
  timestamp: string
}

export default function AdminResponsesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useRequireAdmin()
  const { signOut } = useAuth()
  const [responses, setResponses] = useState<ResponseWithMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const surveyIdFilter = searchParams.get("surveyId") || undefined
  const focusMode = searchParams.get("focus")

  useEffect(() => {
    if (status !== "authenticated") return

    let cancelled = false
    let hasTrackedOpen = false

    const loadResponses = async () => {
      try {
        const params = new URLSearchParams()
        if (surveyIdFilter) params.set("surveyId", surveyIdFilter)
        params.set("limit", "500")

        const responseRes = await fetch(`/api/responses?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        })

        if (!responseRes.ok) {
          throw new Error("Failed to load responses.")
        }

        const json = await responseRes.json()
        if (!cancelled) {
          setResponses(json.responses || [])
          setError(null)
        }

        if (!hasTrackedOpen) {
          hasTrackedOpen = true
          trackEvent("response_inbox_opened", {
            survey_id: surveyIdFilter,
            focus: focusMode,
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load responses.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadResponses()
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadResponses()
      }
    }, 10000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [status, surveyIdFilter, focusMode])

  const handlePlayResponse = (responseId: string) => {
    // In a real implementation, this would play the audio
    console.log("Playing response:", responseId)
    trackEvent("response_replayed", { response_id: responseId })
  }

  const handleFlagResponse = async (responseId: string, flagged: boolean) => {
    try {
      const response = await fetch(`/api/responses/${responseId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ flagged }),
      })

      if (response.ok) {
        setResponses((prev) =>
          prev.map((r) => (r.id === responseId ? { ...r, flagged } : r))
        )
        trackEvent("response_moderated", {
          response_id: responseId,
          action: flagged ? "flagged" : "unflagged",
        })
      }
    } catch (err) {
      console.error("Failed to flag response:", err)
    }
  }

  const handleMarkHighSignal = async (responseId: string, highSignal: boolean) => {
    try {
      const response = await fetch(`/api/responses/${responseId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ highSignal }),
      })

      if (response.ok) {
        setResponses((prev) =>
          prev.map((r) => (r.id === responseId ? { ...r, highSignal } : r))
        )
        trackEvent("response_bookmarked", {
          response_id: responseId,
          action: highSignal ? "high_signal" : "normal",
        })
      }
    } catch (err) {
      console.error("Failed to mark high signal:", err)
    }
  }

  const handleBookmarkResponse = async (responseId: string, bookmarked: boolean) => {
    try {
      const response = await fetch(`/api/responses/${responseId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bookmarked }),
      })

      if (response.ok) {
        setResponses((prev) =>
          prev.map((r) => (r.id === responseId ? { ...r, bookmarked } : r))
        )
        trackEvent("response_bookmarked", {
          response_id: responseId,
          action: bookmarked ? "bookmarked" : "unbookmarked",
        })
      }
    } catch (err) {
      console.error("Failed to bookmark response:", err)
    }
  }

  if (status === "loading" || loading) {
    return <SurveyLoadingSkeleton label="Loading responses..." />
  }

  return (
    <main className={`af-shell min-h-dvh p-4 pb-28 sm:p-6 sm:pb-6`}>
      <div className="af-panel af-fade-up mx-auto max-w-7xl rounded-[1.5rem] border p-4 sm:rounded-[2rem] sm:p-6">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#dbcdb8] pb-4">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className={`font-body text-sm text-[#5c5146] text-pretty`}>
                Signal Inbox
              </p>
              <h1 className="text-3xl font-semibold text-balance">
                All Responses
              </h1>
              {surveyIdFilter ? (
                <p className={`font-body mt-1 text-sm text-[#5c5146]`}>
                  Filtering by survey
                </p>
              ) : (
                <p className={`font-body mt-1 text-sm text-[#5c5146]`}>
                  {responses.length} total responses across all surveys
                </p>
              )}
              {error ? (
                <p className={`font-body mt-1 text-sm text-[#8a3d2b]`}>{error}</p>
              ) : null}
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-start sm:self-start">
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
          </div>
        </header>

        {/* Quick Stats */}
        <section className="af-accent-card af-fade-up af-delay-1 mt-5 rounded-2xl border p-4">
          <div className="flex items-center gap-3">
            <AudioWaveform className="h-6 w-6 text-[#b85e2d]" />
            <div>
              <h2 className="text-lg font-semibold">Response Overview</h2>
              <p className="font-body text-sm text-[#5c5146]">
                {responses.filter(r => r.durationBucket === "deep").length} deep responses (
                {responses.length > 0 
                  ? Math.round((responses.filter(r => r.durationBucket === "deep").length / responses.length) * 100) 
                  : 0}%
                )
              </p>
            </div>
          </div>
        </section>

        {/* Response Inbox */}
        <section className="af-fade-up af-delay-2 mt-6">
          <ResponseInbox
            responses={responses}
            onPlayResponse={handlePlayResponse}
            onFlagResponse={handleFlagResponse}
            onMarkHighSignal={handleMarkHighSignal}
            onBookmarkResponse={handleBookmarkResponse}
          />
        </section>
      </div>
    </main>
  )
}
