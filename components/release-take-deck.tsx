"use client"

import { useMemo, useState } from "react"
import { AudioWaveform, Bookmark, ChevronDown, ChevronUp, Flag, Pause, Play, Sparkles, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/components/ui/use-mobile"
import { cn } from "@/lib/utils"
import { getMomentumLabel, type ListeningMomentumTag } from "@/lib/listening-model"
import { useListeningSession } from "@/components/listen/listening-session-provider"
import type { ListeningTrack } from "@/components/listen/audio-sequence-player"

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
  listening?: {
    rank: number
    hotTake: string
    momentumTags: string[]
    previewClipRange?: { startSeconds: number; endSeconds: number } | null
    collectionMembership?: string[]
    epInclusion?: boolean
  }
}

type ReleaseTakeDeckProps = {
  responses: ResponseWithMetadata[]
  extractingInsightId?: string | null
  sessionSource?: string
  onPlayResponse?: (responseId: string) => void
  onFlagResponse?: (responseId: string, flagged: boolean) => void
  onMarkHighSignal?: (responseId: string, highSignal: boolean) => void
  onBookmarkResponse?: (responseId: string, bookmarked: boolean) => void
  onTogglePublicPlaylist?: (responseId: string, enabled: boolean) => void
  onExtractInsight?: (responseId: string) => void
}

function formatDuration(seconds?: number | null): string {
  if (!seconds && seconds !== 0) return "Voice"
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function formatPlaybackTime(seconds?: number | null): string {
  const safeSeconds = Math.max(0, Math.floor(seconds ?? 0))
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function transcriptLabel(response: ResponseWithMetadata): string {
  if (!response.transcript) return "Transcript not ready yet"
  if (response.transcript.status === "pending") return "Transcript is still processing"
  if (response.transcript.status === "failed") return "Transcript needs another pass"
  return "Transcript"
}

function transcriptPreview(response: ResponseWithMetadata): string {
  if (!response.transcript) return "Listen to this take to review the full answer while transcription catches up."
  if (response.transcript.text) return response.transcript.text
  if (response.transcript.errorMessage) return response.transcript.errorMessage
  return "Processing transcript..."
}

function summaryPreview(response: ResponseWithMetadata): string {
  if (response.insight?.narrativeSummary) return response.insight.narrativeSummary
  if (response.transcript?.status === "failed") return "Generate a fresh narrative summary after the transcript is repaired."
  return "Generate a narrative summary when you want a faster review pass on this take."
}

function hotTakePreview(response: ResponseWithMetadata): string | null {
  const hotTake = response.listening?.hotTake?.trim()
  if (hotTake) return hotTake
  const theme = response.insight?.primaryTheme?.trim()
  return theme ? `Listen for the clearest take on ${theme}.` : null
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 3)}...`
}

function buildTrack(response: ResponseWithMetadata): ListeningTrack {
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

function quoteScoreLabel(response: ResponseWithMetadata): string | null {
  const score = response.insight?.quoteCandidates?.[0]?.score
  if (typeof score !== "number") return null
  return `${Math.round(score * 100)} quote score`
}

export function ReleaseTakeDeck({
  responses,
  extractingInsightId = null,
  sessionSource = "release-take-deck",
  onPlayResponse,
  onFlagResponse,
  onMarkHighSignal,
  onBookmarkResponse,
  onTogglePublicPlaylist,
  onExtractInsight,
}: ReleaseTakeDeckProps) {
  const session = useListeningSession()
  const isMobile = useIsMobile()
  const [expandedId, setExpandedId] = useState<string | null>(responses[0]?.id ?? null)

  const stats = useMemo(
    () => ({
      total: responses.length,
      saved: responses.filter((response) => response.bookmarked).length,
      flagged: responses.filter((response) => response.flagged).length,
      highSignal: responses.filter((response) => response.highSignal).length,
    }),
    [responses],
  )

  const tracks = useMemo(() => responses.map(buildTrack), [responses])

  const playTake = async (responseId: string) => {
    const track = tracks.find((item) => item.id === responseId)
    if (!track) return
    const sameSource = session.activeSource === sessionSource
    const sameQueue =
      sameSource &&
      session.queue.length === tracks.length &&
      session.queue.every((queueTrack, index) => queueTrack.id === tracks[index]?.id)

    if (sameQueue) {
      await session.playTrack(responseId)
    } else {
      await session.loadQueue(tracks, {
        selectedTrackId: responseId,
        autoplay: true,
        previewMode: session.previewMode,
        source: sessionSource,
      })
    }
    onPlayResponse?.(responseId)
  }

  if (!responses.length) {
    return (
      <section className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] p-6 text-center">
        <AudioWaveform className="mx-auto h-10 w-10 text-[#8a431f]/60" />
        <h2 className="mt-4 text-lg font-semibold text-[var(--af-color-primary)]">No takes in this release yet</h2>
        <p className="mt-2 text-sm text-[#5c5146]">
          As soon as new voices land, the strongest takes will appear here for transcript and narrative-summary review.
        </p>
      </section>
    )
  }

  return (
    <section className={cn("mt-6 rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] p-4 sm:p-5", isMobile && "rounded-none border-0 bg-transparent p-0")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">Take deck</p>
          <h2 className={cn("mt-1 text-2xl font-semibold text-[var(--af-color-primary)]", isMobile && "text-[1.35rem] leading-[1.05] tracking-[-0.03em]")}>Review transcript and narrative summary without leaving the player.</h2>
          <p className={cn("mt-2 max-w-3xl text-sm text-[#5c5146]", isMobile && "text-[12px] leading-5")}>
            Each card keeps audio, transcript, narrative summary, and creator actions together so the release still feels like listening first.
          </p>
        </div>
        <div className={cn("grid min-w-[220px] grid-cols-2 gap-2 text-center sm:grid-cols-4", isMobile && "w-full min-w-0")}>
          <div className="rounded-2xl border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3">
            <p className="text-lg font-semibold text-[var(--af-color-primary)]">{stats.total}</p>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Takes</p>
          </div>
          <div className="rounded-2xl border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3">
            <p className="text-lg font-semibold text-[#25613a]">{stats.highSignal}</p>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Signal</p>
          </div>
          <div className="rounded-2xl border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3">
            <p className="text-lg font-semibold text-[var(--af-color-primary)]">{stats.saved}</p>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Saved</p>
          </div>
          <div className="rounded-2xl border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3">
            <p className="text-lg font-semibold text-[#8a3d2b]">{stats.flagged}</p>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">Flagged</p>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {responses.map((response, index) => {
          const expanded = expandedId === response.id
          const transcript = transcriptPreview(response)
          const summary = summaryPreview(response)
          const rank = response.listening?.rank ?? response.insight?.signalScore ?? null
          const hotTake = hotTakePreview(response)
          const theme = response.insight?.primaryTheme ?? null
          const hasInsight = Boolean(response.insight)
          const primaryQuote = response.insight?.powerQuote ?? null
          const quoteScore = quoteScoreLabel(response)
          const isActive = session.activeSource === sessionSource && session.currentTrack?.id === response.id
          const isPlaying = isActive && session.playingId === response.id

          return (
            <article
              key={response.id}
              className={cn(
                "rounded-[1.6rem] border p-4 transition-colors sm:p-5",
                expanded ? "border-[#cfa16d] bg-[#fff9f2]" : "border-[#dbcdb8] bg-white",
                isMobile && "rounded-[1rem] p-3.5",
                response.highSignal && "shadow-[0_0_0_1px_rgba(37,97,58,0.08)]",
                response.flagged && "border-[#e7b6ab]",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-[#cfbea4] bg-[#fff6ed] text-[#7a6146]">
                      {index === 0 ? "Lead take" : `Take ${index + 1}`}
                    </Badge>
                    {rank != null ? (
                      <Badge variant="outline" className="border-[#cfbea4] bg-[#fff6ed] text-[#7a6146]">
                        Rank {rank}
                      </Badge>
                    ) : null}
                    {response.listening?.momentumTags?.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="border-[#cfbea4] bg-[#fff6ed] text-[#7a6146]">
                        {getMomentumLabel(tag as ListeningMomentumTag)}
                      </Badge>
                    ))}
                    {response.highSignal ? (
                      <Badge className="bg-[#2d5a17] text-[#fff6ed] hover:bg-[#2d5a17]">High signal</Badge>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-[var(--af-color-primary)]">
                    {response.questionText || `Question ${response.questionId.toUpperCase()}`}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#665746]">
                    <span>Voice take</span>
                    <span>{formatDuration(response.durationSeconds)}</span>
                    <span>{new Date(response.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {theme ? (
                      <Badge variant="outline" className="border-[#cfbea4] bg-[#fff6ed] text-[#7a6146] capitalize">
                        {theme}
                      </Badge>
                    ) : null}
                    {hotTake ? (
                      <p className="min-w-0 text-sm font-medium text-[#8a431f]">{truncate(hotTake, 140)}</p>
                    ) : null}
                    {response.insight?.signalSummary?.complaint ? (
                      <p className="text-xs uppercase tracking-[0.12em] text-[#7a6146]">
                        Signal: {response.insight.signalSummary.complaint}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-[#dbcdb8] bg-[#fffdf8]"
                  onClick={() => setExpandedId(expanded ? null : response.id)}
                >
                  {expanded ? <ChevronUp className="mr-2 size-4" /> : <ChevronDown className="mr-2 size-4" />}
                  {expanded ? "Collapse" : "Open take"}
                </Button>
              </div>

              {!expanded ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                  <div className={cn("rounded-2xl border border-[#dbcdb8] bg-[#fff8f0] p-4", isMobile && "rounded-[1rem] border-[#dbcdb8]/35 p-3")}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-[var(--af-color-primary)]">Power quote</p>
                      {quoteScore ? (
                        <span className="text-xs uppercase tracking-[0.14em] text-[#7a6146]">{quoteScore}</span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#665746] italic">
                      {primaryQuote ? `"${truncate(primaryQuote, 170)}"` : "A pull quote will appear here once the insight engine finds a sharp verbatim line worth carrying."}
                    </p>
                  </div>
                  <div className={cn("rounded-2xl border border-[#dbcdb8] bg-[#fffaf3] p-4", isMobile && "rounded-[1rem] border-[#dbcdb8]/35 p-3")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-[#8a431f]" />
                        <p className="text-sm font-medium text-[var(--af-color-primary)]">Narrative summary</p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.14em] text-[#7a6146]">
                        {hasInsight ? "Ready" : "Needs summary"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#5c5146]">{truncate(summary, 180)}</p>
                  </div>
                  {response.insight?.signalSummary ? (
                    <div className={cn("rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] p-4", isMobile && "rounded-[1rem] border-[#dbcdb8]/35 p-3")}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-[var(--af-color-primary)]">Signal</p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[#7a6146]">
                          {response.insight.signalSummary.emotion ? <span>{response.insight.signalSummary.emotion}</span> : null}
                          {response.insight.signalSummary.confidence != null ? <span>{Math.round(response.insight.signalSummary.confidence * 100)}% confidence</span> : null}
                        </div>
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-[#665746]">
                        {response.insight.signalSummary.complaint ? (
                          <p><span className="font-medium text-[var(--af-color-primary)]">Complaint:</span> {response.insight.signalSummary.complaint}</p>
                        ) : null}
                        {response.insight.signalSummary.opportunity ? (
                          <p><span className="font-medium text-[var(--af-color-primary)]">Opportunity:</span> {response.insight.signalSummary.opportunity}</p>
                        ) : null}
                        {response.insight.signalSummary.frictionMoment ? (
                          <p><span className="font-medium text-[var(--af-color-primary)]">Friction moment:</span> {response.insight.signalSummary.frictionMoment}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                  <section className={cn("rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] p-4", isMobile && "rounded-[1rem] border-[#dbcdb8]/35 p-3")}>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">Hear the take</p>
                      <h4 className={cn("mt-2 text-lg font-semibold text-[var(--af-color-primary)]", isMobile && "mt-1 text-[1rem] leading-[1.05] tracking-[-0.025em]")}>
                        {response.questionText || `Question ${response.questionId.toUpperCase()}`}
                      </h4>
                      <p className={cn("mt-1 text-sm text-[#665746]", isMobile && "text-[12px] leading-4.5")}>
                        {hotTake || "Ranked voice take ready for review."}
                      </p>
                    </div>

                    <div className={cn("mt-3 rounded-[1.5rem] border border-[#dbcdb8] bg-[#fffdf8] p-4", isMobile && "rounded-none border-0 bg-transparent p-0 shadow-none")}>
                      <div className={cn("flex items-center justify-between gap-3", isMobile && "items-start")}>
                        <div className="min-w-0">
                          <p className={cn("text-sm font-semibold text-[var(--af-color-primary)]", isMobile && "text-[13px]")}>
                            {response.surveyTitle}
                          </p>
                          <p className={cn("mt-1 text-sm text-[#665746]", isMobile && "text-[12px] leading-4.5")}>
                            {response.insight?.primaryTheme || "Auto-ranked voice take"}
                          </p>
                        </div>
                        <div className={cn("text-right text-xs text-[#7a6146]", isMobile && "shrink-0 rounded-2xl bg-[#f7eee2] px-2 py-1.5 text-[10px]")}>
                          <div>{formatDuration(response.durationSeconds)}</div>
                          <div>Rank {rank ?? "-"}</div>
                        </div>
                      </div>

                      {response.listening?.momentumTags?.length ? (
                        <div className={cn("mt-3 flex flex-wrap items-center gap-2", isMobile && "mt-2 gap-1.5")}>
                          {response.listening.momentumTags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className={cn("border-[#cfbea4] bg-[#fff6ed] text-[#8a431f]", isMobile && "rounded-full border-[#cfbea4]/55 px-2 py-0.5 text-[9px] uppercase tracking-[0.1em]")}>
                              <Sparkles className="mr-1 size-2.5" />
                              {getMomentumLabel(tag as ListeningMomentumTag)}
                            </Badge>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-4">
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#eadcca]">
                          <div
                            className="h-full rounded-full bg-[#b85e2d] transition-[width] duration-150 ease-linear"
                            style={{ width: `${isActive ? session.progressPercent : 0}%` }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-[#7a6146]">
                          <span>{formatPlaybackTime(isActive ? session.displayElapsedSeconds : 0)}</span>
                          <span>{formatPlaybackTime(response.durationSeconds)}</span>
                        </div>
                      </div>

                      <div className={cn("mt-4 flex items-center gap-3", isMobile && "grid grid-cols-2 gap-2")}>
                        <Button
                          className={cn("bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]", isMobile && "min-h-9 w-full rounded-full px-3 text-[12px]")}
                          onClick={() => void playTake(response.id)}
                        >
                          {isPlaying ? <Pause className="mr-2 size-4" /> : <Play className="mr-2 size-4" />}
                          {isPlaying ? "Pause" : "Play"}
                        </Button>
                        <Button
                          variant="outline"
                          className={cn("border-[#dbcdb8] bg-[#fffdf8]", isMobile && "min-h-9 w-full rounded-full border-[#dbcdb8]/55 bg-[#fff7ef] px-3 text-[12px]")}
                          onClick={() => session.setPreviewMode(!session.previewMode)}
                        >
                          {session.previewMode ? "Preview clip" : "Full take"}
                        </Button>
                      </div>
                    </div>

                    {primaryQuote ? (
                      <div className={cn("mt-3 rounded-2xl border border-[#e4d3bd] bg-[#fff8f0] px-4 py-3", isMobile && "rounded-[1rem] border-[#e4d3bd]/45 px-3 py-3")}>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[#8a431f]">Pull quote</p>
                        <blockquote className="mt-2 text-sm italic leading-6 text-[#665746]">
                          "{truncate(primaryQuote, 280)}"
                        </blockquote>
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant={response.highSignal ? "default" : "outline"}
                        className={response.highSignal ? "bg-[#2d5a17] text-[#fff6ed] hover:bg-[#244812]" : "border-[#dbcdb8] bg-[#fffdf8]"}
                        onClick={() => onMarkHighSignal?.(response.id, !response.highSignal)}
                      >
                        <Star className="mr-2 size-4" />
                        {response.highSignal ? "High signal" : "Mark signal"}
                      </Button>
                      <Button
                        variant="outline"
                        className="border-[#dbcdb8] bg-[#fffdf8]"
                        onClick={() => onBookmarkResponse?.(response.id, !response.bookmarked)}
                      >
                        <Bookmark className="mr-2 size-4" />
                        {response.bookmarked ? "Saved" : "Save"}
                      </Button>
                      <Button
                        variant={response.flagged ? "destructive" : "outline"}
                        className={!response.flagged ? "border-[#dbcdb8] bg-[#fffdf8]" : undefined}
                        onClick={() => onFlagResponse?.(response.id, !response.flagged)}
                      >
                        <Flag className="mr-2 size-4" />
                        {response.flagged ? "Flagged" : "Flag"}
                      </Button>
                      {onTogglePublicPlaylist ? (
                        <Button
                          variant="outline"
                          className="border-[#dbcdb8] bg-[#fffdf8]"
                          onClick={() => onTogglePublicPlaylist(response.id, !response.publicPlaylistEligible)}
                        >
                          {response.publicPlaylistEligible ? "Remove from public playlist" : "Add to public playlist"}
                        </Button>
                      ) : null}
                    </div>
                  </section>

                  <section className="grid gap-3">
                    <div className={cn("rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] p-4", isMobile && "rounded-[1rem] border-[#dbcdb8]/35 p-3")}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[var(--af-color-primary)]">{transcriptLabel(response)}</p>
                        <span className="text-xs uppercase tracking-[0.14em] text-[#7a6146]">Read</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#5c5146]">{transcript}</p>
                    </div>

                    <div className={cn("rounded-2xl border border-[#dbcdb8] bg-[#fffaf3] p-4", isMobile && "rounded-[1rem] border-[#dbcdb8]/35 p-3")}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Sparkles className="size-4 text-[#8a431f]" />
                          <p className="text-sm font-medium text-[var(--af-color-primary)]">Narrative summary</p>
                          {response.insight?.signalScore != null ? (
                            <span className="text-xs font-medium text-[#7a6146]">{response.insight.signalScore}/100</span>
                          ) : null}
                        </div>
                        <span className="text-xs uppercase tracking-[0.14em] text-[#7a6146]">Interpret</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#5c5146]">{summary}</p>
                      {!response.insight ? (
                        <Button
                          variant="outline"
                          className="mt-3 border-[#cfbea4] bg-[#fff6ed] text-[#7a6146]"
                          disabled={!onExtractInsight || extractingInsightId === response.id}
                          onClick={() => onExtractInsight?.(response.id)}
                        >
                          {extractingInsightId === response.id ? "Generating..." : "Generate narrative summary"}
                        </Button>
                      ) : null}
                    </div>
                    {response.insight?.signalSummary ? (
                      <div className={cn("rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] p-4", isMobile && "rounded-[1rem] border-[#dbcdb8]/35 p-3")}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-[var(--af-color-primary)]">Signal</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#7a6146]">
                            {response.insight.signalSummary.emotion ? <span className="capitalize">{response.insight.signalSummary.emotion}</span> : null}
                            {response.insight.signalSummary.confidence != null ? (
                              <span>{Math.round(response.insight.signalSummary.confidence * 100)}%</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3 space-y-2 text-sm text-[#665746]">
                          {response.insight.signalSummary.complaint ? (
                            <p><span className="font-medium text-[var(--af-color-primary)]">Complaint:</span> {response.insight.signalSummary.complaint}</p>
                          ) : null}
                          {response.insight.signalSummary.opportunity ? (
                            <p><span className="font-medium text-[var(--af-color-primary)]">Opportunity:</span> {response.insight.signalSummary.opportunity}</p>
                          ) : null}
                          {response.insight.signalSummary.emotion ? (
                            <p><span className="font-medium text-[var(--af-color-primary)]">Emotion:</span> {response.insight.signalSummary.emotion}</p>
                          ) : null}
                          {response.insight.signalSummary.frictionMoment ? (
                            <p><span className="font-medium text-[var(--af-color-primary)]">Friction moment:</span> {response.insight.signalSummary.frictionMoment}</p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </section>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
