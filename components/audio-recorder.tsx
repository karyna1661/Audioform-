"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Play, Pause, Send, RotateCcw, Loader2 } from "lucide-react"

interface AudioRecorderProps {
  onSubmit: (audioBlob: Blob) => void
  questionId: string
  isMobile: boolean
  isUploading?: boolean
  onRecordingStart?: () => void
  onRecordingSubmit?: (meta: { questionId: string; durationSeconds: number }) => void
}

export function AudioRecorder({
  onSubmit,
  questionId,
  isMobile,
  isUploading = false,
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
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const playbackRafRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

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

      if (timerRef.current) {
        clearInterval(timerRef.current)
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
      setIsRecording(true)
      onRecordingStart?.()

      // Start timer
      timerRef.current = setInterval(() => {
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
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
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
      void audioRef.current.play()
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
      resetRecorder()
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
      if (!isRecording) return

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
    <div className="space-y-4">
      {/* Waveform visualization */}
      <div className="relative h-24 bg-muted rounded-lg overflow-hidden">
        {isRecording ? (
          <canvas ref={canvasRef} className="w-full h-full" width={isMobile ? 300 : 500} height={96} />
        ) : audioBlob ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-2xl font-semibold tabular-nums">
                {formatTime(Math.floor(playbackTime || 0))} / {formatTime(Math.floor(playbackDuration || recordingTime))}
              </div>
              <div className="text-sm text-muted-foreground">{isPlaying ? "Playing preview" : "Preview ready"}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              {isMobile ? "Tap to record" : "Click to record"} your 30-second take
            </div>
          </div>
        )}

        {isRecording && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
            REC {formatTime(recordingTime)}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        {!isRecording && !audioBlob && (
          <Button
            size="lg"
            onClick={startRecording}
            className="rounded-full h-16 w-16 flex items-center justify-center"
          >
            <Mic className="h-6 w-6" />
          </Button>
        )}

        {isRecording && (
          <Button
            size="lg"
            variant="destructive"
            onClick={stopRecording}
            className="rounded-full h-16 w-16 flex items-center justify-center"
          >
            <Square className="h-6 w-6" />
          </Button>
        )}

        {!isRecording && audioBlob && !isUploading && (
          <>
            <Button size="icon" variant="outline" onClick={resetRecorder} className="rounded-full h-12 w-12" aria-label="Re-record">
              <RotateCcw className="h-5 w-5" />
            </Button>

              <Button
                size="icon"
                variant={isPlaying ? "secondary" : "outline"}
                onClick={isPlaying ? pauseAudio : playAudio}
                className="rounded-full h-12 w-12"
                aria-label={isPlaying ? "Pause playback" : "Play recording"}
              >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>

            <Button size="icon" onClick={handleSubmit} className="rounded-full h-12 w-12" aria-label="Submit recording">
              <Send className="h-5 w-5" />
            </Button>
          </>
        )}

        {isUploading && (
          <Button size="lg" disabled className="rounded-full h-16 w-16 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </Button>
        )}
      </div>

      {audioBlob && !isUploading && (
        <div className="text-center text-sm text-muted-foreground">
          {isPlaying
            ? `Playing preview ${formatTime(Math.floor(playbackTime))} / ${formatTime(Math.floor(playbackDuration || recordingTime))}`
            : "Ready to submit this take"}
        </div>
      )}

      {isUploading && <div className="text-center text-sm text-muted-foreground">Uploading your voice take...</div>}
    </div>
  )
}
