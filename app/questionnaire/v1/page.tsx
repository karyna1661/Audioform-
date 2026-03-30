import type { Metadata } from "next"
import QuestionnaireClientPage from "./questionnaire-client"
import { getLatestPublishedSurveyQuestions, getPublishedSurveyById } from "@/lib/server/survey-store"
import { isUuidLike } from "@/lib/share-links"

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
  const brandedDescription = "Powered by Audioform. Answer by voice in under a minute."
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://audioform-production.up.railway.app"

  if (!surveyId || !isUuidLike(surveyId)) {
    return {
      title: "Audioform voice survey",
      description: brandedDescription,
      openGraph: {
        images: [{ url: `${appUrl}/api/og/survey?ext=.png` }],
      },
      twitter: {
        card: "summary_large_image",
        images: [`${appUrl}/api/og/survey?ext=.png`],
      },
    }
  }

  const survey = await getPublishedSurveyById(surveyId)
  const title = survey?.title?.trim() || "Audioform voice survey"
  const url = `${appUrl}/questionnaire/v1?surveyId=${encodeURIComponent(surveyId)}`
  const imageUrl = `${appUrl}/api/og/survey?surveyId=${encodeURIComponent(surveyId)}&ext=.png`

  return {
    title,
    description: brandedDescription,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description: brandedDescription,
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
      description: brandedDescription,
      images: [imageUrl],
    },
  }
}

export default function QuestionnaireV1Page() {
  return <QuestionnaireClientPage />
}
