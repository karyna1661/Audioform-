"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AudioRecorder } from "@/components/audio-recorder"
import { useMobile } from "@/hooks/use-mobile"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Sample questions for the demo questionnaire
const questions = [
  {
    id: "q1",
    text: "What do you find most valuable about our product or service?",
  },
  {
    id: "q2",
    text: "What challenges have you faced when using our product?",
  },
  {
    id: "q3",
    text: "How would you describe your overall experience with our customer support?",
  },
  {
    id: "q4",
    text: "What features would you like to see added or improved?",
  },
  {
    id: "q5",
    text: "Would you recommend our product to others? Why or why not?",
  },
]

export default function QuestionnairePage() {
  const router = useRouter()
  const isMobile = useMobile()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Blob>>({})
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Check for microphone permission
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())
        setPermissionGranted(true)
      } catch (err) {
        console.error("Microphone permission denied:", err)
        setPermissionGranted(false)
      }
    }

    checkMicPermission()
  }, [])

  const currentQuestion = questions[currentQuestionIndex]
  const progress = (Object.keys(answers).length / questions.length) * 100

  const handleAnswerSubmit = async (audioBlob: Blob) => {
    setIsUploading(true)

    try {
      // Create form data for upload
      const formData = new FormData()
      formData.append("audio", audioBlob, `question_${currentQuestion.id}.webm`)
      formData.append("questionId", currentQuestion.id)

      // In a real app, we would upload the audio to the server here
      // const response = await fetch("/api/responses", {
      //   method: "POST",
      //   body: formData,
      // })

      // if (!response.ok) {
      //   throw new Error("Failed to upload audio")
      // }

      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Store the answer locally
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: audioBlob,
      }))

      // Move to the next question or complete the questionnaire
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1)
      } else {
        setIsComplete(true)

        // In a real app, we would submit all answers to the server here
        // and then redirect to a thank you page
        setTimeout(() => {
          router.push("/questionnaire/thank-you")
        }, 2000)
      }
    } catch (error) {
      console.error("Error uploading audio:", error)
      // Handle error (would show an error message in a real app)
    } finally {
      setIsUploading(false)
    }
  }

  if (permissionGranted === false) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Microphone Access Required</AlertTitle>
          <AlertDescription>
            This questionnaire requires microphone access to record your answers. Please enable microphone access in
            your browser settings and refresh the page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {isComplete ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-center">All Done!</h2>
              <p className="text-center text-muted-foreground mt-2">Thank you for completing the questionnaire.</p>
              <p className="text-center text-muted-foreground">Redirecting you to the thank you page...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{currentQuestion.text}</CardTitle>
          </CardHeader>
          <CardContent>
            <AudioRecorder
              onSubmit={handleAnswerSubmit}
              questionId={currentQuestion.id}
              isMobile={isMobile}
              isUploading={isUploading}
            />
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button
              variant="outline"
              onClick={() => currentQuestionIndex > 0 && setCurrentQuestionIndex((prev) => prev - 1)}
              disabled={currentQuestionIndex === 0 || isUploading}
            >
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              {Object.keys(answers).length} of {questions.length} answered
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
