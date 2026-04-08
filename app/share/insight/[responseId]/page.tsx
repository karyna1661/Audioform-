import type { Metadata } from "next"
import Link from "next/link"
import { getInsightByTranscriptId } from "@/lib/server/insight-store"
import { getTranscriptByResponseId } from "@/lib/server/transcript-store"

type PageProps = {
  params: Promise<{ responseId: string }>
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://audioform-production.up.railway.app"

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { responseId } = await params
  const transcript = await getTranscriptByResponseId(responseId)
  const insight = transcript ? await getInsightByTranscriptId(transcript.id) : null

  const title = insight?.narrativeSummary?.trim() || "Audioform insight"
  const description =
    insight?.powerQuote?.trim() ||
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

  const summary = insight?.narrativeSummary?.trim() || "This Audioform insight is still processing."
  const quote = insight?.powerQuote?.trim() || null
  const theme = insight?.primaryTheme?.trim() || null
  const transcriptText = transcript?.transcriptText?.trim() || null

  return (
    <main className="af-shell af-noise-wrap min-h-dvh p-4 sm:p-6">
      <section className="af-panel mx-auto max-w-3xl rounded-[1.5rem] border p-5 sm:rounded-[2rem] sm:p-8">
        <div className="af-chip mb-4 flex items-center justify-between gap-3 rounded-[1.15rem] border px-3 py-3 sm:hidden">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7a6146]">Audioform insight</p>
            <p className="mt-1 text-sm font-medium text-[#5c5146]">Signal separated into summary, quote, and transcript.</p>
          </div>
          <span className="rounded-full bg-[#fffdf8] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#8a431f]">Shared</span>
        </div>
        <p className="hidden text-sm font-semibold uppercase tracking-[0.18em] text-[#7a6146] sm:block">Audioform insight</p>
        <h1 className="mt-3 text-3xl font-semibold text-balance text-[var(--af-color-primary)]">{summary}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {theme ? <p className="rounded-full border border-[#dbcdb8] bg-[#fffdf8] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[#665746]">Theme: {theme}</p> : null}
          {insight?.signalSummary?.complaint ? (
            <p className="rounded-full border border-[#dbcdb8] bg-[#fffdf8] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[#665746]">Complaint: {insight.signalSummary.complaint}</p>
          ) : null}
        </div>

        <div className="af-mobile-rail mt-5 sm:hidden">
          {[
            "Narrative summary is synthetic interpretation, not the transcript itself.",
            "Direct quotes remain verbatim so the shared artifact stays trustworthy.",
          ].map((line) => (
            <div key={line} className="af-mobile-rail-card rounded-[1.2rem] border border-[#dbcdb8] bg-[#fffdf8] p-4 text-sm leading-6 text-[#5c5146]">
              {line}
            </div>
          ))}
        </div>

        {quote ? (
          <div className="mt-6 rounded-2xl border border-[#cfbea4] bg-[#fff8f0] p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a6146]">Direct quote</p>
            <p className="mt-2 text-lg font-medium leading-8 text-[var(--af-color-primary)]">&ldquo;{quote}&rdquo;</p>
          </div>
        ) : null}

        {transcriptText ? (
          <div className="mt-6 rounded-2xl border border-[#cfbea4] bg-[#fffdf8] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a6146]">Transcript</p>
            <p className="mt-2 text-sm leading-7 text-[#665746]">{transcriptText}</p>
          </div>
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
