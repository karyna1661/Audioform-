"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Headphones, Mic, Radio, Sparkles } from "lucide-react"
import { useRequireAdmin } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"
import { PocketActionStack, PocketSection, PocketShell } from "@/components/mobile/pocket-shell"
import { useIsMobile } from "@/components/ui/use-mobile"
import { AdminMobileNav } from "@/components/admin-mobile-nav"
import { AudioSequencePlayer, type ListeningTrack } from "@/components/listen/audio-sequence-player"
import { useListeningSession } from "@/components/listen/listening-session-provider"
import { trackEvent } from "@/lib/analytics"

type SurveyItem = {
  id: string
  title: string
  questionCount: number
  status: "draft" | "published" | "live" | "closed"
  updatedAt: string
  publishedAt: string | null
  publicListeningEnabled?: boolean
}

type ResponseItem = {
  id: string
  surveyId: string
  surveyTitle: string
  durationSeconds?: number | null
  playbackUrl: string
  highSignal: boolean
  bookmarked: boolean
  flagged: boolean
  publicPlaylistEligible?: boolean
  listening?: {
    rank: number
    hotTake: string
    momentumTags: string[]
    previewClipRange?: { startSeconds: number; endSeconds: number } | null
    collectionMembership?: string[]
    epInclusion?: boolean
  }
  insight?: {
    primaryTheme: string | null
  } | null
  transcript?: {
    text: string | null
  } | null
}

type ReleaseCard = {
  id: string
  title: string
  subtitle: string
  responseCount: number
  estimatedMinutes: number
  status: SurveyItem["status"]
  publicListeningEnabled: boolean
  topTracks: ListeningTrack[]
}

function buildTrack(response: ResponseItem): ListeningTrack {
  return {
    id: response.id,
    title: response.surveyTitle,
    subtitle: response.insight?.primaryTheme || "Auto-ranked voice take",
    playbackUrl: response.playbackUrl,
    durationSeconds: response.durationSeconds,
    transcript: response.transcript?.text ?? null,
    listening: {
      rank: response.listening?.rank ?? 50,
      hotTake: response.listening?.hotTake ?? "Fresh voice take from this release.",
      momentumTags: response.listening?.momentumTags ?? [],
      previewClipRange: response.listening?.previewClipRange ?? null,
    },
  }
}

export default function AdminDashboardV4Page() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { status, user } = useRequireAdmin()
  const listeningSession = useListeningSession()
  const [surveys, setSurveys] = useState<SurveyItem[]>([])
  const [responses, setResponses] = useState<ResponseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [surveyRes, responseRes] = await Promise.all([
          fetch("/api/surveys", { credentials: "include", cache: "no-store" }),
          fetch("/api/responses?limit=80", { credentials: "include", cache: "no-store" }),
        ])

        if (!surveyRes.ok || !responseRes.ok) {
          throw new Error("Failed to load listening workspace.")
        }

        const surveyJson = (await surveyRes.json()) as { surveys?: SurveyItem[] }
        const responseJson = (await responseRes.json()) as { responses?: ResponseItem[] }

        if (!cancelled) {
          setSurveys(surveyJson.surveys ?? [])
          setResponses(responseJson.responses ?? [])
          setSelectedTrackId(responseJson.responses?.[0]?.id ?? null)
        }
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Failed to load listening workspace.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    trackEvent("response_inbox_opened", { surface: "listen_home" })

    return () => {
      cancelled = true
    }
  }, [status])

  const releaseCards = useMemo<ReleaseCard[]>(() => {
    return surveys.map((survey) => {
      const releaseResponses = responses
        .filter((response) => response.surveyId === survey.id)
        .sort((a, b) => (b.listening?.rank ?? 0) - (a.listening?.rank ?? 0))

      return {
        id: survey.id,
        title: survey.title,
        subtitle:
          releaseResponses[0]?.listening?.hotTake ||
          (survey.publicListeningEnabled
            ? "Public listening is enabled for this release."
            : "Studio release ready for ranked listening."),
        responseCount: releaseResponses.length,
        estimatedMinutes: Math.max(1, Math.round(releaseResponses.reduce((sum, item) => sum + (item.durationSeconds ?? 0), 0) / 60)),
        status: survey.status,
        publicListeningEnabled: Boolean(survey.publicListeningEnabled),
        topTracks: releaseResponses.slice(0, 5).map(buildTrack),
      }
    })
  }, [responses, surveys])

  const allTracks = useMemo(
    () => responses
      .slice()
      .sort((a, b) => (b.listening?.rank ?? 0) - (a.listening?.rank ?? 0))
      .map(buildTrack),
    [responses],
  )

  const featuredTracks = allTracks.slice(0, 5)
  const continueTracks = selectedTrackId
    ? [allTracks.find((track) => track.id === selectedTrackId), ...allTracks.filter((track) => track.id !== selectedTrackId)].filter(Boolean) as ListeningTrack[]
    : allTracks

  if (status === "loading" || loading) {
    return <SurveyLoadingSkeleton label="Loading listening workspace..." />
  }

  if (isMobile) {
    return (
      <>
        <PocketShell
          eyebrow="Listen"
          title={`Welcome back${user?.name ? `, ${user.name}` : ""}.`}
          description="Open the strongest takes first, then drop into Studio when you want to shape the next release."
        >
          {message ? (
            <p className="mb-4 rounded-2xl border border-[#cfbea4] bg-[#fff8f0] px-4 py-3 text-sm text-[#8a3d2b]">{message}</p>
          ) : null}

          <PocketSection
            title="Top 5 takes you should hear first"
            description="Preview mode is on by default so the first 30 seconds feel like momentum, not work."
            className="bg-[#fff6ed]"
          >
            <AudioSequencePlayer
              tracks={featuredTracks}
              title="Now listening"
              description="Hook-first ranking with preview snippets."
              previewByDefault
              compact
              persistSession
              sessionSource="listen-home"
              onSelectTrack={setSelectedTrackId}
            />
          </PocketSection>

          <PocketSection title="Keep the loop moving" description="Listen first. Move into Studio only when you know what to tighten.">
            <PocketActionStack>
              <Button className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]" onClick={() => router.push("/admin/questionnaires/v1")}>
                Open Studio
              </Button>
              <Button variant="outline" className="w-full border-[#dbcdb8] bg-[#fffdf8]" onClick={() => router.push("/admin/responses")}>
                Open release detail
              </Button>
              <Button variant="outline" className="w-full border-[#dbcdb8] bg-[#fffdf8]" onClick={() => router.push("/admin/share")}>
                Share a release
              </Button>
            </PocketActionStack>
          </PocketSection>

          <PocketSection title="Releases" description="Each release is a listening object now, not a dashboard row." className="mt-4">
            <div className="space-y-3">
              {releaseCards.map((release) => (
                <article key={release.id} className="rounded-[1.25rem] border border-[#dbcdb8] bg-[#fffdf8] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--af-color-primary)]">{release.title}</h3>
                      <p className="mt-1 text-sm text-[#5c5146]">{release.responseCount} tracks • {release.estimatedMinutes} min listen</p>
                    </div>
                    <span className="rounded-full bg-[#f3ecdf] px-2 py-1 text-[11px] text-[#7a6146]">{release.status}</span>
                  </div>
                  <p className="mt-3 text-sm text-[#665746]">{release.subtitle}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="border-[#dbcdb8] bg-[#fff6ed]"
                      onClick={() => {
                        const trackId = release.topTracks[0]?.id ?? null
                        setSelectedTrackId(trackId)
                        if (trackId && release.topTracks.length > 0) {
                          void listeningSession.loadQueue(release.topTracks, {
                            selectedTrackId: trackId,
                            autoplay: true,
                            previewMode: true,
                            source: `release:${release.id}`,
                          })
                        }
                      }}
                    >
                      <Headphones className="mr-2 size-4" />
                      Play release
                    </Button>
                    <Button variant="outline" className="border-[#dbcdb8] bg-[#fffdf8]" onClick={() => router.push(`/admin/responses?surveyId=${encodeURIComponent(release.id)}`)}>
                      Release detail
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </PocketSection>
        </PocketShell>
        <AdminMobileNav />
      </>
    )
  }

  return (
    <main className="min-h-dvh bg-[#f3ecdf] p-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">Listen</p>
            <h1 className="mt-2 text-5xl font-semibold text-balance text-[var(--af-color-primary)]">Hear the strongest signal first.</h1>
            <p className="mt-3 max-w-3xl text-base text-[#5c5146]">
              Audioform now opens as a listening workspace. Preview-first playback gets you into the best takes fast, then Studio helps you shape the next release.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/questionnaires/v1">
              <Button className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]">
                <Mic className="mr-2 size-4" />
                Open Studio
              </Button>
            </Link>
            <Link href="/admin/share">
              <Button variant="outline" className="border-[#dbcdb8] bg-[#fffdf8]">
                <Radio className="mr-2 size-4" />
                Share release
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <AudioSequencePlayer
            tracks={continueTracks}
            title="Now listening"
            description="Preview mode is on. The first track should hook in under 10 seconds."
            previewByDefault
            persistSession
            sessionSource="listen-home"
            onSelectTrack={setSelectedTrackId}
          />

          <section className="space-y-4">
            <article className="rounded-[1.75rem] border border-[#dbcdb8] bg-[#fff8f0] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">Why this opens differently</p>
              <ul className="mt-4 space-y-3 text-sm text-[#5c5146]">
                <li className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3">Preview-first playback keeps the first 30 seconds fast and varied.</li>
                <li className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3">Momentum tags surface takes that feel alive, not just technically complete.</li>
                <li className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3">Studio remains where better questions create better future tracks.</li>
              </ul>
            </article>

            <article className="rounded-[1.75rem] border border-[#dbcdb8] bg-[#fff8f0] p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--af-color-primary)]">New signal</h2>
                <span className="text-xs text-[#7a6146]">{responses.length} tracks</span>
              </div>
              <div className="mt-4 space-y-3">
                {featuredTracks.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => {
                      setSelectedTrackId(track.id)
                      void listeningSession.loadQueue(allTracks, {
                        selectedTrackId: track.id,
                        autoplay: true,
                        previewMode: listeningSession.previewMode,
                        source: "listen-home",
                      })
                    }}
                    className="block w-full rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3 text-left hover:bg-[#f7efe4]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--af-color-primary)]">{track.title}</p>
                        <p className="mt-1 text-xs text-[#665746]">{track.listening.hotTake}</p>
                      </div>
                      <ArrowRight className="mt-0.5 size-4 text-[#8a431f]" />
                    </div>
                  </button>
                ))}
              </div>
            </article>
          </section>
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#8a431f]">Releases</p>
              <h2 className="mt-1 text-2xl font-semibold text-[var(--af-color-primary)]">Each survey now behaves like a release.</h2>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {releaseCards.map((release) => (
              <article key={release.id} className="rounded-[1.75rem] border border-[#dbcdb8] bg-[#fff8f0] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--af-color-primary)]">{release.title}</h3>
                    <p className="mt-1 text-sm text-[#5c5146]">{release.responseCount} tracks • {release.estimatedMinutes} min listen</p>
                  </div>
                  <span className="rounded-full bg-[#f3ecdf] px-2 py-1 text-xs text-[#7a6146]">{release.status}</span>
                </div>
                <p className="mt-4 text-sm text-[#665746]">{release.subtitle}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]"
                    onClick={() => {
                      const trackId = release.topTracks[0]?.id ?? null
                      setSelectedTrackId(trackId)
                      if (trackId && release.topTracks.length > 0) {
                        void listeningSession.loadQueue(release.topTracks, {
                          selectedTrackId: trackId,
                          autoplay: true,
                          previewMode: true,
                          source: `release:${release.id}`,
                        })
                      }
                    }}
                  >
                    <Headphones className="mr-2 size-4" />
                    Play release
                  </Button>
                  <Button variant="outline" className="border-[#dbcdb8] bg-[#fffdf8]" onClick={() => router.push(`/admin/responses?surveyId=${encodeURIComponent(release.id)}`)}>
                    Release detail
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {release.publicListeningEnabled ? (
                    <span className="rounded-full bg-[#e8f2e0] px-2 py-1 text-xs text-[#2d5a17]">Public listening on</span>
                  ) : (
                    <span className="rounded-full bg-[#f3ecdf] px-2 py-1 text-xs text-[#7a6146]">Private listening only</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
