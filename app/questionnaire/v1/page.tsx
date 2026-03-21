import type { Metadata } from "next"
import QuestionnaireClientPage from "./questionnaire-client"
import { getLatestPublishedSurveyQuestions, getPublishedSurveyById } from "@/lib/server/survey-store"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim().length > 0) return value[0]
  return null
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams
  const surveyId = getParam(params.surveyId)

  if (!surveyId) {
    return {
      title: "Audioform voice survey",
      description: "Listen to the question before you answer. Share one concrete moment by voice.",
      openGraph: {
        images: [{ url: "/api/og/survey" }],
      },
      twitter: {
        card: "summary_large_image",
        images: ["/api/og/survey"],
      },
    }
  }

  const survey = await getPublishedSurveyById(surveyId)
  const prompts = await getLatestPublishedSurveyQuestions(surveyId)
  const firstPrompt = prompts[0]?.trim() || "Share one concrete moment by voice."
  const title = survey?.title?.trim() || "Audioform voice survey"
  const description = firstPrompt.length > 160 ? `${firstPrompt.slice(0, 157)}...` : firstPrompt
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "https://audioform-production.up.railway.app"}/questionnaire/v1?surveyId=${encodeURIComponent(surveyId)}`
  const imageUrl = `/api/og/survey?surveyId=${encodeURIComponent(surveyId)}`

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "Audioform",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${title} first prompt preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  }
}

export default function QuestionnaireV1Page() {
  return <QuestionnaireClientPage />
}
