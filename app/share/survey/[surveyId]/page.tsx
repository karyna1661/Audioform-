import type { Metadata } from "next"
import Link from "next/link"
import { AudioWaveform, Headphones, Mic, QrCode, Sparkles } from "lucide-react"
import { getReleaseInsightBySurveyId } from "@/lib/server/release-insight-store"
import { getLatestPublishedSurveyQuestions, getPublishedSurveyById } from "@/lib/server/survey-store"
import { buildSurveyRespondPath, isUuidLike, normalizeArrivalSource } from "@/lib/share-links"

type PageProps = {
  params: Promise<{ surveyId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://audioform-production.up.railway.app"

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { surveyId } = await params
  const { v, src } = await searchParams
  const survey = isUuidLike(surveyId) ? await getPublishedSurveyById(surveyId) : null
  const releaseInsight = survey ? await getReleaseInsightBySurveyId(surveyId).catch(() => null) : null
  const arrivalSource = normalizeArrivalSource(typeof src === "string" ? src : null)

  const title = survey?.title?.trim() || "Audioform voice survey"
  const description =
    releaseInsight?.narrativeSummary ||
    (arrivalSource === "social"
      ? "Hear. Speak. Join. Answer by voice and join the conversation."
      : "Scan. Speak. Listen. Answer by voice and hear the shape of opinion.")
  const searchSuffix = new URLSearchParams(
    Object.entries({
      ...(typeof v === "string" ? { v } : {}),
      ...(arrivalSource !== "direct" ? { src: arrivalSource } : {}),
    }),
  ).toString()
  const url = `${appUrl}/share/survey/${encodeURIComponent(surveyId)}${searchSuffix ? `?${searchSuffix}` : ""}`
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

export default async function ShareSurveyPage({ params, searchParams }: PageProps) {
  const { surveyId } = await params
  const resolvedSearchParams = await searchParams
  const survey = isUuidLike(surveyId) ? await getPublishedSurveyById(surveyId) : null
  const prompts = survey ? await getLatestPublishedSurveyQuestions(surveyId) : []
  const releaseInsight = survey ? await getReleaseInsightBySurveyId(surveyId).catch(() => null) : null
  const arrivalSource = normalizeArrivalSource(typeof resolvedSearchParams.src === "string" ? resolvedSearchParams.src : null)
  const isSocialEntry = arrivalSource === "social"
  const isQrEntry = arrivalSource === "qr"
  const topEyebrow = isSocialEntry ? "Hear. Speak. Join." : "Scan. Speak. Listen."
  const surveyHref = buildSurveyRespondPath(surveyId, {
    source: arrivalSource === "direct" ? "social" : arrivalSource,
  })
  const stepOneLabel = isSocialEntry ? "Hear" : "Scan"
  const stepOneBody = isSocialEntry
    ? "Open the release from a shared card and get the first question in context before you answer."
    : "Open the release instantly from a QR code and move straight into the live survey."
  const whyItFeelsDifferent = isSocialEntry
    ? "This is not a static card. It is a conversation invite: hear the prompt, add your voice, then join the listening room if the creator opened it."
    : "This is not a form wall. It is a conversation loop designed for voice: scan in, speak clearly, then keep listening if the creator opened the room."

  if (!survey) {
    return (
      <main className="min-h-dvh bg-[linear-gradient(135deg,#f4ecdf_0%,#efe2cb_100%)] p-4 sm:p-6">
        <section className="mx-auto max-w-4xl rounded-[2rem] border border-[#dbcdb8] bg-[#f9f4ea] p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a6146]">{topEyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold text-balance text-[var(--af-color-primary)]">This release link is unavailable.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#665746]">
            Ask the creator to republish the survey and share a fresh link.
          </p>
        </section>
      </main>
    )
  }

  const firstPrompt = prompts[0]?.trim() || "Share one concrete moment by voice."
  const questionCount = Math.max(survey.questionCount, prompts.length)
  const playlistPromise = survey.publicListeningEnabled
    ? "After you respond, you can unlock the player and listen to the strongest takes from other responders."
    : isSocialEntry
      ? "This release is collecting private takes for the creator, even when the listening room is closed."
      : "This release is set up for a clean scan-and-speak flow."

  return (
    <main className="af-shell af-noise-wrap min-h-dvh p-4 sm:p-6">
      <section className="af-panel mx-auto max-w-6xl rounded-[2rem] border p-5 shadow-[0_18px_40px_rgba(122,97,70,0.08)] sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_380px]">
          <div>
            <div className="af-chip mb-4 flex items-center justify-between gap-3 rounded-[1.15rem] border px-3 py-3 sm:hidden">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8a431f]">Audioform release</p>
                <p className="mt-1 text-sm font-medium text-[#5c5146]">A premium voice response flow designed for fast mobile contribution.</p>
              </div>
              <span className="rounded-full bg-[#fffdf8] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#8a431f]">Speak</span>
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a6146]">{topEyebrow}</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-balance text-[var(--af-color-primary)] sm:text-5xl">
              {survey.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#5c5146]">
              {releaseInsight?.narrativeSummary ||
              (isSocialEntry
                ? "Hear the first prompt, add one honest voice take, then join the conversation if public listening is on."
                : "Share one honest opinion by voice. Start with the first prompt, answer in under a minute, then follow the conversation if public listening is on.")}
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-sm text-[#665746]">
              <span className="rounded-full border border-[#dbcdb8] bg-[#fffdf8] px-3 py-1">
                {questionCount} {questionCount === 1 ? "prompt" : "prompts"}
              </span>
              <span className="rounded-full border border-[#dbcdb8] bg-[#fffdf8] px-3 py-1">Voice response</span>
              <span className="rounded-full border border-[#dbcdb8] bg-[#fffdf8] px-3 py-1">
                {survey.publicListeningEnabled ? "Player unlock after response" : "Direct response flow"}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 sm:hidden">
              {[
                { value: `${questionCount}`, label: questionCount === 1 ? "prompt" : "prompts" },
                { value: "Voice", label: "response mode" },
                { value: survey.publicListeningEnabled ? "Public" : "Private", label: "listening mode" },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.15rem] border border-[#dbcdb8] bg-[#fffdf8] px-3 py-3">
                  <p className="text-base font-semibold text-[var(--af-color-primary)]">{item.value}</p>
                  <p className="mt-1 text-[11px] leading-4 text-[#665746]">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[1.8rem] border border-[#cfbea4] bg-[linear-gradient(180deg,#fff8f0_0%,#fffdf8_100%)] p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a6146]">First prompt preview</p>
              <p className="mt-3 text-2xl font-semibold leading-[1.4] text-[var(--af-color-primary)] sm:text-3xl">
                {firstPrompt}
              </p>
              {releaseInsight?.shareArtifacts?.topQuotes?.[0] ? (
                <blockquote className="mt-4 rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3 text-sm italic leading-6 text-[#665746]">
                  "{releaseInsight.shareArtifacts.topQuotes[0]}"
                </blockquote>
              ) : null}
            </div>

            <div className="af-mobile-rail mt-5 sm:hidden">
              {[
                {
                  title: "A cleaner contribution moment",
                  text: "No long form. No dense survey chrome. One prompt, one voice take, one clear next step.",
                },
                {
                  title: "Trust stays visible",
                  text: survey.publicListeningEnabled
                    ? "If you opt in, the listening room opens after submission. If not, your take still reaches the creator."
                    : "This release keeps the contribution path private, so your take goes straight to creator review.",
                },
              ].map((item) => (
                <div key={item.title} className="af-mobile-rail-card rounded-[1.2rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
                  <p className="text-sm font-semibold text-[var(--af-color-primary)]">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#5c5146]">{item.text}</p>
                </div>
              ))}
            </div>

            {releaseInsight ? (
              <div className="mt-6 hidden gap-3 sm:grid sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a431f]">Top complaint</p>
                  <p className="mt-3 text-sm leading-6 text-[#665746]">
                    {releaseInsight.signalSummary?.topComplaints?.[0]?.label || "Signal is still gathering around the first complaint cluster."}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a431f]">Top opportunity</p>
                  <p className="mt-3 text-sm leading-6 text-[#665746]">
                    {releaseInsight.signalSummary?.topOpportunities?.[0]?.label || "Opportunity patterns will appear as more takes land."}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a431f]">Best cluster</p>
                  <p className="mt-3 text-sm leading-6 text-[#665746]">
                    {releaseInsight.shareArtifacts?.bestClusterLabel || "This release is still finding its sharpest cluster."}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mt-8 hidden gap-3 sm:grid sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
                <div className="inline-flex size-10 items-center justify-center rounded-full border border-[#dbcdb8] bg-[#fff8f0]">
                  <QrCode className="size-4 text-[#8a431f]" />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a431f]">Step 1</p>
                <p className="mt-2 text-lg font-semibold text-[var(--af-color-primary)]">{stepOneLabel}</p>
                <p className="mt-2 text-sm leading-6 text-[#665746]">{stepOneBody}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
                <div className="inline-flex size-10 items-center justify-center rounded-full border border-[#dbcdb8] bg-[#fff8f0]">
                  <Mic className="size-4 text-[#8a431f]" />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a431f]">Step 2</p>
                <p className="mt-2 text-lg font-semibold text-[var(--af-color-primary)]">Speak</p>
                <p className="mt-2 text-sm leading-6 text-[#665746]">Record your answer by voice with a fast, low-friction flow.</p>
              </div>
              <div className="rounded-[1.5rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
                <div className="inline-flex size-10 items-center justify-center rounded-full border border-[#dbcdb8] bg-[#fff8f0]">
                  <Headphones className="size-4 text-[#8a431f]" />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a431f]">Step 3</p>
                <p className="mt-2 text-lg font-semibold text-[var(--af-color-primary)]">Listen</p>
                <p className="mt-2 text-sm leading-6 text-[#665746]">
                  {survey.publicListeningEnabled ? "Unlock the playlist after you respond and hear other voices in preview mode." : "Creators can review every take privately inside Listen."}
                </p>
              </div>
            </div>

            <div className="af-mobile-scroller mt-8 sm:hidden">
              {[
                {
                  icon: <QrCode className="size-4 text-[#8a431f]" />,
                  step: "01",
                  title: stepOneLabel,
                  body: stepOneBody,
                },
                {
                  icon: <Mic className="size-4 text-[#8a431f]" />,
                  step: "02",
                  title: "Speak",
                  body: "Record your answer by voice with a fast, low-friction mobile flow.",
                },
                {
                  icon: <Headphones className="size-4 text-[#8a431f]" />,
                  step: "03",
                  title: "Listen",
                  body: survey.publicListeningEnabled ? "Unlock the playlist after you respond and hear other voices in preview mode." : "Creators can review every take privately inside Listen.",
                },
              ].map((item) => (
                <div key={item.step} className="rounded-[1.45rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
                  <div className="inline-flex size-10 items-center justify-center rounded-full border border-[#dbcdb8] bg-[#fff8f0]">
                    {item.icon}
                  </div>
                  <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a431f]">Step {item.step}</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--af-color-primary)]">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#665746]">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={surveyHref}
                className="inline-flex items-center justify-center rounded-xl bg-[#b85e2d] px-5 py-3 text-sm font-medium text-[#fff6ed] transition-colors hover:bg-[#a05227] sm:rounded-xl"
              >
                Start speaking
              </Link>
              <span className="inline-flex items-center justify-center rounded-xl border border-[#dbcdb8] bg-[#fffdf8] px-5 py-3 text-sm text-[#5c5146]">
                Most people finish in under one minute
              </span>
            </div>
          </div>

          <aside className="af-pocket-surface order-first rounded-[1.8rem] border border-[#dbcdb8] p-5 sm:order-none sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a431f]">What happens after you respond</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--af-color-primary)]">Your take becomes part of a living release.</h2>
            <p className="mt-3 text-sm leading-6 text-[#5c5146]">{playlistPromise}</p>

            <div className="mt-5 rounded-[1.5rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
              <div className="flex items-center gap-2 text-[#8a431f]">
                <AudioWaveform className="size-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Player mode</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#665746]">
                Preview mode surfaces the strongest takes first, so responders can hear the shape of opinion without digging through raw recordings.
              </p>
              <div className="mt-4 space-y-2">
                <div className="rounded-2xl border border-[#dbcdb8] bg-[#fff8f0] px-4 py-3">
                  <p className="text-sm font-medium text-[var(--af-color-primary)]">Best clips first</p>
                </div>
                <div className="rounded-2xl border border-[#dbcdb8] bg-[#fff8f0] px-4 py-3">
                  <p className="text-sm font-medium text-[var(--af-color-primary)]">Preview mode on</p>
                </div>
                <div className="rounded-2xl border border-[#dbcdb8] bg-[#fff8f0] px-4 py-3">
                  <p className="text-sm font-medium text-[var(--af-color-primary)]">
                    {survey.publicListeningEnabled ? "Unlocked right after submission" : "Reserved for creator review"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
              <div className="flex items-center gap-2 text-[#8a431f]">
                <Sparkles className="size-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Why this feels different</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#665746]">
                {whyItFeelsDifferent}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
