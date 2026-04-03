"use client"

import { useEffect, useMemo, useState } from "react"
import { AudioLines, Pause, Play, SkipForward, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
    <div className="rounded-[1.75rem] border border-[#dbcdb8] bg-[#fff8f0] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">{title}</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--af-color-primary)]">{selectedTrack.title}</h3>
          <p className="mt-1 text-sm text-[#5c5146]">{description}</p>
        </div>
        <Button
          variant="outline"
          className="border-[#dbcdb8] bg-[#fffdf8] text-[#7a6146]"
          onClick={() => {
            const nextMode = !previewMode
            setPreviewMode(nextMode)
            session.setPreviewMode(nextMode)
          }}
        >
          {previewMode ? "Preview clip" : "Full take"}
        </Button>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--af-color-primary)]">{selectedTrack.subtitle || "Auto-ranked voice take"}</p>
            <p className="mt-1 text-sm text-[#665746]">{selectedTrack.listening.hotTake}</p>
          </div>
          <div className="text-right text-xs text-[#7a6146]">
            <div>{formatDuration(selectedTrack.durationSeconds)}</div>
            <div>Rank {selectedTrack.listening.rank}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {selectedTrack.listening.momentumTags.map((tag) => (
            <Badge key={tag} variant="outline" className="border-[#cfbea4] bg-[#fff6ed] text-[#8a431f]">
              <Sparkles className="mr-1 size-3" />
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

        <div className="mt-4 flex items-center gap-3">
          <Button className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]" onClick={handleTogglePlay}>
            {selectedPlayback.isPlaying ? <Pause className="mr-2 size-4" /> : <Play className="mr-2 size-4" />}
            {selectedPlayback.isPlaying ? "Pause" : "Play"}
          </Button>
          <Button variant="outline" className="border-[#dbcdb8] bg-[#fffdf8]" onClick={handleNext}>
            <SkipForward className="mr-2 size-4" />
            Next
          </Button>
        </div>
      </div>

      <div className={cn("mt-4 space-y-2", compact && "max-h-64 overflow-auto")}>
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
                selectedTrack.id === track.id
                  ? "border-[#b85e2d] bg-[#fff1e6]"
                  : "border-[#dbcdb8] bg-[#fffdf8] hover:bg-[#f7efe4]",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--af-color-primary)]">
                  {index + 1}. {track.title}
                </p>
                <p className="mt-1 truncate text-xs text-[#665746]">{track.listening.hotTake}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#eadcca]">
                  <div
                    className="h-full rounded-full bg-[#b85e2d] transition-[width] duration-150 ease-linear"
                    style={{ width: `${playback.progressPercent}%` }}
                  />
                </div>
              </div>
              <div className="ml-3 flex items-center gap-2 text-xs text-[#7a6146]">
                <AudioLines className="size-3.5" />
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
