"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Copy,
  Flag,
  Globe,
  Lock,
  Mic,
  Pause,
  Play,
  Quote,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useListeningSession } from "@/components/listen/listening-session-provider"
import { cn } from "@/lib/utils"

export type MobileTakeCardItem = {
  id: string
  releaseId: string
  releaseTitle: string
  playbackUrl: string
  durationSeconds: number | null
  timestampLabel: string
  transcript: string | null
  rank: number | null
  saved?: boolean
  flagged?: boolean
  previewStart?: number | null
  previewEnd?: number | null
  insight: {
    narrativeSummary: string | null
    complaint?: string | null
    opportunity?: string | null
    powerQuote: string | null
    primaryTheme: string | null
    themes: string[]
    signalScore: number | null
    sentiment: "positive" | "neutral" | "negative"
  }
}

export type MobileReleaseCardItem = {
  id: string
  title: string
  description?: string | null
  publicListening: boolean
  takeCount: number
  href?: string
}

export type MobileClusterItem = {
  id: string
  label: string
  count: number
  description: string
  representativeQuote: string | null
}

function formatDuration(seconds?: number | null) {
  if (!seconds && seconds !== 0) return "--:--"
  const safeSeconds = Math.max(0, Math.round(seconds))
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function ThemeTag({ label, primary = false }: { label: string; primary?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[9px] font-medium tracking-[0.01em]",
        primary ? "bg-[#f2ddcd] text-[#8a431f]" : "bg-[#f3ecdf] text-[#665746]",
      )}
    >
      {label}
    </span>
  )
}

export function SignalBadge({ score, sentiment }: { score: number | null; sentiment: "positive" | "neutral" | "negative" }) {
  const tone = score != null && score >= 85 ? "bg-[#e8f2e0] text-[#2d5a17]" : score != null && score >= 70 ? "bg-[#fff0e1] text-[#b85e2d]" : "bg-[#f3ecdf] text-[#665746]"
  const symbol = sentiment === "positive" ? "+" : sentiment === "negative" ? "-" : "o"
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-[0.02em]", tone)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      <span>{score != null ? Math.round(score) : "--"}</span>
      <span className="opacity-75">{symbol}</span>
    </span>
  )
}

export function MiniAudioPlayer({
  trackId,
  title,
  subtitle,
  hotTake,
  playbackUrl,
  durationSeconds,
  previewStart,
  previewEnd,
  source,
}: {
  trackId: string
  title: string
  subtitle?: string | null
  hotTake?: string | null
  playbackUrl: string
  durationSeconds: number | null
  previewStart?: number | null
  previewEnd?: number | null
  source: string
}) {
  const session = useListeningSession()
  const previewClipRange = previewEnd != null ? { startSeconds: previewStart ?? 0, endSeconds: previewEnd } : null
  const previewDuration = previewClipRange ? previewClipRange.endSeconds - previewClipRange.startSeconds : durationSeconds ?? 0
  const isActive = session.activeSource === source && session.currentTrack?.id === trackId
  const isPlaying = session.playingId === trackId
  const progress = isActive ? session.progressPercent : 0

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => {
          if (session.activeSource === source && session.currentTrack?.id === trackId) {
            void session.toggleTrack(trackId)
            return
          }
          void session.loadQueue([{ id: trackId, title, subtitle: subtitle || "", playbackUrl, durationSeconds, transcript: null, listening: { rank: 0, hotTake: hotTake || "", momentumTags: [], previewClipRange } }], {
            selectedTrackId: trackId,
            autoplay: true,
            previewMode: Boolean(previewClipRange),
            source,
          })
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#b85e2d] text-[#fff6ed] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
      >
        {isPlaying ? <Pause className="size-3.5" /> : <Play className="ml-0.5 size-3.5 fill-current" />}
      </button>
      <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-[#f6efe4]">
        <div className="absolute inset-y-0 left-0 rounded-full bg-[#f2ddcd]/90" style={{ width: `${progress}%` }} />
        <div className="relative flex h-full items-center justify-between gap-[3px] px-2.5">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="w-[2px] rounded-full bg-[#bda98c]"
              style={{ height: `${6 + ((i * 7) % 12)}px`, opacity: 0.35 + ((i % 5) * 0.08) }}
            />
          ))}
        </div>
      </div>
      <span className="text-[9px] tabular-nums text-[#7a6146]">{formatDuration(previewDuration)}</span>
    </div>
  )
}

export function TakeCard({
  take,
  source,
  onSave,
  onFlag,
}: {
  take: MobileTakeCardItem
  source: string
  onSave?: (id: string) => void
  onFlag?: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <article className="rounded-[1rem] border border-[#dbcdb8]/28 bg-[#fffdf8] p-3 shadow-[0_4px_12px_rgba(86,57,25,0.03)]">
      <div className="block w-full text-left">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-[0.6rem] bg-[#f2ddcd] text-[10px] font-bold text-[#8a431f]">
            #{take.rank ?? "-"}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <SignalBadge score={take.insight.signalScore != null ? take.insight.signalScore * 100 : null} sentiment={take.insight.sentiment} />
              <span className="text-[10px] text-[#8c7f70]">{take.timestampLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onSave?.(take.id)
              }}
              className={cn("inline-flex h-7 w-7 items-center justify-center rounded-[0.6rem] bg-[#f3ecdf] text-[#8c7f70]", take.saved && "bg-[#f2ddcd] text-[#8a431f]")}
            >
              <Bookmark className={cn("size-3.5", take.saved && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onFlag?.(take.id)
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-[0.6rem] bg-[#f3ecdf] text-[#8c7f70]"
            >
              <Flag className="size-3.5" />
            </button>
          </div>
        </div>

        <button type="button" className="mt-2.5 flex w-full gap-2 text-left" onClick={() => setExpanded((value) => !value)}>
          <Quote className="mt-0.5 size-3.5 shrink-0 text-[#b85e2d]" />
          <p className="flex-1 text-[13px] font-medium italic leading-[1.55] text-[var(--af-color-primary)] line-clamp-2">
            {take.insight.powerQuote || take.insight.narrativeSummary || "Signal summary pending."}
          </p>
        </button>

        <div className="mt-2.5">
          <MiniAudioPlayer
            trackId={take.id}
            title={take.releaseTitle}
            subtitle={take.insight.primaryTheme}
            hotTake={take.insight.powerQuote || take.insight.narrativeSummary}
            playbackUrl={take.playbackUrl}
            durationSeconds={take.durationSeconds}
            previewStart={take.previewStart}
            previewEnd={take.previewEnd}
            source={source}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {take.insight.primaryTheme ? <ThemeTag label={take.insight.primaryTheme} primary /> : null}
          {take.insight.themes.slice(0, expanded ? 3 : 1).map((theme) => (
            <ThemeTag key={theme} label={theme} />
          ))}
        </div>

        {expanded ? (
          <div className="mt-2.5 border-t border-[#eadcca]/80 pt-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a6146]">Summary</p>
            <p className="mt-1.5 text-[12px] leading-5 text-[#5c5146]">{take.insight.narrativeSummary || "No narrative summary yet."}</p>
            {take.insight.complaint ? (
              <div className="mt-2.5 rounded-[0.9rem] bg-[#fff3e8] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a6146]">Key complaint</p>
                <p className="mt-1 text-[12px] font-medium leading-5 text-[#8a431f]">{take.insight.complaint}</p>
              </div>
            ) : null}
            {take.insight.opportunity ? (
              <div className="mt-2.5 rounded-[0.9rem] bg-[#eef6e8] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a6146]">Opportunity</p>
                <p className="mt-1 text-[12px] font-medium leading-5 text-[#2d5a17]">{take.insight.opportunity}</p>
              </div>
            ) : null}
            <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a6146]">Transcript</p>
            <p className="mt-1.5 text-[12px] leading-5 text-[#8c7f70]">{take.transcript || "Transcript still processing."}</p>
          </div>
        ) : null}

        <button type="button" className="mt-1.5 flex w-full justify-center text-[#bda98c]" onClick={() => setExpanded((value) => !value)}>
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>
    </article>
  )
}

export function ClusterCard({ cluster, rank }: { cluster: MobileClusterItem; rank?: number }) {
  return (
    <article className="rounded-[1rem] border border-[#dbcdb8]/28 bg-[#fffdf8] p-3 shadow-[0_4px_12px_rgba(86,57,25,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {rank ? <span className="inline-flex h-6 w-6 items-center justify-center rounded-[0.45rem] bg-[#e8f2e0] text-[10px] font-bold text-[#2d5a17]">#{rank}</span> : null}
          <h3 className="text-[14px] font-semibold text-[var(--af-color-primary)]">{cluster.label}</h3>
        </div>
        <span className="rounded-full bg-[#f3ecdf] px-2 py-0.5 text-[11px] font-semibold text-[#665746]">{cluster.count}</span>
      </div>
      <p className="mt-1.5 text-[12px] leading-5 text-[#5c5146]">{cluster.description}</p>
      {cluster.representativeQuote ? (
        <div className="mt-2.5 rounded-[0.9rem] bg-[#f7efe4] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a6146]">Representative quote</p>
          <p className="mt-1 text-[12px] italic leading-5 text-[var(--af-color-primary)]">"{cluster.representativeQuote}"</p>
        </div>
      ) : null}
    </article>
  )
}

export function ReleaseCard({ release, onPress }: { release: MobileReleaseCardItem; onPress?: (release: MobileReleaseCardItem) => void }) {
  const content = (
    <article className="w-[15.75rem] rounded-[1rem] border border-[#dbcdb8]/28 bg-[#fffdf8] p-3 shadow-[0_4px_12px_rgba(86,57,25,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-[#f2ddcd] text-[#8a431f]">
          <Mic className="size-4" />
        </span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-[0.6rem] bg-[#f3ecdf] text-[#8c7f70]">
          {release.publicListening ? <Globe className="size-3.5 text-[#2d5a17]" /> : <Lock className="size-3.5" />}
        </span>
      </div>
      <h3 className="mt-2.5 text-[14px] font-semibold leading-5 text-[var(--af-color-primary)] line-clamp-2">{release.title}</h3>
      {release.description ? <p className="mt-1 text-[12px] leading-5 text-[#8c7f70] line-clamp-2">{release.description}</p> : null}
      <div className="mt-2.5 flex items-center justify-between border-t border-[#eadcca]/80 pt-2.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#8c7f70]">
          <Users className="size-3.5" />
          {release.takeCount} takes
        </span>
        <ArrowRight className="size-4 text-[#bda98c]" />
      </div>
    </article>
  )

  if (release.href) {
    return <Link href={release.href}>{content}</Link>
  }

  return (
    <button type="button" onClick={() => onPress?.(release)} className="text-left">
      {content}
    </button>
  )
}

export function ShareQuoteCard({
  quote,
  onCopy,
  onShare,
  copied,
}: {
  quote: string
  onCopy: () => void
  onShare: () => void
  copied?: boolean
}) {
  return (
    <article className="rounded-[1rem] border border-[#dbcdb8]/28 bg-[#fffdf8] p-3 shadow-[0_4px_12px_rgba(86,57,25,0.03)]">
      <Quote className="size-4 text-[#b85e2d]" />
      <p className="mt-1.5 text-[13px] italic leading-[1.55] text-[var(--af-color-primary)]">"{quote}"</p>
      <div className="mt-2.5 flex gap-1.5">
        <button type="button" onClick={onCopy} className="inline-flex h-8 w-8 items-center justify-center rounded-[0.65rem] bg-[#f3ecdf] text-[#8c7f70]">
          {copied ? <span className="text-[11px] font-bold text-[#2d5a17]">OK</span> : <Copy className="size-3.5" />}
        </button>
        <Button type="button" variant="outline" className="h-8 border-[#dbcdb8]/55 bg-[#fff7ee] px-3 text-[11px]" onClick={onShare}>
          Share
        </Button>
      </div>
    </article>
  )
}
