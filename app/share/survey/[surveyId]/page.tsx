import type { Metadata } from "next"
import Link from "next/link"
import { getLatestPublishedSurveyQuestions, getPublishedSurveyById } from "@/lib/server/survey-store"
import { isUuidLike } from "@/lib/share-links"

type PageProps = {
  params: Promise<{ surveyId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://audioform-production.up.railway.app"

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { surveyId } = await params
  const { v } = await searchParams
  const survey = isUuidLike(surveyId) ? await getPublishedSurveyById(surveyId) : null

  const title = survey?.title?.trim() || "Audioform voice survey"
  const description = "Powered by Audioform. Answer by voice in under a minute."
  const url = `${appUrl}/share/survey/${encodeURIComponent(surveyId)}${v ? `?v=${v}` : ""}`
  const imageUrl = `${appUrl}/api/og/survey?surveyId=${encodeURIComponent(surveyId)}${v ? `&v=${v}` : ""}&ext=.png`

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
      locale: "en_US",
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

export default async function ShareSurveyPage({ params }: PageProps) {
  const { surveyId } = await params
  const survey = isUuidLike(surveyId) ? await getPublishedSurveyById(surveyId) : null
  const prompts = survey ? await getLatestPublishedSurveyQuestions(surveyId) : []

  if (!survey) {
    return (
      <main className="min-h-dvh bg-[#f3ecdf] p-4 sm:p-6">
        <section className="mx-auto max-w-3xl rounded-[1.5rem] border border-[#dbcdb8] bg-[#f9f4ea] p-6 sm:rounded-[2rem] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a6146]">Audioform survey</p>
          <h1 className="mt-3 text-3xl font-semibold text-balance text-[var(--af-color-primary)]">This survey link is unavailable.</h1>
          <p className="mt-3 text-sm leading-6 text-[#665746]">
            Ask the creator to republish the survey and share a fresh link.
          </p>
        </section>
      </main>
    )
  }

  const firstPrompt = prompts[0]?.trim() || "Share one concrete moment by voice."
  const questionCount = Math.max(survey.questionCount, prompts.length)
  const surveyHref = `/questionnaire/v1?surveyId=${encodeURIComponent(surveyId)}`

  return (
    <main className="min-h-dvh bg-[#f3ecdf] p-4 sm:p-6">
      <section className="mx-auto max-w-3xl rounded-[1.5rem] border border-[#dbcdb8] bg-[#f9f4ea] p-6 sm:rounded-[2rem] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a6146]">Audioform survey</p>

        <div className="mt-5 rounded-[1.75rem] border border-[#cfbea4] bg-[#fff8f0] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a6146]">First prompt preview</p>
          <p className="mt-3 text-2xl font-semibold leading-[1.35] text-[var(--af-color-primary)] sm:text-3xl">
            {firstPrompt}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#665746]">
          <span className="rounded-full border border-[#dbcdb8] bg-[#fffdf8] px-3 py-1">
            {questionCount} {questionCount === 1 ? "prompt" : "prompts"}
          </span>
          <span className="rounded-full border border-[#dbcdb8] bg-[#fffdf8] px-3 py-1">Voice response</span>
          <span>Most people finish in under one minute.</span>
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-balance text-[var(--af-color-primary)]">{survey.title}</h1>

        <div className="mt-6">
          <Link
            href={surveyHref}
            className="inline-flex items-center justify-center rounded-xl bg-[#b85e2d] px-5 py-2.5 text-sm font-medium text-[#fff6ed] transition-colors hover:bg-[#a05227]"
          >
            Open survey
          </Link>
        </div>
      </section>
    </main>
  )
}
