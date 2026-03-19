"use client"

import { useState, useMemo } from "react"
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
import { cn } from "@/lib/utils"

type ResponseWithMetadata = {
  id: string
  surveyId: string
  surveyTitle: string
  questionId: string
  userId: string
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
}

type ResponseInboxProps = {
  responses: ResponseWithMetadata[]
  onPlayResponse?: (responseId: string) => void
  onFlagResponse?: (responseId: string, flagged: boolean) => void
  onMarkHighSignal?: (responseId: string, highSignal: boolean) => void
  onBookmarkResponse?: (responseId: string, bookmarked: boolean) => void
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

function getDurationBucketIcon(bucket: string): JSX.Element {
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

export function ResponseInbox({ 
  responses,
  onPlayResponse,
  onFlagResponse,
  onMarkHighSignal,
  onBookmarkResponse
}: ResponseInboxProps) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<"all" | "short" | "medium" | "deep" | "flagged" | "bookmarked">("all")

  const filteredResponses = useMemo(() => {
    switch (activeFilter) {
      case "short":
        return responses.filter(r => r.durationBucket === "short")
      case "medium":
        return responses.filter(r => r.durationBucket === "medium")
      case "deep":
        return responses.filter(r => r.durationBucket === "deep")
      case "flagged":
        return responses.filter(r => r.flagged)
      case "bookmarked":
        return responses.filter(r => r.bookmarked)
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

  const handlePlayToggle = (responseId: string) => {
    if (playingId === responseId) {
      setPlayingId(null)
      // Stop playback logic would go here
    } else {
      setPlayingId(responseId)
      onPlayResponse?.(responseId)
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Responses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.deep}</div>
            <p className="text-xs text-muted-foreground">Deep (&gt;20s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.medium}</div>
            <p className="text-xs text-muted-foreground">Medium (10-20s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.short}</div>
            <p className="text-xs text-muted-foreground">Short (&lt;10s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="deep">Deep</TabsTrigger>
          <TabsTrigger value="medium">Medium</TabsTrigger>
          <TabsTrigger value="short">Short</TabsTrigger>
          <TabsTrigger value="flagged">Flagged</TabsTrigger>
          <TabsTrigger value="bookmarked">Bookmarked</TabsTrigger>
          <TabsTrigger value="highsignal">High Signal</TabsTrigger>
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
            <Card key={response.id} className={cn(
              "transition-colors",
              response.flagged && "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20",
              response.highSignal && "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20",
              response.bookmarked && "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left Section - Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {response.surveyTitle}
                      </Badge>
                      {response.durationBucket && (
                        <Badge className={cn("text-xs", getDurationBucketColor(response.durationBucket))}>
                          {getDurationBucketIcon(response.durationBucket)}
                          <span className="ml-1 capitalize">{response.durationBucket}</span>
                        </Badge>
                      )}
                      {response.flagged && (
                        <Badge variant="destructive" className="text-xs">
                          <Flag className="h-3 w-3 mr-1" />
                          Flagged
                        </Badge>
                      )}
                      {response.highSignal && (
                        <Badge className="bg-green-600 text-white text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          High Signal
                        </Badge>
                      )}
                      {response.bookmarked && (
                        <Badge variant="secondary" className="text-xs">
                          <Bookmark className="h-3 w-3 mr-1" />
                          Bookmarked
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Question: {response.questionId}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(response.durationSeconds)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mic className="h-3 w-3" />
                        {formatFileSize(response.fileSize)}
                      </span>
                      <span>
                        {new Date(response.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Right Section - Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePlayToggle(response.id)}
                      title={playingId === response.id ? "Pause" : "Play"}
                    >
                      {playingId === response.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant={response.flagged ? "destructive" : "ghost"}
                      size="icon"
                      onClick={() => onFlagResponse?.(response.id, !response.flagged)}
                      title="Flag for review"
                    >
                      <Flag className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant={response.highSignal ? "default" : "ghost"}
                      size="icon"
                      onClick={() => onMarkHighSignal?.(response.id, !response.highSignal)}
                      title="Mark as high signal"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant={response.bookmarked ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => onBookmarkResponse?.(response.id, !response.bookmarked)}
                      title="Bookmark"
                    >
                      <Bookmark className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Footer */}
      {filteredResponses.length > 0 && (
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          Showing {filteredResponses.length} of {responses.length} responses
          {activeFilter !== "all" && ` (filtered by ${activeFilter})`}
        </div>
      )}
    </div>
  )
}
