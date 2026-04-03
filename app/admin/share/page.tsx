"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRequireAdmin } from "@/lib/auth-context"
import {
  buildSurveyRespondUrl,
  buildSurveyShareUrl,
  buildTelegramShareUrl,
  buildWhatsAppShareUrl,
  buildXShareUrl,
} from "@/lib/share-links"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"
import { Button } from "@/components/ui/button"
import { AdminMobileNav } from "@/components/admin-mobile-nav"
import { PocketActionStack, PocketSection, PocketShell } from "@/components/mobile/pocket-shell"
import { useIsMobile } from "@/components/ui/use-mobile"
import { Copy, ExternalLink, MessageCircle, Play, QrCode, Send, Twitter } from "lucide-react"

type SurveyItem = {
  id: string
  title: string
  questionCount: number
  status: "draft" | "published" | "live" | "closed"
  updatedAt: string
  publishedAt: string | null
}

type PublicSurveyDetail = {
  id: string
  title: string
  questionCount: number
  publicListeningEnabled: boolean
  status: string
  questions: string[]
}

function isShareableSurveyStatus(status: SurveyItem["status"]) {
  return status === "published" || status === "live"
}

function slugify(value: string): string {
  return value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "audioform-survey"
}

function buildShareMessage(title: string, firstQuestion: string, previewUrl: string) {
  return `${title}\n\n${firstQuestion}\n\nHear. Speak. Join.\n${previewUrl}`
}

export default function AdminSharePage() {
  const { status } = useRequireAdmin()
  const isMobile = useIsMobile()
  const [surveys, setSurveys] = useState<SurveyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null)
  const [selectedSurveyDetail, setSelectedSurveyDetail] = useState<PublicSurveyDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (status !== "authenticated") return

    let cancelled = false
    const run = async () => {
      try {
        const response = await fetch("/api/surveys", { credentials: "include", cache: "no-store" })
        if (!response.ok) throw new Error("Failed to load releases.")
        const json = (await response.json()) as { surveys?: SurveyItem[] }
        if (!cancelled) {
          const nextSurveys = json.surveys ?? []
          setSurveys(nextSurveys)
          setSelectedSurveyId(nextSurveys.find((survey) => isShareableSurveyStatus(survey.status))?.id ?? null)
        }
      } catch {
        if (!cancelled) setMessage("Could not load releases. Refresh and try again.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [status])

  useEffect(() => {
    if (!selectedSurveyId) {
      setSelectedSurveyDetail(null)
      return
    }

    let cancelled = false
    setDetailLoading(true)
    const run = async () => {
      try {
        const response = await fetch(`/api/surveys/public/${encodeURIComponent(selectedSurveyId)}`, {
          cache: "no-store",
        })
        if (!response.ok) throw new Error("Failed to load release details.")
        const json = (await response.json()) as { survey?: PublicSurveyDetail }
        if (!cancelled) setSelectedSurveyDetail(json.survey ?? null)
      } catch {
        if (!cancelled) {
          setSelectedSurveyDetail(null)
          setMessage("Could not load the preview prompt for this release.")
        }
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [selectedSurveyId])

  const shareableSurveys = useMemo(
    () => surveys.filter((survey) => isShareableSurveyStatus(survey.status)),
    [surveys],
  )

  const selectedSurvey = shareableSurveys.find((survey) => survey.id === selectedSurveyId) ?? shareableSurveys[0] ?? null

  const links = useMemo(() => {
    if (!selectedSurvey || typeof window === "undefined") {
      return {
        previewUrl: "",
        surveyUrl: "",
        qrUrl: "",
        ogImageUrl: "",
        whatsappUrl: "",
        xUrl: "",
        telegramUrl: "",
        shareMessage: "",
      }
    }

    const origin = window.location.origin
    const previewUrl = buildSurveyShareUrl(origin, selectedSurvey.id, { version: selectedSurvey.updatedAt, source: "social" })
    const surveyUrl = buildSurveyRespondUrl(origin, selectedSurvey.id, { version: selectedSurvey.updatedAt, source: "qr" })
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(surveyUrl)}`
    const ogImageUrl = `${origin}/api/og/survey?surveyId=${encodeURIComponent(selectedSurvey.id)}&v=${encodeURIComponent(selectedSurvey.updatedAt)}&ext=.png`
    const firstQuestion = selectedSurveyDetail?.questions?.[0]?.trim() || "Scan, speak, and share one honest opinion by voice."
    const shareMessage = buildShareMessage(selectedSurvey.title, firstQuestion, previewUrl)

    return {
      previewUrl,
      surveyUrl,
      qrUrl,
      ogImageUrl,
      shareMessage,
      whatsappUrl: buildWhatsAppShareUrl(shareMessage),
      xUrl: buildXShareUrl(previewUrl, `${selectedSurvey.title} - ${firstQuestion}`),
      telegramUrl: buildTelegramShareUrl(previewUrl, `${selectedSurvey.title}\n\n${firstQuestion}\n\nHear. Speak. Join.`),
    }
  }, [selectedSurvey, selectedSurveyDetail])

  const firstQuestion = selectedSurveyDetail?.questions?.[0]?.trim() || "Scan, speak, and share one honest opinion by voice."
  const distributionLabel = selectedSurveyDetail?.publicListeningEnabled
    ? "Social cards invite people to hear the conversation, add their voice, and join the listening room."
    : "Social cards invite people to hear the prompt and add their voice in one clean link-first flow."

  const downloadQrCode = async () => {
    if (!selectedSurvey || !links.qrUrl) return
    try {
      const response = await fetch(links.qrUrl)
      const blob = await response.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = objectUrl
      anchor.download = `${slugify(selectedSurvey.title)}-survey-qr.png`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(objectUrl)
      setMessage(`QR code downloaded for "${selectedSurvey.title}".`)
    } catch {
      setMessage("Could not download QR code. Please try again.")
    }
  }

  const copyToClipboard = async (value: string, successMessage: string, errorMessage: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setMessage(successMessage)
    } catch {
      setMessage(errorMessage)
    }
  }

  if (status === "loading" || loading) {
    return <SurveyLoadingSkeleton label="Loading share hub..." />
  }

  const surveySelector = (
    <div className="space-y-2">
      {shareableSurveys.length ? (
        shareableSurveys.map((survey) => (
          <button
            key={survey.id}
            type="button"
            onClick={() => setSelectedSurveyId(survey.id)}
            aria-pressed={selectedSurvey?.id === survey.id}
            aria-label={`Select ${survey.title} for sharing`}
            className={`w-full rounded-[1rem] border px-3 py-3 text-left ${
              selectedSurvey?.id === survey.id
                ? "border-[#c78e6e] bg-[#fff0e6]"
                : "border-[#dbcdb8] bg-[#fffdf8]"
            }`}
          >
            <p className="text-sm font-semibold text-[var(--af-color-primary)]">{survey.title}</p>
            <p className="font-body mt-1 text-xs text-[#5c5146]">{survey.questionCount} prompts</p>
          </button>
        ))
      ) : (
        <Link href="/admin/questionnaires/v1">
          <Button className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]">Open Studio first</Button>
        </Link>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <>
        <PocketShell
          eyebrow="Distribution"
          title="Share hub"
          description="Social preview goes to the release card. QR sends people straight into the live survey."
        >
          {message ? (
            <p className="font-body mb-4 rounded-2xl border border-[#cfbea4] bg-[#fff8f0] px-4 py-3 text-sm text-[#665746]">
              {message}
            </p>
          ) : null}

          <PocketSection
            title="Live release"
            description={selectedSurvey ? "Choose the release you want to send into the world." : "Publish from Studio first to use the share hub."}
          >
            {surveySelector}
          </PocketSection>

          {selectedSurvey ? (
            <>
              <PocketSection
                title="Social preview"
                description={detailLoading ? "Loading first prompt preview..." : distributionLabel}
                className="mt-4 bg-[#fff6ed]"
              >
                <div className="rounded-[1.4rem] border border-[#dbcdb8] bg-[linear-gradient(180deg,#fffdf8_0%,#fff7ee_100%)] p-4">
                  <img
                    src={links.ogImageUrl}
                    alt={`OG preview for ${selectedSurvey.title}`}
                    className="w-full rounded-[1.1rem] border border-[#dbcdb8]"
                  />
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a431f]">First prompt preview</p>
                  <p className="mt-2 text-base font-semibold leading-7 text-[var(--af-color-primary)]">{firstQuestion}</p>
                </div>
                <div className="mt-4 rounded-[1.2rem] border border-[#dbcdb8] bg-[#fffdf8] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a431f]">Distribution script</p>
                  <p className="mt-2 text-sm leading-6 text-[#5c5146]">
                    Hear. Speak. Join. Start with the first prompt, answer by voice, then follow the conversation when public listening is on.
                  </p>
                </div>
                <PocketActionStack>
                  <Button
                    className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]"
                    onClick={() => void copyToClipboard(links.previewUrl, `Preview link copied for "${selectedSurvey.title}".`, "Could not copy preview link. Please try again.")}
                  >
                    <Copy className="mr-2 size-4" />
                    Copy social preview link
                  </Button>
                  <Button asChild variant="outline" className="w-full border-[#dbcdb8] bg-[#fffdf8]">
                    <a href={links.whatsappUrl} target="_blank" rel="noreferrer">
                      <MessageCircle className="mr-2 size-4" />
                      Share to WhatsApp
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="w-full border-[#dbcdb8] bg-[#fffdf8]">
                    <a href={links.xUrl} target="_blank" rel="noreferrer">
                      <Twitter className="mr-2 size-4" />
                      Share to X
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="w-full border-[#dbcdb8] bg-[#fffdf8]">
                    <a href={links.telegramUrl} target="_blank" rel="noreferrer">
                      <Send className="mr-2 size-4" />
                      Share to Telegram
                    </a>
                  </Button>
                </PocketActionStack>
              </PocketSection>

              <PocketSection
                title="QR handoff"
                description="Scan goes directly into the live survey, not the preview page."
                className="mt-4"
              >
                <div className="mx-auto w-fit rounded-[1.5rem] border border-[#dbcdb8] bg-[linear-gradient(180deg,#fff8f0_0%,#fffdf8_100%)] p-4">
                  <img src={links.qrUrl} alt="QR code for live survey" width={220} height={220} className="size-[220px]" />
                </div>
                <div className="mt-4 rounded-[1.2rem] border border-[#dbcdb8] bg-[#fff6ed] p-3">
                  <div className="flex items-center gap-2 text-[#8a431f]">
                    <Play className="size-4" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">Scan path</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#5c5146]">
                    QR is for rooms, events, and in-person demos. It should always open the live survey first so people can start speaking immediately.
                  </p>
                </div>
                <PocketActionStack>
                  <Button
                    className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]"
                    onClick={downloadQrCode}
                  >
                    <QrCode className="mr-2 size-4" />
                    Download survey QR
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-[#dbcdb8] bg-[#fffdf8]"
                    onClick={() => void copyToClipboard(links.surveyUrl, `Live survey link copied for "${selectedSurvey.title}".`, "Could not copy live survey link. Please try again.")}
                  >
                    <Copy className="mr-2 size-4" />
                    Copy live survey link
                  </Button>
                  <Button asChild variant="outline" className="w-full border-[#dbcdb8] bg-[#fffdf8]">
                    <a href={links.surveyUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 size-4" />
                      Open live survey
                    </a>
                  </Button>
                </PocketActionStack>
              </PocketSection>
            </>
          ) : null}
        </PocketShell>
        <AdminMobileNav />
      </>
    )
  }

  return (
    <main className="af-shell min-h-dvh p-4 pb-28 sm:p-6 sm:pb-6">
      <section className="af-panel mx-auto max-w-6xl rounded-[2rem] border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-body text-sm text-[#5c5146]">Distribution</p>
            <h1 className="mt-1 text-3xl font-semibold text-balance">Share hub</h1>
            <p className="font-body mt-2 max-w-2xl text-sm text-[#5c5146] text-pretty">
              Social preview should sell the first prompt. QR should drop people straight into the live survey. This is the handoff desk for both.
            </p>
          </div>
          <Link href="/admin/dashboard/v4">
            <Button variant="outline" className="border-[#dbcdb8] bg-[#f3ecdf]">Back to Listen</Button>
          </Link>
        </div>

        {message ? (
          <p className="font-body mt-5 rounded-2xl border border-[#cfbea4] bg-[#fff8f0] px-4 py-3 text-sm text-[#665746]">
            {message}
          </p>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <section className="rounded-[1.8rem] border border-[#dbcdb8] bg-[#fffaf3] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">Choose release</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--af-color-primary)]">Pick the survey you want to distribute.</h2>
            <div className="mt-4">{surveySelector}</div>
          </section>

          {selectedSurvey ? (
            <section className="grid gap-6">
              <div className="rounded-[1.8rem] border border-[#cfbea4] bg-[linear-gradient(135deg,#fff4e9_0%,#fff8f0_45%,#fffdf8_100%)] p-5 shadow-[0_18px_40px_rgba(122,97,70,0.08)]">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">Release campaign</p>
                    <h2 className="mt-2 text-2xl font-semibold text-[var(--af-color-primary)]">{selectedSurvey.title}</h2>
                    <p className="mt-2 max-w-2xl text-sm text-[#5c5146]">{distributionLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-[#7a6146]">
                    <span className="rounded-full border border-[#dbcdb8] bg-[#fffdf8] px-3 py-1">
                      {selectedSurvey.questionCount} prompts
                    </span>
                    <span className="rounded-full border border-[#dbcdb8] bg-[#fffdf8] px-3 py-1">
                      {selectedSurveyDetail?.publicListeningEnabled ? "Public listening on" : "Voice answer flow"}
                    </span>
                  </div>
                </div>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_320px]">
                  <div className="rounded-[1.6rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">Social preview</p>
                    <h2 className="mt-2 text-2xl font-semibold text-[var(--af-color-primary)]">Hear. Speak. Join.</h2>
                    <p className="mt-2 max-w-2xl text-sm text-[#5c5146]">
                      {detailLoading ? "Loading the first prompt preview..." : "Use this for WhatsApp, X, Telegram, and anywhere the OG image needs to sell the first question."}
                    </p>
                    <div className="mt-5 rounded-[1.4rem] border border-[#dbcdb8] bg-[linear-gradient(180deg,#fffdf8_0%,#fff7ee_100%)] p-4">
                      <img
                        src={links.ogImageUrl}
                        alt={`OG preview for ${selectedSurvey.title}`}
                        className="w-full rounded-[1.1rem] border border-[#dbcdb8]"
                      />
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#7a6146]">
                        <span className="rounded-full border border-[#dbcdb8] bg-[#fff8f0] px-3 py-1">
                          {selectedSurvey.questionCount} prompts
                        </span>
                        <span className="rounded-full border border-[#dbcdb8] bg-[#fff8f0] px-3 py-1">
                          {selectedSurveyDetail?.publicListeningEnabled ? "Public listening on" : "Voice answers"}
                        </span>
                      </div>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a431f]">First prompt preview</p>
                      <p className="mt-2 text-xl font-semibold leading-8 text-[var(--af-color-primary)]">{firstQuestion}</p>
                    </div>
                    <div className="mt-4 rounded-[1.2rem] border border-[#dbcdb8] bg-[#fff8f0] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a431f]">Suggested share line</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#5c5146]">{links.shareMessage}</p>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[#8a431f]">Social actions</p>
                    <div className="mt-4 space-y-3">
                      <Button
                        className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]"
                        onClick={() => void copyToClipboard(links.previewUrl, `Preview link copied for "${selectedSurvey.title}".`, "Could not copy preview link. Please try again.")}
                      >
                        <Copy className="mr-2 size-4" />
                        Copy social preview link
                      </Button>
                      <Button asChild variant="outline" className="w-full justify-start border-[#dbcdb8] bg-[#fffdf8]">
                        <a href={links.whatsappUrl} target="_blank" rel="noreferrer">
                          <MessageCircle className="mr-2 size-4" />
                          Share to WhatsApp
                        </a>
                      </Button>
                      <Button asChild variant="outline" className="w-full justify-start border-[#dbcdb8] bg-[#fffdf8]">
                        <a href={links.xUrl} target="_blank" rel="noreferrer">
                          <Twitter className="mr-2 size-4" />
                          Share to X
                        </a>
                      </Button>
                      <Button asChild variant="outline" className="w-full justify-start border-[#dbcdb8] bg-[#fffdf8]">
                        <a href={links.telegramUrl} target="_blank" rel="noreferrer">
                          <Send className="mr-2 size-4" />
                          Share to Telegram
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-[#dbcdb8] bg-[linear-gradient(135deg,#fffdf8_0%,#fff8f0_100%)] p-5">
                <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                  <div className="rounded-[1.5rem] border border-[#dbcdb8] bg-[#fff8f0] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                    <img src={links.qrUrl} alt="QR code for live survey" className="w-full rounded-[1rem]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">QR handoff</p>
                    <h2 className="mt-2 text-2xl font-semibold text-[var(--af-color-primary)]">Send scanners straight into the survey.</h2>
                    <p className="mt-2 max-w-2xl text-sm text-[#5c5146]">
                      The QR code points to the live survey link, not the social preview page, so in-person and event handoffs go directly into recording.
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a431f]">Step 1</p>
                        <p className="mt-2 text-sm font-medium text-[var(--af-color-primary)]">Scan</p>
                      </div>
                      <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a431f]">Step 2</p>
                        <p className="mt-2 text-sm font-medium text-[var(--af-color-primary)]">Speak</p>
                      </div>
                      <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a431f]">Step 3</p>
                        <p className="mt-2 text-sm font-medium text-[var(--af-color-primary)]">Listen</p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]" onClick={downloadQrCode}>
                        <QrCode className="mr-2 size-4" />
                        Download survey QR
                      </Button>
                      <Button
                        variant="outline"
                        className="border-[#dbcdb8] bg-[#fffdf8]"
                        onClick={() => void copyToClipboard(links.surveyUrl, `Live survey link copied for "${selectedSurvey.title}".`, "Could not copy live survey link. Please try again.")}
                      >
                        <Copy className="mr-2 size-4" />
                        Copy live survey link
                      </Button>
                      <Button asChild variant="outline" className="border-[#dbcdb8] bg-[#fffdf8]">
                        <a href={links.surveyUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 size-4" />
                          Open live survey
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  )
}
