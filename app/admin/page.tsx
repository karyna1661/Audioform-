"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Play, Download, FileAudio, User, Calendar } from "lucide-react"

// Sample data for the admin dashboard
const sampleResponses = [
  {
    id: "resp1",
    respondentName: "Ngozi Okonkwo",
    date: "2023-04-20T14:30:00Z",
    completedQuestions: 5,
    totalQuestions: 5,
    responses: [
      { questionId: "q1", audioUrl: null, duration: 28, transcriptStatus: "pending" },
      { questionId: "q2", audioUrl: null, duration: 45, transcriptStatus: "pending" },
      { questionId: "q3", audioUrl: null, duration: 32, transcriptStatus: "pending" },
      { questionId: "q4", audioUrl: null, duration: 19, transcriptStatus: "pending" },
      { questionId: "q5", audioUrl: null, duration: 37, transcriptStatus: "pending" },
    ],
  },
  {
    id: "resp2",
    respondentName: "Tunde Adeyemi",
    date: "2023-04-19T10:15:00Z",
    completedQuestions: 3,
    totalQuestions: 5,
    responses: [
      { questionId: "q1", audioUrl: null, duration: 42, transcriptStatus: "pending" },
      { questionId: "q2", audioUrl: null, duration: 31, transcriptStatus: "pending" },
      { questionId: "q3", audioUrl: null, duration: 25, transcriptStatus: "pending" },
    ],
  },
  {
    id: "resp3",
    respondentName: "Amina Ibrahim",
    date: "2023-04-18T16:45:00Z",
    completedQuestions: 5,
    totalQuestions: 5,
    responses: [
      { questionId: "q1", audioUrl: null, duration: 33, transcriptStatus: "completed" },
      { questionId: "q2", audioUrl: null, duration: 29, transcriptStatus: "completed" },
      { questionId: "q3", audioUrl: null, duration: 51, transcriptStatus: "completed" },
      { questionId: "q4", audioUrl: null, duration: 22, transcriptStatus: "completed" },
      { questionId: "q5", audioUrl: null, duration: 40, transcriptStatus: "completed" },
    ],
  },
]

// Sample questions for reference
const questions = [
  { id: "q1", text: "How often does your savings group meet, and what is the typical contribution amount?" },
  { id: "q2", text: "What challenges have you faced in managing your rotating savings group?" },
  { id: "q3", text: "How do members decide who receives the collected funds each cycle?" },
  { id: "q4", text: "What methods do you use to track contributions and payouts?" },
  { id: "q5", text: "How has participating in a rotating savings group benefited your members financially?" },
]

export default function AdminDashboard() {
  const [selectedResponse, setSelectedResponse] = useState(sampleResponses[0])

  // Format date to readable string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Format seconds to MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar with responses list */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Responses</CardTitle>
              <CardDescription>{sampleResponses.length} total responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleResponses.map((response) => (
                  <div
                    key={response.id}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedResponse.id === response.id
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                    onClick={() => setSelectedResponse(response)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">{response.respondentName}</div>
                      <Badge
                        variant={response.completedQuestions === response.totalQuestions ? "success" : "secondary"}
                      >
                        {response.completedQuestions}/{response.totalQuestions}
                      </Badge>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(response.date)}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <FileAudio className="h-3 w-3 mr-1" />
                      {response.responses.reduce((acc, curr) => acc + curr.duration, 0)}s total audio
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content with response details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{selectedResponse.respondentName}</CardTitle>
                  <CardDescription>Submitted on {formatDate(selectedResponse.date)}</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="responses">
                <TabsList className="mb-4">
                  <TabsTrigger value="responses">Responses</TabsTrigger>
                  <TabsTrigger value="transcripts">Transcripts</TabsTrigger>
                </TabsList>

                <TabsContent value="responses" className="space-y-6">
                  {selectedResponse.responses.map((response, index) => {
                    const question = questions.find((q) => q.id === response.questionId)
                    return (
                      <div key={response.questionId} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-medium">
                            Question {index + 1}: {question?.text}
                          </h3>
                          <Badge variant={response.transcriptStatus === "completed" ? "success" : "secondary"}>
                            {response.transcriptStatus === "completed" ? "Transcribed" : "Pending"}
                          </Badge>
                        </div>

                        <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center">
                            <FileAudio className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm">{formatDuration(response.duration)}</span>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Play className="h-4 w-4 mr-1" />
                            Play
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </TabsContent>

                <TabsContent value="transcripts">
                  <div className="space-y-6">
                    {selectedResponse.responses.map((response, index) => {
                      const question = questions.find((q) => q.id === response.questionId)
                      return (
                        <div key={response.questionId} className="border rounded-lg p-4">
                          <h3 className="font-medium mb-2">
                            Question {index + 1}: {question?.text}
                          </h3>

                          {response.transcriptStatus === "completed" ? (
                            <div className="bg-muted rounded-lg p-3">
                              <p className="text-sm">
                                {/* Sample transcript text */}
                                Our savings group meets every two weeks on Sunday afternoons. Each member contributes
                                5,000 Naira per meeting. This amount was decided by the group based on what most members
                                could afford consistently.
                              </p>
                            </div>
                          ) : (
                            <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Transcript pending</span>
                              <Button variant="outline" size="sm">
                                Request Transcription
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <div className="flex items-center text-sm text-muted-foreground">
                <User className="h-4 w-4 mr-2" />
                Respondent ID: {selectedResponse.id}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
