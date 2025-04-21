"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Play, Send, RotateCcw, Loader2 } from "lucide-react"

interface AudioRecorderProps {
  onSubmit: (audioBlob: Blob) => void
  questionId: string
  isMobile: boolean
  isUploading?: boolean
}

export function AudioRecorder({ onSubmit, questionId, isMobile, isUploading = false }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.onended = () => {
      setIsPlaying(false)
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

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
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
      mediaRecorder.start()
      setIsRecording(true)

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
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  // Stop playing audio
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
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
  }

  // Submit recording
  const handleSubmit = () => {
    if (audioBlob) {
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
              <div className="text-2xl font-semibold">{formatTime(recordingTime)}</div>
              <div className="text-sm text-muted-foreground">Recording length</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              {isMobile ? "Tap to record" : "Click to record"} your answer
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
            <Button size="icon" variant="outline" onClick={resetRecorder} className="rounded-full h-12 w-12">
              <RotateCcw className="h-5 w-5" />
            </Button>

            <Button
              size="icon"
              variant={isPlaying ? "secondary" : "outline"}
              onClick={isPlaying ? stopAudio : playAudio}
              className="rounded-full h-12 w-12"
            >
              <Play className="h-5 w-5" />
            </Button>

            <Button size="icon" onClick={handleSubmit} className="rounded-full h-12 w-12">
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
        <div className="text-center text-sm text-muted-foreground">{isPlaying ? "Playing..." : "Ready to submit"}</div>
      )}

      {isUploading && <div className="text-center text-sm text-muted-foreground">Uploading your response...</div>}
    </div>
  )
}
