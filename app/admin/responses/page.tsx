"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useRequireAdmin } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AudioWaveform, Bookmark, ChevronDown, ChevronUp, Filter, Flag, Radio, Star } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import { shouldTrackCreatorRevisitWithin7d } from "@/lib/behavior-metrics"
import { AdminMobileNav } from "@/components/admin-mobile-nav"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"
import { useIsMobile } from "@/components/ui/use-mobile"
import { PocketActionStack, PocketSection, PocketShell } from "@/components/mobile/pocket-shell"
import { AudioSequencePlayer, type ListeningTrack } from "@/components/listen/audio-sequence-player"
import { ReleaseTakeDeck } from "@/components/release-take-deck"

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
  publicPlaylistEligible?: boolean
  listening?: {
    rank: number
    hotTake: string
    momentumTags: string[]
    previewClipRange?: { startSeconds: number; endSeconds: number } | null
    collectionMembership?: string[]
    epInclusion?: boolean
  }
  moderationUpdatedAt: string | null
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

function buildListeningTrack(response: ResponseWithMetadata): ListeningTrack {
  return {
    id: response.id,
    title: response.surveyTitle,
    subtitle: response.questionText || `Question ${response.questionId.toUpperCase()}`,
    playbackUrl: response.playbackUrl,
    durationSeconds: response.durationSeconds,
    transcript: response.transcript?.text ?? null,
    listening: {
      rank: response.listening?.rank ?? response.insight?.signalScore ?? 50,
      hotTake: response.listening?.hotTake ?? response.insight?.primaryTheme ?? "Ranked voice take ready for review.",
      momentumTags: response.listening?.momentumTags ?? [],
      previewClipRange: response.listening?.previewClipRange ?? null,
    },
  }
}

export default function AdminResponsesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status, user } = useRequireAdmin()
  const isMobile = useIsMobile()
  const [responses, setResponses] = useState<ResponseWithMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [extractingInsightId, setExtractingInsightId] = useState<string | null>(null)
  
  const surveyIdFilter = searchParams.get("surveyId") || undefined
  const selectedResponseId = searchParams.get("responseId") || undefined
  const focusMode = searchParams.get("focus")
  const hasPendingExtraction = responses.some((response) => !response.insight && response.transcript?.status === "pending")
  const selectedResponse = selectedResponseId
    ? responses.find((response) => response.id === selectedResponseId) ?? null
    : null
  const [sortMode, setSortMode] = useState<"best" | "newest">("best")
  const [isReleasePlayerCollapsed, setIsReleasePlayerCollapsed] = useState(false)

  useEffect(() => {
    setIsReleasePlayerCollapsed(false)
  }, [surveyIdFilter])

  const rankedResponses = useMemo(() => {
    return responses.slice().sort((a, b) => {
      if (sortMode === "newest") {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      }
      return (b.listening?.rank ?? b.insight?.signalScore ?? 0) - (a.listening?.rank ?? a.insight?.signalScore ?? 0)
    })
  }, [responses, sortMode])

  const releaseTracks = useMemo(() => rankedResponses.map(buildListeningTrack), [rankedResponses])
  const featuredTracks = useMemo(() => releaseTracks.slice(0, 5), [releaseTracks])
  const releaseGroups = useMemo(() => {
    const grouped = new Map<string, { surveyId: string; surveyTitle: string; takes: ResponseWithMetadata[] }>()
    for (const response of rankedResponses) {
      const existing = grouped.get(response.surveyId)
      if (existing) {
        existing.takes.push(response)
      } else {
        grouped.set(response.surveyId, {
          surveyId: response.surveyId,
          surveyTitle: response.surveyTitle,
          takes: [response],
        })
      }
    }

    return Array.from(grouped.values()).map((group) => ({
      ...group,
      topTake: group.takes[0] ?? null,
      deepCount: group.takes.filter((item) => item.durationBucket === "deep").length,
    }))
  }, [rankedResponses])

  const crossReleaseStats = useMemo(
    () => ({
      totalTakes: responses.length,
      totalReleases: releaseGroups.length,
      highSignal: responses.filter((response) => response.highSignal).length,
      deepTakes: responses.filter((response) => response.durationBucket === "deep").length,
    }),
    [responses, releaseGroups],
  )

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
          throw new Error("Failed to load release takes.")
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
          if (user?.id && shouldTrackCreatorRevisitWithin7d(user.id, "responses")) {
            trackEvent("creator_returned_within_7d", { surface: "responses" })
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load release takes.")
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
    }, hasPendingExtraction || extractingInsightId ? 4000 : 10000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [status, surveyIdFilter, focusMode, user?.id, hasPendingExtraction, extractingInsightId])

  const handlePlayResponse = (responseId: string) => {
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

  const handleExtractInsight = async (responseId: string) => {
    try {
      setExtractingInsightId(responseId)
      const response = await fetch(`/api/responses/${responseId}/extract-insight`, {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error || "Failed to enqueue insight extraction.")
      }

      setResponses((prev) =>
        prev.map((item) =>
          item.id === responseId
            ? {
                ...item,
                transcript: item.transcript ?? {
                  id: `pending-${responseId}`,
                  status: "pending",
                  text: null,
                  provider: "openai",
                  errorMessage: null,
                },
              }
            : item,
        ),
      )

      trackEvent("response_bookmarked", {
        response_id: responseId,
        action: "extract_insight",
      })
    } catch (err) {
      console.error("Failed to extract insight:", err)
      setError(err instanceof Error ? err.message : "Failed to extract insight.")
    } finally {
      setExtractingInsightId(null)
    }
  }

  if (status === "loading" || loading) {
    return <SurveyLoadingSkeleton label="Loading release takes..." />
  }

  const handleTogglePublicPlaylist = async (responseId: string, publicPlaylistEligible: boolean) => {
    try {
      const response = await fetch(`/api/responses/${responseId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ publicPlaylistEligible }),
      })

      if (response.ok) {
        setResponses((prev) =>
          prev.map((r) => (r.id === responseId ? { ...r, publicPlaylistEligible } : r))
        )
      }
    } catch (err) {
      console.error("Failed to toggle public playlist:", err)
    }
  }

  if (isMobile) {
    const deepResponses = responses.filter((response) => response.durationBucket === "deep").length
    const flaggedResponses = responses.filter((response) => response.flagged).length
    const bookmarkedResponses = responses.filter((response) => response.bookmarked || response.highSignal).length

    const closeResponseDetail = () => {
      const params = new URLSearchParams()
      if (surveyIdFilter) params.set("surveyId", surveyIdFilter)
      if (focusMode) params.set("focus", focusMode)
      const query = params.toString()
      router.push(query ? `/admin/responses?${query}` : "/admin/responses")
    }

    if (selectedResponse) {
      return (
        <>
          <PocketShell
            eyebrow="Signal detail"
            title={selectedResponse.surveyTitle}
            description={selectedResponse.questionText || `Question ${selectedResponse.questionId.toUpperCase()}`}
          >
            <PocketSection
              title="Take overview"
              description={`${selectedResponse.durationSeconds ? `${Math.round(selectedResponse.durationSeconds)} second` : "Voice"} take recorded on ${new Date(selectedResponse.timestamp).toLocaleDateString()}.`}
              className="bg-[#fff6ed]"
            >
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf4] px-3 py-3">
                  <p className="text-lg font-semibold text-[var(--af-color-primary)]">
                    {selectedResponse.highSignal ? "Yes" : "No"}
                  </p>
                  <p className="font-body text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Signal</p>
                </div>
                <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf4] px-3 py-3">
                  <p className="text-lg font-semibold text-[var(--af-color-primary)]">
                    {selectedResponse.bookmarked ? "Saved" : "Open"}
                  </p>
                  <p className="font-body text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Status</p>
                </div>
                <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf4] px-3 py-3">
                  <p className="text-lg font-semibold text-[var(--af-color-primary)]">
                    {selectedResponse.flagged ? "Flagged" : "Clean"}
                  </p>
                  <p className="font-body text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Moderation</p>
                </div>
              </div>
            </PocketSection>

            <PocketSection title="Listen back" description="Review the raw voice take before acting." className="mt-4">
              <audio
                controls
                preload="none"
                className="w-full"
                src={selectedResponse.playbackUrl}
                onPlay={() => handlePlayResponse(selectedResponse.id)}
              >
                Your browser does not support audio playback.
              </audio>
            </PocketSection>

            {selectedResponse.transcript ? (
              <PocketSection
                title="Transcript"
                description={selectedResponse.transcript.status === "completed" ? "Read the spoken answer in text form." : "Transcription is still processing."}
                className="mt-4"
              >
                <p className="text-sm leading-6 text-[var(--af-color-primary)]">
                  {selectedResponse.transcript.text || selectedResponse.transcript.errorMessage || "Processing transcript..."}
                </p>
              </PocketSection>
            ) : null}

            <PocketSection
              title="Signal summary"
              description={selectedResponse.insight ? "Use the AI summary as a shortcut, not a substitute for listening." : "Extract an AI summary when you want a faster triage read."}
              className="mt-4"
            >
              {selectedResponse.insight ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {selectedResponse.insight.primaryTheme ? (
                      <span className="rounded-full border border-[#cfbea4] bg-[#fff6ed] px-3 py-1 text-[#7a6146]">
                        {selectedResponse.insight.primaryTheme}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-[#cfbea4] bg-[#fff6ed] px-3 py-1 text-[#7a6146]">
                      {selectedResponse.insight.signalScore ?? "-"} / 100
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-[var(--af-color-primary)]">
                    {selectedResponse.insight.summary || "No summary was generated for this take."}
                  </p>
                  {selectedResponse.insight.quotes?.[0] ? (
                    <blockquote className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf4] px-4 py-3 text-sm italic text-[#5c5146]">
                      "{selectedResponse.insight.quotes[0]}"
                    </blockquote>
                  ) : null}
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-[#dbcdb8] bg-[#fffdf8]"
                  disabled={extractingInsightId === selectedResponse.id}
                  onClick={() => void handleExtractInsight(selectedResponse.id)}
                >
                  {extractingInsightId === selectedResponse.id ? "Extracting..." : "Generate AI summary"}
                </Button>
              )}
            </PocketSection>

            <PocketSection title="Actions" description="Classify this take while the context is fresh." className="mt-4 bg-[#fff6ed]">
              <PocketActionStack>
                <Button
                  variant={selectedResponse.highSignal ? "default" : "outline"}
                  className={selectedResponse.highSignal ? "w-full bg-[#2d5a17] text-[#fff6ed] hover:bg-[#244812]" : "w-full border-[#dbcdb8] bg-[#fffdf8]"}
                  onClick={() => void handleMarkHighSignal(selectedResponse.id, !selectedResponse.highSignal)}
                >
                  <Star className="mr-2 size-4" aria-hidden="true" />
                  {selectedResponse.highSignal ? "Remove high-signal mark" : "Mark as high signal"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-[#dbcdb8] bg-[#fffdf8]"
                  onClick={() => void handleBookmarkResponse(selectedResponse.id, !selectedResponse.bookmarked)}
                >
                  <Bookmark className="mr-2 size-4" aria-hidden="true" />
                  {selectedResponse.bookmarked ? "Remove saved mark" : "Save this take"}
                </Button>
                <Button
                  variant={selectedResponse.flagged ? "destructive" : "outline"}
                  className="w-full border-[#dbcdb8]"
                  onClick={() => void handleFlagResponse(selectedResponse.id, !selectedResponse.flagged)}
                >
                  <Flag className="mr-2 size-4" aria-hidden="true" />
                  {selectedResponse.flagged ? "Remove flag" : "Flag this take"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-[#dbcdb8] bg-[#f3ecdf]"
                  onClick={closeResponseDetail}
                >
                  <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
                  Back to queue
                </Button>
              </PocketActionStack>
            </PocketSection>
          </PocketShell>
          <AdminMobileNav />
        </>
      )
    }

    return (
      <>
        <PocketShell
          eyebrow="Signal"
          title="Release tracks"
          description={
            surveyIdFilter
              ? "You are reviewing one release at a time so you can triage the strongest voice signal faster."
              : "Listen, sort, and pull the strongest takes forward without the heavier desktop shell."
          }
        >
          {!surveyIdFilter ? (
            <PocketSection
              title="Starter pack"
              description="This is the cross-release listening stack. Start with the highest-signal takes across everything you have live."
              className="bg-[#fff6ed]"
            >
              <AudioSequencePlayer
                tracks={featuredTracks}
                title="Top 5 takes you should hear first"
                description="Highest-signal takes across all active releases."
                previewByDefault
                compact
                persistSession
                sessionSource="starter-pack:all"
                onSelectTrack={(trackId) => {
                  const params = new URLSearchParams()
                  params.set("responseId", trackId)
                  router.replace(`/admin/responses?${params.toString()}`)
                }}
              />
            </PocketSection>
          ) : null}

          {!surveyIdFilter ? (
            <PocketSection
              title="Release library"
              description="After the starter pack, drop into one release at a time for deeper review."
              className="mt-4"
            >
              <div className="space-y-3">
                {releaseGroups.map((group) => (
                  <article key={group.surveyId} className="rounded-[1.25rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-[var(--af-color-primary)]">{group.surveyTitle}</h3>
                        <p className="mt-1 text-sm text-[#5c5146]">{group.takes.length} takes • {group.deepCount} deep</p>
                      </div>
                      <span className="rounded-full bg-[#f3ecdf] px-2 py-1 text-[11px] text-[#7a6146]">
                        Rank {group.topTake?.listening?.rank ?? group.topTake?.insight?.signalScore ?? "-"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[#665746]">{group.topTake?.listening?.hotTake ?? group.topTake?.insight?.primaryTheme ?? "Open this release to hear its strongest takes first."}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="border-[#dbcdb8] bg-[#fff6ed]"
                        onClick={() => router.push(`/admin/responses?surveyId=${encodeURIComponent(group.surveyId)}`)}
                      >
                        Open release
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </PocketSection>
          ) : null}

          {surveyIdFilter ? (
          <PocketSection
            title="Release snapshot"
            description={
            surveyIdFilter
              ? "This view is narrowed to the selected release."
              : `${responses.length} total takes are ready for review.`
          }
            className="bg-[#fff6ed]"
          >
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf4] px-3 py-3">
                <p className="text-lg font-semibold text-[var(--af-color-primary)]">{deepResponses}</p>
                <p className="font-body text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Deep</p>
              </div>
              <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf4] px-3 py-3">
                <p className="text-lg font-semibold text-[var(--af-color-primary)]">{bookmarkedResponses}</p>
                <p className="font-body text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Saved</p>
              </div>
              <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf4] px-3 py-3">
                <p className="text-lg font-semibold text-[var(--af-color-primary)]">{flaggedResponses}</p>
                <p className="font-body text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Flagged</p>
              </div>
            </div>
            {error ? (
              <p className="font-body mt-3 text-sm text-[#8a3d2b]">{error}</p>
            ) : null}
          </PocketSection>
          ) : null}

          {surveyIdFilter ? (
          <PocketSection
            title="Now playing"
            description="Preview-first playback keeps the loop moving before you drop into full detail."
            className="mt-4"
          >
            <AudioSequencePlayer
              tracks={releaseTracks}
              title="Release player"
              description="Hook-first playback for fast signal review."
              previewByDefault
              compact
              persistSession
              sessionSource={surveyIdFilter ? `release:${surveyIdFilter}` : "release:all"}
              onSelectTrack={(trackId) => {
                const params = new URLSearchParams()
                if (surveyIdFilter) params.set("surveyId", surveyIdFilter)
                params.set("responseId", trackId)
                router.replace(`/admin/responses?${params.toString()}`)
              }}
            />
          </PocketSection>
          ) : null}

          <PocketSection
          title="Review actions"
            description="Use the quickest handoff for the listening loop you are in."
            className="mt-4"
          >
            <PocketActionStack>
              <Button
                variant="outline"
                className="w-full border-[#dbcdb8] bg-[#f3ecdf] justify-start"
                onClick={() => router.push("/admin/dashboard/v4")}
              >
                <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
                Back to home
              </Button>
              <Button
                variant="outline"
                className="w-full border-[#dbcdb8] bg-[#f3ecdf] justify-start"
                onClick={() => router.push("/admin/share")}
              >
                <Filter className="mr-2 size-4" aria-hidden="true" />
                Open share hub
              </Button>
            </PocketActionStack>
          </PocketSection>

          {surveyIdFilter ? (
            <ReleaseTakeDeck
              responses={rankedResponses}
              sessionSource={surveyIdFilter ? `release:${surveyIdFilter}` : "release-take-deck"}
              onPlayResponse={handlePlayResponse}
              onFlagResponse={handleFlagResponse}
              onMarkHighSignal={handleMarkHighSignal}
              onBookmarkResponse={handleBookmarkResponse}
              onTogglePublicPlaylist={handleTogglePublicPlaylist}
              onExtractInsight={handleExtractInsight}
              extractingInsightId={extractingInsightId}
            />
          ) : null}
        </PocketShell>
        <AdminMobileNav />
      </>
    )
  }

  return (
    <main className={`af-shell min-h-dvh p-3 pb-28 sm:p-6 sm:pb-6`}>
      <div className="af-panel af-fade-up mx-auto max-w-7xl rounded-[1.2rem] border p-3 sm:rounded-[2rem] sm:p-6">
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
            <div className="block">
              <p className={`font-body text-sm text-[#5c5146] text-pretty`}>
                Release detail
              </p>
              <h1 className="text-[clamp(1.55rem,6vw,1.9rem)] font-semibold text-balance">
                Release tracks
              </h1>
              {surveyIdFilter ? (
                <p className={`font-body mt-1 text-sm text-[#5c5146]`}>
                  Filtered to one release
                </p>
              ) : (
                <p className={`font-body mt-1 text-sm text-[#5c5146]`}>
                  {responses.length} total takes across all releases
                </p>
              )}
              {error ? (
                <p className={`font-body mt-1 text-sm text-[#8a3d2b]`}>{error}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={sortMode === "best" ? "default" : "outline"}
              className={sortMode === "best" ? "bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]" : "border-[#dbcdb8] bg-[#fffdf8]"}
              onClick={() => setSortMode("best")}
            >
              Best first
            </Button>
            <Button
              variant={sortMode === "newest" ? "default" : "outline"}
              className={sortMode === "newest" ? "bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]" : "border-[#dbcdb8] bg-[#fffdf8]"}
              onClick={() => setSortMode("newest")}
            >
              Newest
            </Button>
          </div>
        </header>

        {!surveyIdFilter ? (
        <section className="af-accent-card af-fade-up af-delay-1 mt-5 rounded-2xl border p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">Starter pack</p>
              <h2 className="mt-1 text-2xl font-semibold text-[var(--af-color-primary)]">Top 5 takes you should hear first</h2>
              <p className="mt-2 max-w-2xl text-sm text-[#5c5146]">
                This is the highest-signal listening stack across all your releases. Start here, then drop into a single release when you want deeper review.
              </p>
            </div>
            <Button variant="outline" className="border-[#dbcdb8] bg-[#fffdf8]" onClick={() => router.push("/admin/share")}>
              <Radio className="mr-2 size-4" />
              Share release
            </Button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3 text-center">
              <p className="text-lg font-semibold text-[var(--af-color-primary)]">{crossReleaseStats.totalTakes}</p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Takes ready</p>
            </div>
            <div className="rounded-2xl border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3 text-center">
              <p className="text-lg font-semibold text-[var(--af-color-primary)]">{crossReleaseStats.totalReleases}</p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Releases live</p>
            </div>
            <div className="rounded-2xl border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3 text-center">
              <p className="text-lg font-semibold text-[#25613a]">{crossReleaseStats.highSignal}</p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">High signal</p>
            </div>
            <div className="rounded-2xl border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3 text-center">
              <p className="text-lg font-semibold text-[var(--af-color-primary)]">{crossReleaseStats.deepTakes}</p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Deep listens</p>
            </div>
          </div>
          <div className="mt-5">
            <AudioSequencePlayer
              tracks={featuredTracks}
              title="Cross-release starter pack"
              description="Highest-signal takes across all active releases."
              previewByDefault
              persistSession
              sessionSource="starter-pack:all"
            />
          </div>
        </section>
        ) : null}

        {!surveyIdFilter ? (
        <section className="mt-6">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">Release library</p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--af-color-primary)]">Drop into one release when a take deserves a closer listen.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {releaseGroups.map((group) => (
              <article key={group.surveyId} className="rounded-[1.75rem] border border-[#dbcdb8] bg-[#fff8f0] p-5 shadow-[0_10px_30px_rgba(115,88,52,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--af-color-primary)]">{group.surveyTitle}</h3>
                    <p className="mt-1 text-sm text-[#5c5146]">{group.takes.length} takes • {group.deepCount} deep listens</p>
                  </div>
                  <span className="rounded-full bg-[#f3ecdf] px-2 py-1 text-xs text-[#7a6146]">
                    Rank {group.topTake?.listening?.rank ?? group.topTake?.insight?.signalScore ?? "-"}
                  </span>
                </div>
                <p className="mt-4 text-sm font-medium text-[#5c5146]">{group.topTake?.listening?.hotTake ?? group.topTake?.insight?.primaryTheme ?? "Open this release to hear its strongest takes first."}</p>
                {group.topTake?.insight?.quotes?.[0] ? (
                  <blockquote className="mt-3 rounded-2xl border border-[#e4d3bd] bg-[#fffdf8] px-4 py-3 text-sm italic leading-6 text-[#665746]">
                    "{group.topTake.insight.quotes[0]}"
                  </blockquote>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]" onClick={() => router.push(`/admin/responses?surveyId=${encodeURIComponent(group.surveyId)}`)}>
                    Open release
                  </Button>
                  {group.topTake ? (
                    <Button
                      variant="outline"
                      className="border-[#dbcdb8] bg-[#fffdf8]"
                      onClick={() => router.push(`/admin/responses?surveyId=${encodeURIComponent(group.surveyId)}&responseId=${encodeURIComponent(group.topTake.id)}`)}
                    >
                      Open lead take
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
        ) : null}

        {surveyIdFilter ? (
        <section className="mt-6 rounded-2xl border border-[#dbcdb8] bg-[#fff8f0] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">Starter pack</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--af-color-primary)]">Top 5 takes you should hear first</h2>
            </div>
            <Button variant="outline" className="border-[#dbcdb8] bg-[#fffdf8]" onClick={() => router.push("/admin/share")}>
              <Radio className="mr-2 size-4" />
              Share release
            </Button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {releaseTracks.slice(0, 5).map((track, index) => (
              <button
                key={track.id}
                type="button"
                onClick={() => {
                  const params = new URLSearchParams()
                  if (surveyIdFilter) params.set("surveyId", surveyIdFilter)
                  params.set("responseId", track.id)
                  router.push(`/admin/responses?${params.toString()}`)
                }}
                className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3 text-left hover:bg-[#f7efe4]"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-[#8a431f]">Take {index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--af-color-primary)]">{track.title}</p>
                <p className="mt-1 text-xs text-[#665746]">{track.listening.hotTake}</p>
              </button>
            ))}
          </div>
        </section>
        ) : null}

        {surveyIdFilter ? (
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">Now listening</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--af-color-primary)]">Release player</h2>
              <p className="mt-1 text-sm text-[#5c5146]">
                Preview-first playback surfaces the strongest hooks before transcript and summary review.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-[#dbcdb8] bg-[#fffdf8]"
              onClick={() => setIsReleasePlayerCollapsed((value) => !value)}
            >
              {isReleasePlayerCollapsed ? <ChevronDown className="mr-2 size-4" /> : <ChevronUp className="mr-2 size-4" />}
              {isReleasePlayerCollapsed ? "Expand player" : "Collapse player"}
            </Button>
          </div>
          {!isReleasePlayerCollapsed ? (
            <AudioSequencePlayer
              tracks={releaseTracks}
              title="Release player"
              description="Preview-first playback surfaces the strongest hooks before transcript and summary review."
              previewByDefault
              persistSession
              sessionSource={surveyIdFilter ? `release:${surveyIdFilter}` : "release:all"}
            />
          ) : (
            <div className="rounded-[1.75rem] border border-[#dbcdb8] bg-[#fff8f0] p-5 shadow-[0_10px_30px_rgba(115,88,52,0.06)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">Releases</p>
                  <h3 className="mt-1 text-2xl font-semibold text-[var(--af-color-primary)]">Each survey now behaves like a release.</h3>
                  <p className="mt-2 max-w-2xl text-sm text-[#5c5146]">
                    Fold the player away when you want to jump across releases without leaving this listening surface.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-[#dbcdb8] bg-[#fffdf8]"
                  onClick={() => setIsReleasePlayerCollapsed(false)}
                >
                  <ChevronDown className="mr-2 size-4" />
                  Back to now listening
                </Button>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {releaseGroups.map((group) => (
                  <article key={group.surveyId} className="rounded-[1.75rem] border border-[#dbcdb8] bg-[#fffdf8] p-5 shadow-[0_10px_30px_rgba(115,88,52,0.06)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold text-[var(--af-color-primary)]">{group.surveyTitle}</h4>
                        <p className="mt-1 text-sm text-[#5c5146]">{group.takes.length} takes • {group.deepCount} deep listens</p>
                      </div>
                      <span className="rounded-full bg-[#f3ecdf] px-2 py-1 text-xs text-[#7a6146]">
                        Rank {group.topTake?.listening?.rank ?? group.topTake?.insight?.signalScore ?? "-"}
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-medium text-[#5c5146]">
                      {group.topTake?.listening?.hotTake ?? group.topTake?.insight?.primaryTheme ?? "Open this release to hear its strongest takes first."}
                    </p>
                    {group.topTake?.insight?.quotes?.[0] ? (
                      <blockquote className="mt-3 rounded-2xl border border-[#e4d3bd] bg-[#fff8f0] px-4 py-3 text-sm italic leading-6 text-[#665746]">
                        "{group.topTake.insight.quotes[0]}"
                      </blockquote>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]"
                        onClick={() => router.push(`/admin/responses?surveyId=${encodeURIComponent(group.surveyId)}`)}
                      >
                        Open release
                      </Button>
                      {group.topTake ? (
                        <Button
                          variant="outline"
                          className="border-[#dbcdb8] bg-[#fffdf8]"
                          onClick={() => router.push(`/admin/responses?surveyId=${encodeURIComponent(group.surveyId)}&responseId=${encodeURIComponent(group.topTake.id)}`)}
                        >
                          Open lead take
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
        ) : null}

        {surveyIdFilter ? (
        <section className="af-accent-card af-fade-up af-delay-1 mt-6 rounded-2xl border p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <AudioWaveform className="h-6 w-6 text-[#b85e2d]" />
            <div>
              <h2 className="text-lg font-semibold">Release snapshot</h2>
              <p className="font-body text-sm text-[#5c5146]">
                {responses.filter((r) => r.durationBucket === "deep").length} deep takes (
                {responses.length > 0
                  ? Math.round((responses.filter((r) => r.durationBucket === "deep").length / responses.length) * 100)
                  : 0}%
                )
              </p>
            </div>
          </div>
        </section>
        ) : null}

        {surveyIdFilter ? (
        <ReleaseTakeDeck
          responses={rankedResponses}
          sessionSource={surveyIdFilter ? `release:${surveyIdFilter}` : "release-take-deck"}
          onPlayResponse={handlePlayResponse}
          onFlagResponse={handleFlagResponse}
          onMarkHighSignal={handleMarkHighSignal}
          onBookmarkResponse={handleBookmarkResponse}
          onTogglePublicPlaylist={handleTogglePublicPlaylist}
          onExtractInsight={handleExtractInsight}
          extractingInsightId={extractingInsightId}
        />
        ) : null}
      </div>
    </main>
  )
}
