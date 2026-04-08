"use client"

import { useEffect, useMemo, useState } from "react"
import { AudioLines, Pause, Play, SkipForward, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/components/ui/use-mobile"
import { cn } from "@/lib/utils"
import { useListeningSession } from "@/components/listen/listening-session-provider"
import { getMomentumLabel, type ListeningMomentumTag, type ListeningPreviewClipRange } from "@/lib/listening-model"

export type ListeningTrack = {
  id: string
  title: string
  subtitle?: string | null
  playbackUrl: string
  durationSeconds?: number | null
  transcript?: string | null
  listening: {
    rank: number
    hotTake: string
    momentumTags: string[]
    previewClipRange?: ListeningPreviewClipRange | null
  }
}

type AudioSequencePlayerProps = {
  tracks: ListeningTrack[]
  title: string
  description: string
  previewByDefault?: boolean
  compact?: boolean
  persistSession?: boolean
  sessionSource?: string
  onSelectTrack?: (trackId: string) => void
}

function formatDuration(seconds?: number | null) {
  if (!seconds && seconds !== 0) return "Unknown"
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function formatPlaybackTime(seconds?: number | null) {
  const safeSeconds = Math.max(0, Math.floor(seconds ?? 0))
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function getTrackPlaybackState(
  session: ReturnType<typeof useListeningSession>,
  track: ListeningTrack,
  source: string,
) {
  const isActive = session.activeSource === source && session.currentTrack?.id === track.id
  return {
    isActive,
    isPlaying: isActive && session.playingId === track.id,
    elapsed: isActive ? session.displayElapsedSeconds : 0,
    duration: track.durationSeconds ?? session.durationSeconds ?? 0,
    progressPercent: isActive ? session.progressPercent : 0,
  }
}

export function AudioSequencePlayer({
  tracks,
  title,
  description,
  previewByDefault = true,
  compact = false,
  persistSession = false,
  sessionSource,
  onSelectTrack,
}: AudioSequencePlayerProps) {
  const session = useListeningSession()
  const isMobile = useIsMobile()
  const [selectedId, setSelectedId] = useState<string | null>(tracks[0]?.id ?? null)
  const [previewMode, setPreviewMode] = useState(previewByDefault)
  const source = sessionSource ?? title

  useEffect(() => {
    setSelectedId((current) => (current && tracks.some((track) => track.id === current) ? current : (tracks[0]?.id ?? null)))
  }, [tracks])

  useEffect(() => {
    if (!sessionSource || session.activeSource !== sessionSource) return
    setPreviewMode(session.previewMode)
  }, [session.activeSource, session.previewMode, sessionSource])

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedId) ?? tracks[0] ?? null,
    [tracks, selectedId],
  )

  const playTrack = async (trackId: string) => {
    const track = tracks.find((item) => item.id === trackId)
    if (!track) return

    setSelectedId(track.id)
    onSelectTrack?.(track.id)
    const sameSource = session.activeSource === source
    const sameQueue =
      sameSource &&
      session.queue.length === tracks.length &&
      session.queue.every((queueTrack, index) => queueTrack.id === tracks[index]?.id)

    if (sameQueue) {
      await session.playTrack(track.id)
      return
    }

    await session.loadQueue(tracks, {
      selectedTrackId: track.id,
      autoplay: true,
      previewMode,
      source,
    })
  }

  const handleTogglePlay = () => {
    if (!selectedTrack) return
    void playTrack(selectedTrack.id)
  }

  const handleNext = () => {
    if (!selectedTrack) return
    const index = tracks.findIndex((track) => track.id === selectedTrack.id)
    if (index >= 0 && index < tracks.length - 1) {
      void playTrack(tracks[index + 1].id)
    }
  }

  if (!selectedTrack) {
    return null
  }

  const selectedPlayback = getTrackPlaybackState(session, selectedTrack, source)

  return (
    <div className={cn("rounded-[1.75rem] border border-[#dbcdb8] bg-[#fff8f0] p-4 shadow-sm", isMobile && "border-0 bg-transparent p-0 shadow-none")}>
      <div className={cn("flex flex-wrap items-start justify-between gap-3", isMobile && "gap-2") }>
        <div className="min-w-0">
          <p className={cn("text-xs uppercase tracking-[0.18em] text-[#8a431f]", isMobile && "text-[10px] tracking-[0.16em]")}>{title}</p>
          <h3 className={cn("mt-2 text-xl font-semibold text-[var(--af-color-primary)]", isMobile && "mt-1 text-[1.12rem] leading-[1.06] tracking-[-0.025em]")}>{selectedTrack.title}</h3>
          <p className={cn("mt-1 text-sm text-[#5c5146]", isMobile && "text-[12px] leading-4.5")}>{description}</p>
        </div>
        <Button
          variant="outline"
          className={cn("border-[#dbcdb8] bg-[#fffdf8] text-[#7a6146]", isMobile && "min-h-8 w-full rounded-full border-[#dbcdb8]/60 bg-[#fff7ef] px-3 text-[11px]")}
          onClick={() => {
            const nextMode = !previewMode
            setPreviewMode(nextMode)
            session.setPreviewMode(nextMode)
          }}
        >
          {previewMode ? "Preview clip" : "Full take"}
        </Button>
      </div>

      <div className={cn("mt-4 rounded-[1.5rem] border border-[#dbcdb8] bg-[#fffdf8] p-4", isMobile && "mt-2.5 rounded-none border-0 bg-transparent p-0 shadow-none")}>
        <div className={cn("flex items-center justify-between gap-3", isMobile && "items-start") }>
          <div className="min-w-0">
            <p className={cn("text-sm font-semibold text-[var(--af-color-primary)]", isMobile && "text-[13px]")}>{selectedTrack.subtitle || "Auto-ranked voice take"}</p>
            <p className={cn("mt-1 text-sm text-[#665746]", isMobile && "text-[12px] leading-4.5")}>{selectedTrack.listening.hotTake}</p>
          </div>
          <div className={cn("text-right text-xs text-[#7a6146]", isMobile && "shrink-0 rounded-2xl bg-[#f7eee2] px-2 py-1.5 text-[10px]")}>
            <div>{formatDuration(selectedTrack.durationSeconds)}</div>
            <div>Rank {selectedTrack.listening.rank}</div>
          </div>
        </div>

        <div className={cn("mt-3 flex flex-wrap items-center gap-2", isMobile && "mt-2 gap-1.5") }>
          {selectedTrack.listening.momentumTags.map((tag) => (
            <Badge key={tag} variant="outline" className={cn("border-[#cfbea4] bg-[#fff6ed] text-[#8a431f]", isMobile && "rounded-full border-[#cfbea4]/55 px-2 py-0.5 text-[9px] uppercase tracking-[0.1em]")}>
              <Sparkles className="mr-1 size-2.5" />
              {getMomentumLabel(tag as ListeningMomentumTag)}
            </Badge>
          ))}
        </div>

        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#eadcca]">
            <div
              className="h-full rounded-full bg-[#b85e2d] transition-[width] duration-150 ease-linear"
              style={{ width: `${selectedPlayback.progressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[#7a6146]">
            <span>{formatPlaybackTime(selectedPlayback.elapsed)}</span>
            <span>{formatPlaybackTime(selectedPlayback.duration)}</span>
          </div>
        </div>

        <div className={cn("mt-4 flex items-center gap-3", isMobile && "mt-3 grid grid-cols-2 gap-2") }>
          <Button className={cn("bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]", isMobile && "min-h-9 w-full rounded-full px-3 text-[12px]")} onClick={handleTogglePlay}>
            {selectedPlayback.isPlaying ? <Pause className="mr-2 size-4" /> : <Play className="mr-2 size-4" />}
            {selectedPlayback.isPlaying ? "Pause" : "Play"}
          </Button>
          <Button variant="outline" className={cn("border-[#dbcdb8] bg-[#fffdf8]", isMobile && "min-h-9 w-full rounded-full border-[#dbcdb8]/55 bg-[#fff7ef] px-3 text-[12px]")} onClick={handleNext}>
            <SkipForward className="mr-2 size-4" />
            Next
          </Button>
        </div>
      </div>

      <div className={cn("mt-4 space-y-2", compact && !isMobile && "af-scrollless max-h-64 overflow-auto", isMobile && "mt-3 space-y-1.5")}>
        {tracks.map((track, index) => {
          const playback = getTrackPlaybackState(session, track, source)
          return (
            <button
              key={track.id}
              type="button"
              onClick={() => {
                setSelectedId(track.id)
                onSelectTrack?.(track.id)
                void playTrack(track.id)
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-colors",
                isMobile && "items-start gap-2.5 rounded-[1rem] border-[#dbcdb8]/55 px-2.5 py-2.5",
                selectedTrack.id === track.id
                  ? "border-[#b85e2d] bg-[#fff1e6]"
                  : "border-[#dbcdb8] bg-[#fffdf8] hover:bg-[#f7efe4]",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-semibold text-[var(--af-color-primary)]", isMobile && "text-[12px] leading-4.5")}>
                  {index + 1}. {track.title}
                </p>
                <p className={cn("mt-1 truncate text-xs text-[#665746]", isMobile && "line-clamp-2 whitespace-normal pr-2 text-[11px] leading-4.5")}>{track.listening.hotTake}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#eadcca]">
                  <div
                    className="h-full rounded-full bg-[#b85e2d] transition-[width] duration-150 ease-linear"
                    style={{ width: `${playback.progressPercent}%` }}
                  />
                </div>
              </div>
              <div className={cn("ml-3 flex items-center gap-2 text-xs text-[#7a6146]", isMobile && "ml-0 shrink-0 rounded-full bg-[#f7eee2] px-1.5 py-1 text-[9px]")}>
                <AudioLines className={cn("size-3.5", isMobile && "size-3")} />
                {playback.isActive
                  ? `${formatPlaybackTime(playback.elapsed)} / ${formatPlaybackTime(playback.duration)}`
                  : formatDuration(track.durationSeconds)}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
