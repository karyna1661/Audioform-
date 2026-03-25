"use client"

import type { ReactNode } from "react"
import { useState, useMemo, useRef, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Play, 
  Pause, 
  Mic, 
  Clock, 
  Flag, 
  Star, 
  Bookmark,
  Filter,
  AudioWaveform
} from "lucide-react"
import { getDurationBucketLabel } from "@/lib/response-duration"
import { cn } from "@/lib/utils"

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

type ResponseInboxProps = {
  responses: ResponseWithMetadata[]
  onPlayResponse?: (responseId: string) => void
  onFlagResponse?: (responseId: string, flagged: boolean) => void
  onMarkHighSignal?: (responseId: string, highSignal: boolean) => void
  onBookmarkResponse?: (responseId: string, bookmarked: boolean) => void
  onExtractInsight?: (responseId: string) => void
  extractingInsightId?: string | null
}

function formatDuration(seconds?: number | null): string {
  if (!seconds && seconds !== 0) return "Unknown"
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getDurationBucketColor(bucket: string): string {
  switch (bucket) {
    case "short":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "medium":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    case "deep":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
  }
}

function getDurationBucketIcon(bucket: string): ReactNode {
  switch (bucket) {
    case "short":
      return <Clock className="h-3 w-3" />
    case "medium":
      return <Mic className="h-3 w-3" />
    case "deep":
      return <AudioWaveform className="h-3 w-3" />
    default:
      return <Clock className="h-3 w-3" />
  }
}

function getSignalTone(score?: number | null): string {
  if (!score && score !== 0) return "text-[#7a6146]"
  if (score >= 75) return "text-[#25613a]"
  if (score >= 50) return "text-[#8a5a1f]"
  return "text-[#7a6146]"
}

export function ResponseInbox({ 
  responses,
  onPlayResponse,
  onFlagResponse,
  onMarkHighSignal,
  onBookmarkResponse,
  onExtractInsight,
  extractingInsightId = null,
}: ResponseInboxProps) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [audioErrorById, setAudioErrorById] = useState<Record<string, string>>({})
  const [activeFilter, setActiveFilter] = useState<"all" | "flagged" | "highsignal">("all")
  const [expandedInsightIds, setExpandedInsightIds] = useState<Record<string, boolean>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    const handleEnded = () => {
      setPlayingId(null)
    }

    const handlePause = () => {
      setPlayingId(null)
    }

    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("pause", handlePause)

    return () => {
      audio.pause()
      audio.src = ""
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("pause", handlePause)
    }
  }, [])

  const filteredResponses = useMemo(() => {
    switch (activeFilter) {
      case "flagged":
        return responses.filter(r => r.flagged)
      case "highsignal":
        return responses.filter(r => r.highSignal)
      default:
        return responses
    }
  }, [responses, activeFilter])

  const stats = useMemo(() => ({
    total: responses.length,
    short: responses.filter(r => r.durationBucket === "short").length,
    medium: responses.filter(r => r.durationBucket === "medium").length,
    deep: responses.filter(r => r.durationBucket === "deep").length,
    flagged: responses.filter(r => r.flagged).length,
    bookmarked: responses.filter(r => r.bookmarked).length,
    highSignal: responses.filter(r => r.highSignal).length,
  }), [responses])

  const featuredResponse = useMemo(() => {
    return responses.find((response) => response.highSignal)
      ?? responses.find((response) => response.bookmarked)
      ?? responses.find((response) => response.durationBucket === "deep")
      ?? responses[0]
      ?? null
  }, [responses])

  const digestLabel = useMemo(() => {
    if (!featuredResponse) return null
    if (featuredResponse.questionText) {
      return `Start with the ${formatDuration(featuredResponse.durationSeconds)} take on "${featuredResponse.questionText}".`
    }
    return `Start with the ${formatDuration(featuredResponse.durationSeconds)} take from ${featuredResponse.surveyTitle}.`
  }, [featuredResponse])

  const handlePlayToggle = async (response: ResponseWithMetadata) => {
    const audio = audioRef.current
    if (!audio) return

    if (playingId === response.id) {
      audio.pause()
      audio.currentTime = 0
      setPlayingId(null)
      return
    }

    try {
      setAudioErrorById((current) => ({ ...current, [response.id]: "" }))
      audio.pause()
      audio.src = response.playbackUrl
      audio.load()
      await audio.play()
      setPlayingId(response.id)
      onPlayResponse?.(response.id)
    } catch {
      setPlayingId(null)
      setAudioErrorById((current) => ({
        ...current,
        [response.id]: "Playback failed. Refresh and try again.",
      }))
    }
  }

  const buildResponseHeading = (response: ResponseWithMetadata): string => {
    const duration = formatDuration(response.durationSeconds)
    if (response.questionText) {
      return `${duration} voice response`
    }
    return `${duration} response to ${response.questionId.toUpperCase()}`
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
       <div className="hidden grid-cols-2 gap-4 md:grid md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Responses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.deep}</div>
            <p className="text-xs text-muted-foreground">{getDurationBucketLabel("deep")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.medium}</div>
            <p className="text-xs text-muted-foreground">{getDurationBucketLabel("medium")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.short}</div>
            <p className="text-xs text-muted-foreground">{getDurationBucketLabel("short")}</p>
          </CardContent>
        </Card>
      </div>

      {featuredResponse ? (
        <Card className="border-[#dbcdb8] bg-[#fff6ed]">
          <CardContent className="pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#8a431f]">Start Here</p>
            <p className="mt-2 text-base font-semibold text-foreground">{digestLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats.deep > 0
                ? `${stats.deep} deeper response${stats.deep === 1 ? " is" : "s are"} already in the inbox, so creators can scan where to listen first.`
                : "This is the first lightweight insight layer before full AI summaries."}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Filters */}
      <Tabs
        value={activeFilter}
        onValueChange={(value) =>
          setActiveFilter(value as "all" | "flagged" | "highsignal")
        }
        className="w-full"
      >
        <TabsList className="ml-auto flex w-fit items-center gap-1">
          <TabsTrigger value="all" className="shrink-0">All</TabsTrigger>
          <TabsTrigger value="flagged" className="shrink-0">Flagged</TabsTrigger>
          <TabsTrigger value="highsignal" className="shrink-0">High Signal</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Response List */}
      <div className="space-y-3">
        {filteredResponses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AudioWaveform className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No responses found</p>
          </div>
        ) : (
          filteredResponses.map((response) => (
            (() => {
              const isExpanded = Boolean(expandedInsightIds[response.id])
              const fullSummary = response.insight?.summary ?? null
              const truncatedSummary = fullSummary && fullSummary.length > 160 && !isExpanded
                ? `${fullSummary.slice(0, 157)}...`
                : fullSummary
              return (
              <Card key={response.id} className={cn(
                "transition-colors",
                response.flagged && "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20",
                response.highSignal && "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20",
                response.bookmarked && "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20"
              )}>
              <CardContent className="p-2 sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  {/* Left Section - Info */}
                  <div className="flex-1 space-y-1.5 sm:space-y-2">
                     <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                          {response.surveyTitle}
                        </Badge>
                      {response.durationBucket && (
                        <Badge className={cn("text-xs px-1.5 py-0.5", getDurationBucketColor(response.durationBucket))}>
                          {getDurationBucketIcon(response.durationBucket)}
                          <span className="ml-1 capitalize">{response.durationBucket}</span>
                        </Badge>
                      )}
                      {response.flagged && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                          <Flag className="h-3 w-3 mr-0.5" />
                          <span className="hidden sm:inline">Flagged</span>
                        </Badge>
                      )}
                      {response.highSignal && (
                        <Badge className="bg-green-600 text-white text-xs px-1.5 py-0.5">
                          <Star className="h-3 w-3 mr-0.5" />
                          <span className="hidden sm:inline">High Signal</span>
                        </Badge>
                      )}
                      {response.bookmarked && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          <Bookmark className="h-3 w-3 mr-0.5" />
                          <span className="hidden sm:inline">Saved</span>
                        </Badge>
                      )}
                    </div>
                   
                    <div>
                      <p className="text-sm font-medium text-foreground line-clamp-1">{buildResponseHeading(response)}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {response.questionText || `Question ${response.questionId.toUpperCase()}`}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(response.durationSeconds)}
                      </span>
                      <span className="flex items-center gap-1">
                       <Mic className="h-3 w-3" />
                       {formatFileSize(response.fileSize)}
                     </span>
                     <span className="hidden sm:inline">
                       {new Date(response.timestamp).toLocaleDateString()}
                     </span>
                    </div>

                      {response.transcript ? (
                        <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] p-2 sm:p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-[#cfbea4] bg-[#fff6ed] text-[#7a6146] text-xs">
                              Transcript {response.transcript.status !== "completed" ? response.transcript.status : ""}
                            </Badge>
                          </div>
                          {response.transcript.text ? (
                            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-5 text-[#3c3026] line-clamp-3">{response.transcript.text}</p>
                          ) : response.transcript.errorMessage ? (
                            <p className="mt-1.5 sm:mt-2 text-xs text-[#8a3d2b]">{response.transcript.errorMessage}</p>
                          ) : (
                            <p className="mt-1.5 sm:mt-2 text-xs text-[#665746]">Processing...</p>
                         )}
                        </div>
                      ) : null}

                      {response.insight ? (
                        <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf3] p-2 sm:p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <Badge variant="outline" className="border-[#cfbea4] bg-[#fff6ed] text-[#7a6146] text-xs">
                                AI Summary
                              </Badge>
                              {response.insight.primaryTheme ? (
                                <Badge variant="outline" className="border-[#cfbea4] bg-[#fff6ed] text-[#7a6146] text-xs">
                                  {response.insight.primaryTheme}
                                </Badge>
                              ) : null}
                              <span className={cn("text-xs font-medium", getSignalTone(response.insight.signalScore))}>
                                {response.insight.signalScore ?? "-"}/100
                              </span>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs border-[#cfbea4] bg-[#fff6ed] text-[#7a6146] hover:bg-[#efe4d3]"
                              onClick={() => {
                                const url = `${window.location.origin}/api/og/insight?responseId=${response.id}`
                                window.open(url, "_blank")
                              }}
                            >
                              Share Card
                            </Button>
                          </div>
                           {truncatedSummary ? (
                             <>
                               <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-5 sm:leading-6 text-[#3c3026] line-clamp-2">{truncatedSummary}</p>
                               {fullSummary && fullSummary.length > 160 ? (
                                 <button
                                   type="button"
                                   className="mt-1.5 sm:mt-2 text-xs font-medium text-[#8a431f] hover:underline"
                                   onClick={() =>
                                     setExpandedInsightIds((current) => ({
                                       ...current,
                                       [response.id]: !current[response.id],
                                     }))
                                   }
                                 >
                                   {isExpanded ? "Less" : "More"}
                                 </button>
                               ) : null}
                             </>
                           ) : null}
                          {response.insight.quotes?.[0] ? (
                            <p className="mt-1.5 sm:mt-2 text-xs italic text-[#665746] line-clamp-2">"{response.insight.quotes[0]}"</p>
                          ) : null}
                        </div>
                      ) : null}

                     {!response.insight ? (
                       <div className="flex flex-wrap items-center gap-2">
                         <Button
                           variant="outline"
                           size="sm"
                           className="border-[#cfbea4] bg-[#fff6ed] text-[#7a6146]"
                           disabled={!onExtractInsight || extractingInsightId === response.id}
                           onClick={() => onExtractInsight?.(response.id)}
                         >
                           {extractingInsightId === response.id
                             ? "Extracting..."
                             : response.transcript?.status === "failed"
                               ? "Retry extraction"
                               : "Extract insight"}
                         </Button>
                       </div>
                     ) : null}

                     {audioErrorById[response.id] ? (
                       <p className="text-xs text-[#8a3d2b]">{audioErrorById[response.id]}</p>
                     ) : null}
                   </div>

                   {/* Right Section - Actions */}
                    <div className="flex items-center gap-1 sm:gap-2 sm:flex-col sm:items-end sm:self-start">
                      <Button
                         variant="outline"
                         size="icon"
                         className="h-8 w-8 sm:h-9 sm:w-9"
                       onClick={() => void handlePlayToggle(response)}
                       title={playingId === response.id ? "Pause" : "Play"}
                     >
                       {playingId === response.id ? (
                         <Pause className="h-3 w-3 sm:h-4 sm:w-4" />
                       ) : (
                         <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                       )}
                     </Button>
                     
                      <div className="flex gap-1 sm:flex-col sm:gap-2">
                      <Button
                        variant={response.flagged ? "destructive" : "ghost"}
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8"
                       onClick={() => onFlagResponse?.(response.id, !response.flagged)}
                       title="Flag"
                       >
                       <Flag className="h-3 w-3" />
                     </Button>
                     
                      <Button
                        variant={response.highSignal ? "default" : "ghost"}
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8"
                       onClick={() => onMarkHighSignal?.(response.id, !response.highSignal)}
                       title="High signal"
                       >
                       <Star className="h-3 w-3" />
                     </Button>
                     
                      <Button
                        variant={response.bookmarked ? "secondary" : "ghost"}
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8"
                       onClick={() => onBookmarkResponse?.(response.id, !response.bookmarked)}
                       title="Bookmark"
                       >
                       <Bookmark className="h-3 w-3" />
                     </Button>
                      </div>
                    </div>
                 </div>
               </CardContent>
             </Card>
              )
            })()
          ))
        )}
      </div>

      {/* Summary Footer */}
      {filteredResponses.length > 0 && (
        <div className="border-t pt-4 text-center text-xs text-muted-foreground">
          Showing {filteredResponses.length} of {responses.length} responses
          {activeFilter !== "all" && ` (filtered by ${activeFilter})`}
        </div>
      )}
    </div>
  )
}
