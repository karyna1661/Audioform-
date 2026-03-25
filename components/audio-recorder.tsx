"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Play, Pause, Send, RotateCcw, Loader2 } from "lucide-react"

interface AudioRecorderProps {
  onSubmit: (audioBlob: Blob) => void
  questionId: string
  isMobile: boolean
  isUploading?: boolean
  submitState?: "idle" | "uploading" | "error" | "success"
  onRecordingStart?: () => void
  onRecordingSubmit?: (meta: { questionId: string; durationSeconds: number }) => void
}

export function AudioRecorder({
  onSubmit,
  questionId,
  isMobile,
  isUploading = false,
  submitState = "idle",
  onRecordingStart,
  onRecordingSubmit,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [playbackTime, setPlaybackTime] = useState(0)
  const [playbackDuration, setPlaybackDuration] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const playbackRafRef = useRef<number | null>(null)
  const recordingActiveRef = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (submitState === "success") {
      resetRecorder()
    }
  }, [submitState])

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.onloadedmetadata = () => {
      setPlaybackDuration(Number.isFinite(audioRef.current?.duration) ? audioRef.current!.duration : 0)
    }
    audioRef.current.ontimeupdate = () => {
      setPlaybackTime(audioRef.current?.currentTime ?? 0)
    }
    audioRef.current.onended = () => {
      setIsPlaying(false)
      setPlaybackTime(audioRef.current?.duration ?? 0)
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (audioContextRef.current) {
        audioContextRef.current.close()
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }

      if (playbackRafRef.current) {
        cancelAnimationFrame(playbackRafRef.current)
      }
    }
  }, [])

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Start recording
  const startRecording = async () => {
    try {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      setAudioBlob(null)
      setAudioUrl(null)
      setPlaybackTime(0)
      setPlaybackDuration(0)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up audio context and analyser for visualization
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      analyser.fftSize = 256

      const source = audioContext.createMediaStreamSource(stream)
      sourceRef.current = source
      source.connect(analyser)

      // Set up media recorder with speech-optimized settings for smaller uploads on mobile.
      const preferredMimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
      const selectedMimeType = preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type))
      const recorderOptions: MediaRecorderOptions = {
        audioBitsPerSecond: 32_000,
      }
      if (selectedMimeType) {
        recorderOptions.mimeType = selectedMimeType
      }
      const mediaRecorder = new MediaRecorder(stream, recorderOptions)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || selectedMimeType || "audio/webm",
        })
        const audioUrl = URL.createObjectURL(audioBlob)

        setAudioBlob(audioBlob)
        setAudioUrl(audioUrl)

        if (audioRef.current) {
          audioRef.current.src = audioUrl
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      // Start recording
      mediaRecorder.start(250)
      recordingActiveRef.current = true
      setIsRecording(true)
      onRecordingStart?.()

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      // Start visualization
      drawWaveform()
    } catch (error) {
      console.error("Error starting recording:", error)
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      recordingActiveRef.current = false
      setIsRecording(false)

      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }

  // Play recorded audio
  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      void audioRef.current.play().catch(() => {
        setIsPlaying(false)
      })
      setIsPlaying(true)

      const syncPlayback = () => {
        if (!audioRef.current) return
        setPlaybackTime(audioRef.current.currentTime ?? 0)
        if (!audioRef.current.paused) {
          playbackRafRef.current = requestAnimationFrame(syncPlayback)
        }
      }
      playbackRafRef.current = requestAnimationFrame(syncPlayback)
    }
  }

  // Pause playback without resetting time
  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      if (playbackRafRef.current) {
        cancelAnimationFrame(playbackRafRef.current)
      }
    }
  }

  // Reset recorder
  const resetRecorder = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }

    setAudioBlob(null)
    setAudioUrl(null)
    setIsPlaying(false)
    setRecordingTime(0)
    setPlaybackTime(0)
    setPlaybackDuration(0)
    if (playbackRafRef.current) {
      cancelAnimationFrame(playbackRafRef.current)
    }
  }

  // Submit recording
  const handleSubmit = () => {
    if (audioBlob) {
      onRecordingSubmit?.({ questionId, durationSeconds: recordingTime })
      onSubmit(audioBlob)
    }
  }

  // Draw waveform visualization
  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return

    const canvas = canvasRef.current
    const analyser = analyserRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!recordingActiveRef.current) return

      animationFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      ctx.fillStyle = "#f9fafb"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height

        ctx.fillStyle = `rgb(79, 70, 229)`
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }
    }

    draw()
  }

  return (
    <div className="min-w-0 space-y-3 overflow-x-hidden sm:space-y-4" aria-busy={isUploading}>
      {/* Waveform visualization */}
      <div className="relative h-24 overflow-hidden rounded-[1rem] bg-muted sm:h-28">
        {isUploading ? (
            <div className="flex h-full items-center justify-center px-4">
              <div className="block w-full max-w-md animate-pulse space-y-2" aria-live="polite">
              <div className="h-2.5 w-3/4 rounded-full bg-[#d9cdbd]" />
              <div className="h-2.5 w-full rounded-full bg-[#e5d9ca]" />
              <div className="h-2.5 w-5/6 rounded-full bg-[#d9cdbd]" />
            </div>
          </div>
        ) : isRecording ? (
          <canvas ref={canvasRef} className="w-full h-full" width={isMobile ? 300 : 500} height={96} />
        ) : audioBlob ? (
          <div className="flex h-full items-center justify-center px-3">
            <div className="block min-w-0 text-center">
              <div className="text-xl font-semibold tabular-nums sm:text-2xl">
                {formatTime(Math.floor(playbackTime || 0))} / {formatTime(Math.floor(playbackDuration || recordingTime))}
              </div>
              <div className="text-[13px] text-muted-foreground break-words sm:text-sm">{isPlaying ? "Playing preview" : "Preview ready"}</div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-3">
            <div className="text-center text-[13px] text-muted-foreground break-words sm:text-sm">
              {isMobile ? "Tap to record" : "Click to record"} your 30-second take
            </div>
          </div>
        )}

        {isRecording && (
          <div className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-1 text-[11px] text-white animate-pulse sm:text-xs">
            REC {formatTime(recordingTime)}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
        {!isRecording && !audioBlob && (
          <Button
            size="lg"
            onClick={startRecording}
            className="flex h-16 w-16 items-center justify-center rounded-full sm:h-[4.5rem] sm:w-[4.5rem]"
          >
            <Mic className="h-6 w-6 sm:h-7 sm:w-7" />
          </Button>
        )}

        {isRecording && (
          <Button
            size="lg"
            variant="destructive"
            onClick={stopRecording}
            className="flex h-16 w-16 items-center justify-center rounded-full sm:h-[4.5rem] sm:w-[4.5rem]"
          >
            <Square className="h-6 w-6 sm:h-7 sm:w-7" />
          </Button>
        )}

        {!isRecording && audioBlob && !isUploading && (
          <>
            <Button size="icon" variant="outline" onClick={resetRecorder} className="h-12 w-12 rounded-full sm:h-14 sm:w-14" aria-label="Re-record">
              <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>

              <Button
                size="icon"
                variant={isPlaying ? "secondary" : "outline"}
                onClick={isPlaying ? pauseAudio : playAudio}
                className="h-12 w-12 rounded-full sm:h-14 sm:w-14"
                aria-label={isPlaying ? "Pause playback" : "Play recording"}
              >
              {isPlaying ? <Pause className="h-5 w-5 sm:h-6 sm:w-6" /> : <Play className="h-5 w-5 sm:h-6 sm:w-6" />}
            </Button>

            <Button size="icon" onClick={handleSubmit} className="h-12 w-12 rounded-full sm:h-14 sm:w-14" aria-label="Submit recording">
              <Send className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </>
        )}

        {isUploading && (
          <Button size="lg" disabled className="flex h-16 w-16 items-center justify-center rounded-full sm:h-[4.5rem] sm:w-[4.5rem]">
            <Loader2 className="h-6 w-6 animate-spin sm:h-7 sm:w-7" />
          </Button>
        )}
      </div>

      {audioBlob && !isUploading && (
        <div className="px-2 text-center text-[13px] leading-6 text-muted-foreground break-words sm:text-sm">
          {isPlaying
            ? `Playing preview ${formatTime(Math.floor(playbackTime))} / ${formatTime(Math.floor(playbackDuration || recordingTime))}`
            : submitState === "error"
              ? "Upload stalled. You can retry this exact take or re-record."
              : "Ready to submit this take"}
        </div>
      )}

      {isUploading && (
        <div className="px-2 text-center text-[13px] leading-6 text-muted-foreground break-words sm:text-sm">
          Uploading your voice take. Keeping this recording here so you do not need to repeat it.
        </div>
      )}
    </div>
  )
}
