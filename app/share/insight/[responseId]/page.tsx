import type { Metadata } from "next"
import Link from "next/link"
import { getInsightByTranscriptId } from "@/lib/server/insight-store"
import { getTranscriptByResponseId } from "@/lib/server/transcript-store"

type PageProps = {
  params: Promise<{ responseId: string }>
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://audioform-production.up.railway.app"

function normalizeComparableText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase()
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { responseId } = await params
  const transcript = await getTranscriptByResponseId(responseId)
  const insight = transcript ? await getInsightByTranscriptId(transcript.id) : null

  const title = insight?.summary?.trim() || "Audioform insight"
  const description =
    insight?.quotes?.[0]?.trim() ||
    insight?.primaryTheme?.trim() ||
    "High-signal voice feedback, shared with Audioform."
  const url = `${appUrl}/share/insight/${encodeURIComponent(responseId)}`
  const imageUrl = `${appUrl}/api/og/insight?responseId=${encodeURIComponent(responseId)}&ext=.png`

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
      type: "article",
      siteName: "Audioform",
      locale: "en_US",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
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

export default async function ShareInsightPage({ params }: PageProps) {
  const { responseId } = await params
  const transcript = await getTranscriptByResponseId(responseId)
  const insight = transcript ? await getInsightByTranscriptId(transcript.id) : null

  const summary = insight?.summary?.trim() || "This Audioform insight is still processing."
  const quote = insight?.quotes?.[0]?.trim() || null
  const theme = insight?.primaryTheme?.trim() || null
  const transcriptText = transcript?.transcriptText?.trim() || null
  const normalizedTranscript = normalizeComparableText(transcriptText)
  const normalizedQuote = normalizeComparableText(quote)
  const showTranscript =
    Boolean(transcriptText) &&
    (!normalizedQuote || !normalizedTranscript.includes(normalizedQuote) || normalizedTranscript.length - normalizedQuote.length > 80)

  return (
    <main className="min-h-dvh bg-[#f3ecdf] p-4 sm:p-6">
      <section className="mx-auto max-w-3xl rounded-[1.5rem] border border-[#dbcdb8] bg-[#f9f4ea] p-6 sm:rounded-[2rem] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a6146]">Audioform insight</p>
        <h1 className="mt-3 text-3xl font-semibold text-balance text-[#261c14]">{summary}</h1>
        {theme ? <p className="mt-3 text-sm text-[#665746]">Primary theme: {theme}</p> : null}

        {quote ? (
          <div className="mt-6 rounded-2xl border border-[#cfbea4] bg-[#fff8f0] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a6146]">Direct quote</p>
            <p className="mt-2 text-lg font-medium leading-8 text-[#261c14]">&ldquo;{quote}&rdquo;</p>
          </div>
        ) : null}

        {showTranscript ? (
          <details className="mt-6 rounded-2xl border border-[#cfbea4] bg-[#fffdf8] p-4">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-[#7a6146]">
              Full transcript
            </summary>
            <p className="mt-3 text-sm leading-7 text-[#665746]">{transcriptText}</p>
          </details>
        ) : null}

        <p className="mt-5 text-sm leading-6 text-[#665746]">
          Shared from Audioform&apos;s voice-feedback inbox.
        </p>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-[#b85e2d] px-5 py-2.5 text-sm font-medium text-[#fff6ed] transition-colors hover:bg-[#a05227]"
          >
            Open Audioform
          </Link>
        </div>
      </section>
    </main>
  )
}
