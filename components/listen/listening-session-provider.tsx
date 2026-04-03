"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Headphones,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  SkipForward,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ListeningTrack } from "@/components/listen/audio-sequence-player"

type LoadQueueOptions = {
  selectedTrackId?: string | null
  autoplay?: boolean
  previewMode?: boolean
  source?: string
}

type ListeningSessionValue = {
  queue: ListeningTrack[]
  currentTrack: ListeningTrack | null
  selectedTrackId: string | null
  playingId: string | null
  previewMode: boolean
  activeSource: string | null
  isMinimized: boolean
  playbackError: string | null
  currentTimeSeconds: number
  durationSeconds: number
  displayElapsedSeconds: number
  progressPercent: number
  loadQueue: (tracks: ListeningTrack[], options?: LoadQueueOptions) => Promise<void>
  toggleTrack: (trackId: string) => Promise<void>
  playTrack: (trackId: string) => Promise<void>
  pause: () => void
  nextTrack: () => Promise<void>
  setPreviewMode: (enabled: boolean) => void
  setMinimized: (enabled: boolean) => void
  retryCurrent: () => Promise<void>
}

const STORAGE_KEY = "audioform_listening_session_v1"

const ListeningSessionContext = createContext<ListeningSessionValue | null>(null)

function waitForAudioEvent(audio: HTMLAudioElement, eventName: "loadedmetadata" | "canplay", timeoutMs = 4000) {
  return new Promise<void>((resolve, reject) => {
    if (eventName === "loadedmetadata" && Number.isFinite(audio.duration) && audio.readyState >= 1) {
      resolve()
      return
    }
    if (eventName === "canplay" && audio.readyState >= 3) {
      resolve()
      return
    }

    let settled = false
    const cleanup = () => {
      audio.removeEventListener(eventName, handleSuccess)
      audio.removeEventListener("error", handleError)
      window.clearTimeout(timer)
    }

    const handleSuccess = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }

    const handleError = () => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(`Audio failed while waiting for ${eventName}.`))
    }

    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(`Timed out waiting for ${eventName}.`))
    }, timeoutMs)

    audio.addEventListener(eventName, handleSuccess, { once: true })
    audio.addEventListener("error", handleError, { once: true })
  })
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

export function ListeningSessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stopTimerRef = useRef<number | null>(null)
  const queueRef = useRef<ListeningTrack[]>([])
  const objectUrlRef = useRef<string | null>(null)
  const [queue, setQueue] = useState<ListeningTrack[]>([])
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [previewMode, setPreviewModeState] = useState(true)
  const [activeSource, setActiveSource] = useState<string | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0)
  const [durationSeconds, setDurationSeconds] = useState(0)

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  const clearPreviewTimer = () => {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }
  }

  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handlePlay = () => {
      if (selectedTrackId) setPlayingId(selectedTrackId)
      setPlaybackError(null)
    }

    const handlePause = () => {
      setPlayingId(null)
    }

    const handleLoadedMetadata = () => {
      setDurationSeconds(Number.isFinite(audio.duration) ? audio.duration : 0)
      setCurrentTimeSeconds(audio.currentTime || 0)
    }

    const handleTimeUpdate = () => {
      setCurrentTimeSeconds(audio.currentTime || 0)
      if (Number.isFinite(audio.duration)) {
        setDurationSeconds(audio.duration)
      }
    }

    const handleEnded = () => {
      const currentIndex = queueRef.current.findIndex((track) => track.id === selectedTrackId)
      if (currentIndex >= 0 && currentIndex < queueRef.current.length - 1) {
        void playTrackInternal(queueRef.current, queueRef.current[currentIndex + 1].id, previewMode)
      } else {
        setPlayingId(null)
      }
    }

    const handleError = () => {
      setPlayingId(null)
      setPlaybackError("Playback failed. Try again or open the take detail.")
    }

    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("error", handleError)

    return () => {
      audio.pause()
      audio.src = ""
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("error", handleError)
      clearPreviewTimer()
      revokeObjectUrl()
    }
  }, [previewMode, selectedTrackId])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        queue?: ListeningTrack[]
        selectedTrackId?: string | null
        previewMode?: boolean
        activeSource?: string | null
        isMinimized?: boolean
      }
      if (Array.isArray(parsed.queue) && parsed.queue.length > 0) {
        setQueue(parsed.queue)
        setSelectedTrackId(parsed.selectedTrackId ?? parsed.queue[0]?.id ?? null)
      }
      if (typeof parsed.previewMode === "boolean") setPreviewModeState(parsed.previewMode)
      if (typeof parsed.activeSource === "string") setActiveSource(parsed.activeSource)
      if (typeof parsed.isMinimized === "boolean") setIsMinimized(parsed.isMinimized)
    } catch {
      // Ignore stale session payloads.
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ queue, selectedTrackId, previewMode, activeSource, isMinimized }),
      )
    } catch {
      // Non-blocking persistence.
    }
  }, [activeSource, isMinimized, previewMode, queue, selectedTrackId])

  const schedulePreviewStop = (tracks: ListeningTrack[], trackId: string, preview: boolean) => {
    const audio = audioRef.current
    const track = tracks.find((item) => item.id === trackId)
    if (!audio || !track || !preview || !track.listening.previewClipRange) return

    clearPreviewTimer()

    const clip = track.listening.previewClipRange
    const durationMs = Math.max(1200, (clip.endSeconds - clip.startSeconds) * 1000)
    stopTimerRef.current = window.setTimeout(() => {
      const currentIndex = tracks.findIndex((item) => item.id === trackId)
      if (currentIndex >= 0 && currentIndex < tracks.length - 1) {
        void playTrackInternal(tracks, tracks[currentIndex + 1].id, preview)
      } else {
        audio.pause()
        setPlayingId(null)
      }
    }, durationMs)
  }

  const resolveTrackObjectUrl = async (track: ListeningTrack) => {
    const response = await fetch(track.playbackUrl, {
      credentials: "include",
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Audio request failed with ${response.status}.`)
    }

    const blob = await response.blob()
    revokeObjectUrl()
    const objectUrl = URL.createObjectURL(blob)
    objectUrlRef.current = objectUrl
    return objectUrl
  }

  const playTrackInternal = async (tracks: ListeningTrack[], trackId: string, preview: boolean) => {
    const audio = audioRef.current
    const track = tracks.find((item) => item.id === trackId)
    if (!audio || !track) return

    clearPreviewTimer()
    setSelectedTrackId(track.id)
    setPlaybackError(null)

    if (playingId === track.id) {
      audio.pause()
      setPlayingId(null)
      return
    }

    if (selectedTrackId === track.id && audio.src && audio.readyState >= 2 && audio.paused) {
      try {
        await audio.play()
        setPlayingId(track.id)
        schedulePreviewStop(tracks, track.id, preview)
      } catch (error) {
        console.error("[listening-session] failed to resume track", {
          trackId: track.id,
          message: error instanceof Error ? error.message : String(error),
        })
        setPlaybackError("Playback failed. Try again or open the take detail.")
      }
      return
    }

    audio.pause()

    const clip = track.listening.previewClipRange

    try {
      const objectUrl = await resolveTrackObjectUrl(track)
      audio.src = objectUrl
      audio.load()
      await waitForAudioEvent(audio, preview && clip ? "loadedmetadata" : "canplay")
      if (preview && clip) {
        const safeStart = Math.max(0, clip.startSeconds)
        const duration = Number.isFinite(audio.duration) ? audio.duration : null
        audio.currentTime = duration != null ? Math.min(safeStart, Math.max(duration - 0.05, 0)) : safeStart
      } else {
        audio.currentTime = 0
      }
      setCurrentTimeSeconds(audio.currentTime || 0)
      setDurationSeconds(Number.isFinite(audio.duration) ? audio.duration : (track.durationSeconds ?? 0))
      await audio.play()
      setPlayingId(track.id)
      schedulePreviewStop(tracks, track.id, preview)
    } catch (error) {
      console.error("[listening-session] failed to play track", {
        trackId: track.id,
        playbackUrl: track.playbackUrl,
        preview,
        clip,
        readyState: audio.readyState,
        networkState: audio.networkState,
        mediaErrorCode: audio.error?.code ?? null,
        mediaErrorMessage: audio.error?.message ?? null,
        message: error instanceof Error ? error.message : String(error),
      })
      setPlayingId(null)
      setPlaybackError("Playback failed. Try again or open the take detail.")
    }
  }

  const loadQueue = async (tracks: ListeningTrack[], options?: LoadQueueOptions) => {
    const nextTracks = tracks.filter(Boolean)
    setQueue(nextTracks)
    queueRef.current = nextTracks
    const nextPreviewMode = options?.previewMode ?? previewMode
    setPreviewModeState(nextPreviewMode)
    setActiveSource(options?.source ?? null)
    setIsMinimized(false)
    const nextSelected = options?.selectedTrackId ?? nextTracks[0]?.id ?? null
    setSelectedTrackId(nextSelected)

    if (options?.autoplay && nextSelected) {
      await playTrackInternal(nextTracks, nextSelected, nextPreviewMode)
    }
  }

  const playTrack = async (trackId: string) => {
    await playTrackInternal(queueRef.current, trackId, previewMode)
  }

  const toggleTrack = async (trackId: string) => {
    await playTrackInternal(queueRef.current, trackId, previewMode)
  }

  const pause = () => {
    clearPreviewTimer()
    audioRef.current?.pause()
    setPlayingId(null)
  }

  const nextTrack = async () => {
    if (!selectedTrackId) return
    const currentIndex = queueRef.current.findIndex((track) => track.id === selectedTrackId)
    if (currentIndex >= 0 && currentIndex < queueRef.current.length - 1) {
      await playTrackInternal(queueRef.current, queueRef.current[currentIndex + 1].id, previewMode)
    }
  }

  const setPreviewMode = (enabled: boolean) => {
    setPreviewModeState(enabled)
  }

  const retryCurrent = async () => {
    if (!selectedTrackId) return
    await playTrackInternal(queueRef.current, selectedTrackId, previewMode)
  }

  const currentTrack = useMemo(
    () => queue.find((track) => track.id === selectedTrackId) ?? queue[0] ?? null,
    [queue, selectedTrackId],
  )

  const previewClip = previewMode ? currentTrack?.listening.previewClipRange ?? null : null
  const previewStart = previewClip?.startSeconds ?? 0
  const previewDuration = previewClip ? Math.max(0, previewClip.endSeconds - previewClip.startSeconds) : 0
  const safeDurationSeconds = currentTrack?.durationSeconds ?? durationSeconds ?? 0
  const displayElapsedSeconds = Math.max(0, currentTimeSeconds - previewStart)
  const progressBase = previewClip ? Math.max(previewDuration, 0.001) : Math.max(safeDurationSeconds || durationSeconds, 0.001)
  const progressValue = previewClip ? displayElapsedSeconds : currentTimeSeconds
  const progressPercent = Math.max(0, Math.min(100, (progressValue / progressBase) * 100))

  const value: ListeningSessionValue = {
    queue,
    currentTrack,
    selectedTrackId,
    playingId,
    previewMode,
    activeSource,
    isMinimized,
    playbackError,
    currentTimeSeconds,
    durationSeconds: safeDurationSeconds,
    displayElapsedSeconds,
    progressPercent,
    loadQueue,
    toggleTrack,
    playTrack,
    pause,
    nextTrack,
    setPreviewMode,
    setMinimized: setIsMinimized,
    retryCurrent,
  }

  const showDock = Boolean(pathname?.startsWith("/admin") && currentTrack)
  const openReleaseHref =
    activeSource?.startsWith("release:") && activeSource.slice("release:".length)
      ? `/admin/responses?surveyId=${encodeURIComponent(activeSource.slice("release:".length))}`
      : "/admin/responses"

  return (
    <ListeningSessionContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        playsInline
        className="pointer-events-none fixed -left-[9999px] top-auto h-px w-px opacity-0"
      />
      {showDock ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          {isMinimized ? (
            <div className="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-full border border-[#cfbea4] bg-[#fff7ee]/95 px-4 py-3 shadow-[0_18px_40px_rgba(63,35,16,0.18)] backdrop-blur">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a431f]">Listening</p>
                <p className="truncate text-sm font-semibold text-[var(--af-color-primary)]">
                  {currentTrack?.title || "Persistent player"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]"
                  size="sm"
                  onClick={() => {
                    if (!currentTrack) return
                    void toggleTrack(currentTrack.id)
                  }}
                >
                  {playingId === currentTrack?.id ? <Pause className="size-4" /> : <Play className="size-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-[#dbcdb8] bg-[#fffdf8]"
                  onClick={() => setIsMinimized(false)}
                >
                  <Maximize2 className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="pointer-events-auto w-full max-w-3xl rounded-[1.4rem] border border-[#cfbea4] bg-[#fff7ee]/95 px-4 py-3 shadow-[0_18px_40px_rgba(63,35,16,0.18)] backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a431f]">Persistent player</p>
                  <div className="mt-1 flex min-w-0 items-center gap-2">
                    <Headphones className="size-4 shrink-0 text-[#8a431f]" />
                    <p className="truncate text-sm font-semibold text-[var(--af-color-primary)]">{currentTrack?.title}</p>
                  </div>
                  <p className="truncate text-xs text-[#665746]">
                    {currentTrack?.listening.hotTake} {currentTrack?.durationSeconds ? `• ${formatDuration(currentTrack.durationSeconds)}` : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-[#dbcdb8] bg-[#fffdf8]"
                  onClick={() => setIsMinimized(true)}
                >
                  <Minimize2 className="size-4" />
                </Button>
              </div>

              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-[#eadcca]">
                  <div
                    className="h-full rounded-full bg-[#b85e2d] transition-[width] duration-150 ease-linear"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[#7a6146]">
                  <span>{formatPlaybackTime(displayElapsedSeconds)}</span>
                  <span>{formatPlaybackTime(safeDurationSeconds)}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#dbcdb8] bg-[#fffdf8]"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  <Sparkles className="mr-2 size-4" />
                  {previewMode ? "Preview clip" : "Full take"}
                </Button>
                <Button
                  className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]"
                  size="sm"
                  onClick={() => {
                    if (!currentTrack) return
                    void toggleTrack(currentTrack.id)
                  }}
                >
                  {playingId === currentTrack?.id ? <Pause className="mr-2 size-4" /> : <Play className="mr-2 size-4" />}
                  {playingId === currentTrack?.id ? "Pause" : "Play"}
                </Button>
                <Button variant="outline" size="icon" className="border-[#dbcdb8] bg-[#fffdf8]" onClick={() => void nextTrack()}>
                  <SkipForward className="size-4" />
                </Button>
                <Link href={openReleaseHref} className={cn("hidden sm:block")}>
                  <Button variant="outline" size="sm" className="border-[#dbcdb8] bg-[#fffdf8]">
                    Open release
                  </Button>
                </Link>
              </div>
              {playbackError ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#8a3d2b]">
                  <span>Playback failed.</span>
                  <button
                    type="button"
                    className="font-medium underline underline-offset-2"
                    onClick={() => void retryCurrent()}
                  >
                    Retry
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </ListeningSessionContext.Provider>
  )
}

export function useListeningSession() {
  const value = useContext(ListeningSessionContext)
  if (!value) {
    throw new Error("useListeningSession must be used within ListeningSessionProvider.")
  }

  return value
}
