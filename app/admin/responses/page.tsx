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
import { MobilePage, MobileSection, PocketActionStack } from "@/components/mobile/pocket-shell"
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
    narrativeSummary: string | null
    signalSummary: {
      complaint?: string | null
      opportunity?: string | null
      emotion?: string | null
      frictionMoment?: string | null
      confidence?: number | null
    } | null
    powerQuote: string | null
    verbatimQuotes: string[]
    quoteCandidates: Array<{
      quote: string
      score: number
      conviction: number
      specificity: number
      shareability: number
    }>
    primaryTheme: string | null
    themes: string[]
    sentiment: string | null
    sentimentScore: number | null
    signalScore: number | null
    provider: string | null
    extractorVersion: string | null
  } | null
}

type ReleaseInsight = {
  id: string
  surveyId: string
  narrativeSummary: string | null
  signalSummary: {
    topComplaints: Array<{ label: string; count: number }>
    topOpportunities: Array<{ label: string; reason: string }>
    emergingSignals: string[]
    contrarianInsights: string[]
  } | null
  clusters: Array<{
    label: string
    count: number
    description: string
    representativeResponseIds: string[]
    representativeQuote: string | null
    representativeTakeId: string | null
  }>
  shareArtifacts: {
    topQuotes: string[]
    bestClusterLabel?: string | null
    bestClipCandidateIds?: string[]
  } | null
  provider: string | null
  extractorVersion: string | null
} | null

function shareQuoteCountLabel(releaseInsight: ReleaseInsight): string {
  if (!releaseInsight?.shareArtifacts?.topQuotes?.length) return "No share quotes yet"
  return `${releaseInsight.shareArtifacts.topQuotes.length} share-ready quote${releaseInsight.shareArtifacts.topQuotes.length === 1 ? "" : "s"}`
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
  const [releaseInsight, setReleaseInsight] = useState<ReleaseInsight>(null)
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
          setReleaseInsight(json.releaseInsight || null)
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
          <MobilePage
            title="Listen"
            description={selectedResponse.surveyTitle}
          >
            <MobileSection
              title="Take overview"
              description={selectedResponse.questionText || `Question ${selectedResponse.questionId.toUpperCase()}`}
            >
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded-[0.95rem] border border-[#dbcdb8]/45 bg-[#fffaf4] px-2.5 py-2.5">
                  <p className="text-[15px] font-semibold text-[var(--af-color-primary)]">{selectedResponse.listening?.rank ?? selectedResponse.insight?.signalScore ?? "-"}</p>
                  <p className="font-body text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Rank</p>
                </div>
                <div className="rounded-[0.95rem] border border-[#dbcdb8]/45 bg-[#fffaf4] px-2.5 py-2.5">
                  <p className="text-[15px] font-semibold text-[var(--af-color-primary)]">{selectedResponse.durationSeconds ? `${Math.round(selectedResponse.durationSeconds)}s` : "Voice"}</p>
                  <p className="font-body text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Length</p>
                </div>
                <div className="rounded-[0.95rem] border border-[#dbcdb8]/45 bg-[#fffaf4] px-2.5 py-2.5">
                  <p className="text-[15px] font-semibold text-[var(--af-color-primary)]">{selectedResponse.insight?.primaryTheme || "Raw"}</p>
                  <p className="font-body text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Theme</p>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {selectedResponse.insight?.primaryTheme ? (
                  <span className="rounded-full border border-[#cfbea4]/55 bg-[#fffdf8] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-[#7a6146]">
                    {selectedResponse.insight.primaryTheme}
                  </span>
                ) : null}
                {selectedResponse.listening?.hotTake ? (
                  <span className="rounded-full border border-[#cfbea4]/55 bg-[#fffdf8] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-[#7a6146]">
                    Listening hook
                  </span>
                ) : null}
              </div>
            </MobileSection>

            <MobileSection title="Listen back" description="Review the raw voice take before acting." className="mt-4">
              <AudioSequencePlayer
                tracks={[buildListeningTrack(selectedResponse)]}
                title="Selected take"
                description="Use the same mobile listening controls here before moving into transcript and summary."
                previewByDefault
                persistSession
                sessionSource={`selected-response:${selectedResponse.id}`}
                onSelectTrack={(trackId) => handlePlayResponse(trackId)}
              />
            </MobileSection>

            {selectedResponse.insight?.powerQuote ? (
              <MobileSection
                title="Power quote"
                description="The sharpest verbatim line worth carrying forward from this take."
                className="mt-4 bg-[#fff6ed]"
              >
                <blockquote className="text-[14px] italic leading-6 text-[#5c5146]">
                  "{selectedResponse.insight.powerQuote}"
                </blockquote>
              </MobileSection>
            ) : null}

            {selectedResponse.transcript ? (
              <MobileSection
                title="Transcript"
                description={selectedResponse.transcript.status === "completed" ? "Read the spoken answer in text form." : "Transcription is still processing."}
                className="mt-4"
              >
                <p className="text-[12px] leading-5 text-[var(--af-color-primary)]">
                  {selectedResponse.transcript.text || selectedResponse.transcript.errorMessage || "Processing transcript..."}
                </p>
              </MobileSection>
            ) : null}

            <MobileSection
              title="Signal summary"
              description={selectedResponse.insight ? "Use the narrative summary as a shortcut, not a substitute for listening." : "Extract a narrative summary when you want a faster triage read."}
              className="mt-4"
            >
              {selectedResponse.insight ? (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {selectedResponse.insight.primaryTheme ? (
                      <span className="rounded-full border border-[#cfbea4]/55 bg-[#fff6ed] px-2.5 py-0.5 text-[10px] text-[#7a6146]">
                        {selectedResponse.insight.primaryTheme}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-[#cfbea4]/55 bg-[#fff6ed] px-2.5 py-0.5 text-[10px] text-[#7a6146]">
                      {selectedResponse.insight.signalScore ?? "-"} / 100
                    </span>
                    {selectedResponse.insight.signalSummary?.confidence != null ? (
                      <span className="rounded-full border border-[#cfbea4]/55 bg-[#fff6ed] px-2.5 py-0.5 text-[10px] text-[#7a6146]">
                        {Math.round(selectedResponse.insight.signalSummary.confidence * 100)}% confidence
                      </span>
                    ) : null}
                  </div>
                  {selectedResponse.listening?.hotTake ? (
                    <div className="rounded-[1rem] border border-[#dbcdb8]/45 bg-[#fffaf4] px-3 py-2.5">
                      <p className="font-body text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Listening hook</p>
                      <p className="mt-1.5 text-[12px] font-medium leading-5 text-[#8a431f]">{selectedResponse.listening.hotTake}</p>
                    </div>
                  ) : null}
                  <p className="text-[12px] leading-5 text-[var(--af-color-primary)]">
                    {selectedResponse.insight.narrativeSummary || "No narrative summary was generated for this take."}
                  </p>
                  {selectedResponse.insight.signalSummary ? (
                    <div className="rounded-[1rem] border border-[#dbcdb8]/45 bg-[#fffdf8] px-3 py-2.5 text-[12px] text-[#5c5146]">
                      <p><span className="font-medium text-[var(--af-color-primary)]">Complaint:</span> {selectedResponse.insight.signalSummary.complaint || "Still being inferred"}</p>
                      <p className="mt-2"><span className="font-medium text-[var(--af-color-primary)]">Opportunity:</span> {selectedResponse.insight.signalSummary.opportunity || "Still being inferred"}</p>
                      {selectedResponse.insight.signalSummary.frictionMoment ? (
                        <p className="mt-2"><span className="font-medium text-[var(--af-color-primary)]">Friction moment:</span> {selectedResponse.insight.signalSummary.frictionMoment}</p>
                      ) : null}
                      {selectedResponse.insight.signalSummary.emotion ? (
                        <p className="mt-2"><span className="font-medium text-[var(--af-color-primary)]">Emotion:</span> {selectedResponse.insight.signalSummary.emotion}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="min-h-9 w-full border-[#dbcdb8]/55 bg-[#fffdf8] px-3 text-[12px]"
                  disabled={extractingInsightId === selectedResponse.id}
                  onClick={() => void handleExtractInsight(selectedResponse.id)}
                >
                  {extractingInsightId === selectedResponse.id ? "Extracting..." : "Generate narrative summary"}
                </Button>
              )}
            </MobileSection>

            <MobileSection title="Actions" description="Classify this take while the context is fresh." className="mt-4">
              <PocketActionStack>
                <Button
                  variant={selectedResponse.highSignal ? "default" : "outline"}
                  className={selectedResponse.highSignal ? "min-h-9 w-full bg-[#2d5a17] px-3 text-[12px] text-[#fff6ed] hover:bg-[#244812]" : "min-h-9 w-full border-[#dbcdb8]/55 bg-[#fffdf8] px-3 text-[12px]"}
                  onClick={() => void handleMarkHighSignal(selectedResponse.id, !selectedResponse.highSignal)}
                >
                  <Star className="mr-2 size-4" aria-hidden="true" />
                  {selectedResponse.highSignal ? "Remove high-signal mark" : "Mark as high signal"}
                </Button>
                <Button
                  variant="outline"
                  className="min-h-9 w-full border-[#dbcdb8]/55 bg-[#fffdf8] px-3 text-[12px]"
                  onClick={() => void handleBookmarkResponse(selectedResponse.id, !selectedResponse.bookmarked)}
                >
                  <Bookmark className="mr-2 size-4" aria-hidden="true" />
                  {selectedResponse.bookmarked ? "Remove saved mark" : "Save this take"}
                </Button>
                <Button
                  variant={selectedResponse.flagged ? "destructive" : "outline"}
                  className="min-h-9 w-full border-[#dbcdb8]/55 px-3 text-[12px]"
                  onClick={() => void handleFlagResponse(selectedResponse.id, !selectedResponse.flagged)}
                >
                  <Flag className="mr-2 size-4" aria-hidden="true" />
                  {selectedResponse.flagged ? "Remove flag" : "Flag this take"}
                </Button>
                <Button
                  variant="outline"
                  className="min-h-9 w-full border-[#dbcdb8]/55 bg-[#f3ecdf] px-3 text-[12px]"
                  onClick={closeResponseDetail}
                >
                  <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
                  Back to queue
                </Button>
              </PocketActionStack>
            </MobileSection>
          </MobilePage>
          <AdminMobileNav />
        </>
      )
    }

    return (
      <>
          <MobilePage
          title="Listen"
          description={
            surveyIdFilter
              ? "Hear the strongest takes from this release first."
              : "Hear what matters first."
          }
        >
          {!surveyIdFilter ? (
            <MobileSection
              title="Starter pack"
              description="Start with the highest-signal takes across everything you have live."
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
            </MobileSection>
          ) : null}

          {!surveyIdFilter ? (
            <MobileSection
              title="Release library"
              description="After the starter pack, drop into one release at a time for deeper review."
              className="mt-4"
            >
              <div className="space-y-3">
                {releaseGroups.map((group) => (
                  <article key={group.surveyId} className="rounded-[1.35rem] border border-[#dbcdb8] bg-[#fffdf8] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)]">
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
                    {group.topTake?.insight?.powerQuote ? (
                      <blockquote className="mt-3 rounded-2xl border border-[#dbcdb8] bg-[#fff8f0] px-4 py-3 text-sm italic leading-6 text-[#665746]">
                        "{group.topTake.insight.powerQuote}"
                      </blockquote>
                    ) : null}
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
            </MobileSection>
          ) : null}

          {surveyIdFilter ? (
            <MobileSection
            title="Release snapshot"
            description={
              surveyIdFilter
                ? "Quick counts for the release you are listening through."
                : `${responses.length} total takes are ready for review.`
            }
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
          </MobileSection>
          ) : null}

          {surveyIdFilter ? (
            <MobileSection
              title="Insights"
              description="The clearest read from this release so far."
              className="mt-4"
            >
              <div className="space-y-3">
                <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3">
                  <p className="font-body text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Release read</p>
                  <p className="mt-2 text-sm leading-6 text-[#5c5146]">
                    {releaseInsight?.narrativeSummary || "This release is still gathering enough enriched takes to form a stronger narrative."}
                  </p>
                </div>
                <div className="grid gap-2">
                  <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3">
                    <p className="font-body text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Lead complaint</p>
                    <p className="mt-2 text-sm font-medium text-[var(--af-color-primary)]">
                      {releaseInsight?.signalSummary?.topComplaints?.[0]?.label || "Waiting for stronger complaint clustering"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3">
                    <p className="font-body text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Lead opportunity</p>
                    <p className="mt-2 text-sm font-medium text-[var(--af-color-primary)]">
                      {releaseInsight?.signalSummary?.topOpportunities?.[0]?.label || "Waiting for opportunity inference"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3">
                    <p className="font-body text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Best cluster</p>
                    <p className="mt-2 text-sm font-medium text-[var(--af-color-primary)]">
                      {releaseInsight?.shareArtifacts?.bestClusterLabel || "Still forming"}
                    </p>
                  </div>
                </div>
                {releaseInsight?.shareArtifacts?.topQuotes?.[0] ? (
                  <blockquote className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3 text-sm italic leading-6 text-[#5c5146]">
                    "{releaseInsight.shareArtifacts.topQuotes[0]}"
                  </blockquote>
                ) : null}
                {releaseInsight?.clusters?.[0]?.representativeTakeId ? (
                  <Button
                    variant="outline"
                    className="w-full border-[#dbcdb8] bg-[#fffdf8]"
                    onClick={() => {
                      const params = new URLSearchParams()
                      params.set("surveyId", surveyIdFilter)
                      params.set("responseId", releaseInsight.clusters[0].representativeTakeId as string)
                      router.replace(`/admin/responses?${params.toString()}`)
                    }}
                  >
                    Open representative take
                  </Button>
                ) : null}
              </div>
            </MobileSection>
          ) : null}

          {surveyIdFilter ? (
          <MobileSection
            title={isReleasePlayerCollapsed ? "Releases" : "Now playing"}
            description={
              isReleasePlayerCollapsed
                ? "Collapse the player when you want to jump across releases without leaving this listening surface."
                : "Preview-first playback keeps the loop moving before you drop into full detail."
            }
            className="mt-4"
          >
            <div className="mb-3 flex justify-end">
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
            ) : (
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
                    <p className="mt-3 text-sm text-[#665746]">
                      {group.topTake?.listening?.hotTake ?? group.topTake?.insight?.primaryTheme ?? "Open this release to hear its strongest takes first."}
                    </p>
                    {group.topTake?.insight?.powerQuote ? (
                      <blockquote className="mt-3 rounded-2xl border border-[#dbcdb8] bg-[#fff8f0] px-4 py-3 text-sm italic leading-6 text-[#665746]">
                        "{group.topTake.insight.powerQuote}"
                      </blockquote>
                    ) : null}
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
            )}
          </MobileSection>
          ) : null}

          <MobileSection
            title="Quick actions"
            description="Move to the next listening surface."
            className="mt-4"
          >
            <PocketActionStack>
              <Button
                variant="outline"
                className="w-full border-[#dbcdb8] bg-[#fffdf8] justify-start"
                onClick={() => router.push("/admin/dashboard/v4")}
              >
                <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
                Back to home
              </Button>
              <Button
                variant="outline"
                className="w-full border-[#dbcdb8] bg-[#fffdf8] justify-start"
                onClick={() => router.push("/admin/share")}
              >
                <Filter className="mr-2 size-4" aria-hidden="true" />
                Open share hub
              </Button>
            </PocketActionStack>
          </MobileSection>

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
        </MobilePage>
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
                {group.topTake?.insight?.powerQuote ? (
                  <blockquote className="mt-3 rounded-2xl border border-[#e4d3bd] bg-[#fffdf8] px-4 py-3 text-sm italic leading-6 text-[#665746]">
                    "{group.topTake.insight.powerQuote}"
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
                Preview-first playback surfaces the strongest hooks before transcript and narrative review.
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
              description="Preview-first playback surfaces the strongest hooks before transcript and narrative review."
              previewByDefault
              persistSession
              sessionSource={surveyIdFilter ? `release:${surveyIdFilter}` : "release:all"}
            />
          ) : (
            <div className="rounded-[1.75rem] border border-[#dbcdb8] bg-[#fff8f0] p-5 shadow-[0_10px_30px_rgba(115,88,52,0.06)]">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">Releases</p>
                <h3 className="mt-1 text-2xl font-semibold text-[var(--af-color-primary)]">Each survey now behaves like a release.</h3>
                <p className="mt-2 max-w-2xl text-sm text-[#5c5146]">
                  Fold the player away when you want to jump across releases without leaving this listening surface.
                </p>
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
                    {group.topTake?.insight?.powerQuote ? (
                      <blockquote className="mt-3 rounded-2xl border border-[#e4d3bd] bg-[#fff8f0] px-4 py-3 text-sm italic leading-6 text-[#665746]">
                        "{group.topTake.insight.powerQuote}"
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

        {surveyIdFilter && releaseInsight ? (
        <section className="mt-6 rounded-[1.75rem] border border-[#dbcdb8] bg-[#fff8f0] p-5 shadow-[0_10px_30px_rgba(115,88,52,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">Signal summary</p>
              <h2 className="mt-1 text-2xl font-semibold text-[var(--af-color-primary)]">Clustered intelligence for this release</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5c5146]">
                {releaseInsight.narrativeSummary || "This release is still gathering enough enriched takes to surface a stronger narrative."}
              </p>
            </div>
            <Button
              variant="outline"
              className="border-[#dbcdb8] bg-[#fffdf8]"
              onClick={async () => {
                try {
                  const response = await fetch(`/api/surveys/${encodeURIComponent(surveyIdFilter)}/release-insight`, {
                    method: "POST",
                    credentials: "include",
                  })
                  if (!response.ok) throw new Error("Failed to refresh release insight.")
                  const payload = await response.json()
                  setReleaseInsight(payload.releaseInsight || null)
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to refresh release insight.")
                }
              }}
            >
              Refresh signal summary
            </Button>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.6rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[#8a431f]">Decision board</p>
                  <h3 className="mt-1 text-lg font-semibold text-[var(--af-color-primary)]">
                    {releaseInsight.shareArtifacts?.bestClusterLabel
                      ? `The release is clustering around ${releaseInsight.shareArtifacts.bestClusterLabel}.`
                      : "The release signal is still clustering."}
                  </h3>
                </div>
                <span className="rounded-full bg-[#f3ecdf] px-3 py-1 text-xs text-[#7a6146]">
                  {shareQuoteCountLabel(releaseInsight)}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#e4d3bd] bg-[#fff8f0] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#7a6146]">Lead complaint</p>
                  <p className="mt-2 text-sm font-medium text-[var(--af-color-primary)]">
                    {releaseInsight.signalSummary?.topComplaints?.[0]?.label || "Waiting for stronger clustering"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#e4d3bd] bg-[#fff8f0] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#7a6146]">Lead opportunity</p>
                  <p className="mt-2 text-sm font-medium text-[var(--af-color-primary)]">
                    {releaseInsight.signalSummary?.topOpportunities?.[0]?.label || "Waiting for inferred opportunities"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#e4d3bd] bg-[#fff8f0] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#7a6146]">Best cluster</p>
                  <p className="mt-2 text-sm font-medium text-[var(--af-color-primary)]">
                    {releaseInsight.shareArtifacts?.bestClusterLabel || "Still forming"}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#8a431f]">Share artifacts</p>
              <h3 className="mt-1 text-lg font-semibold text-[var(--af-color-primary)]">Quotes worth carrying beyond the deck</h3>
              <div className="mt-4 space-y-3">
                {(releaseInsight.shareArtifacts?.topQuotes ?? []).slice(0, 3).map((quote) => (
                  <blockquote key={quote} className="rounded-2xl border border-[#e4d3bd] bg-[#fff8f0] px-4 py-3 text-sm italic leading-6 text-[#665746]">
                    "{quote}"
                  </blockquote>
                ))}
                {!(releaseInsight.shareArtifacts?.topQuotes?.length) ? (
                  <p className="text-sm text-[#665746]">Power quotes will land here once the engine finds stronger verbatim lines across the release.</p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_1fr]">
            <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] p-4">
              <p className="text-sm font-medium text-[var(--af-color-primary)]">Top complaints</p>
              <div className="mt-3 space-y-3">
                {(releaseInsight.signalSummary?.topComplaints ?? []).slice(0, 3).map((complaint) => (
                  <div key={complaint.label} className="flex items-center justify-between gap-3 rounded-2xl border border-[#e4d3bd] bg-[#fff8f0] px-4 py-3">
                    <p className="text-sm text-[#5c5146]">{complaint.label}</p>
                    <span className="rounded-full bg-[#f3ecdf] px-2 py-1 text-xs text-[#7a6146]">{complaint.count}</span>
                  </div>
                ))}
                {!(releaseInsight.signalSummary?.topComplaints?.length) ? <p className="text-sm text-[#665746]">Complaint clusters will appear once more enriched takes land.</p> : null}
              </div>
            </div>
            <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] p-4">
              <p className="text-sm font-medium text-[var(--af-color-primary)]">Top opportunities</p>
              <div className="mt-3 space-y-3">
                {(releaseInsight.signalSummary?.topOpportunities ?? []).slice(0, 3).map((opportunity) => (
                  <div key={opportunity.label} className="rounded-2xl border border-[#e4d3bd] bg-[#fff8f0] px-4 py-3">
                    <p className="text-sm font-medium text-[var(--af-color-primary)]">{opportunity.label}</p>
                    <p className="mt-1 text-sm text-[#665746]">{opportunity.reason}</p>
                  </div>
                ))}
                {!(releaseInsight.signalSummary?.topOpportunities?.length) ? <p className="text-sm text-[#665746]">Opportunity patterns will appear after signal extraction finishes.</p> : null}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] p-4">
              <p className="text-sm font-medium text-[var(--af-color-primary)]">Emerging signals</p>
              <ul className="mt-3 space-y-2 text-sm text-[#665746]">
                {(releaseInsight.signalSummary?.emergingSignals ?? []).slice(0, 3).map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
                {!(releaseInsight.signalSummary?.emergingSignals?.length) ? <li>Emerging signals will surface once low-frequency patterns sharpen.</li> : null}
              </ul>
            </div>
            <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] p-4">
              <p className="text-sm font-medium text-[var(--af-color-primary)]">Contrarian insights</p>
              <ul className="mt-3 space-y-2 text-sm text-[#665746]">
                {(releaseInsight.signalSummary?.contrarianInsights ?? []).slice(0, 3).map((insight) => (
                  <li key={insight}>{insight}</li>
                ))}
                {!(releaseInsight.signalSummary?.contrarianInsights?.length) ? <li>Contrarian takes will appear when minority viewpoints diverge from the dominant clusters.</li> : null}
              </ul>
            </div>
          </div>
          {releaseInsight.clusters.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {releaseInsight.clusters.slice(0, 3).map((cluster) => (
                <article key={cluster.label} className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--af-color-primary)]">{cluster.label}</p>
                    <span className="rounded-full bg-[#f3ecdf] px-2 py-1 text-xs text-[#7a6146]">{cluster.count} takes</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#665746]">{cluster.description}</p>
                  {cluster.representativeQuote ? (
                    <blockquote className="mt-3 rounded-2xl border border-[#e4d3bd] bg-[#fff8f0] px-4 py-3 text-sm italic leading-6 text-[#665746]">
                      "{cluster.representativeQuote}"
                    </blockquote>
                  ) : null}
                  {cluster.representativeTakeId ? (
                    <Button
                      variant="outline"
                      className="mt-3 border-[#dbcdb8] bg-[#fffdf8]"
                      onClick={() => {
                        const params = new URLSearchParams()
                        params.set("surveyId", surveyIdFilter)
                        params.set("responseId", cluster.representativeTakeId as string)
                        router.push(`/admin/responses?${params.toString()}`)
                      }}
                    >
                      Open representative take
                    </Button>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
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
