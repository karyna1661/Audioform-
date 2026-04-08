"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, BarChart3, Bookmark, Flame, Headphones, LayoutGrid, Mic, Radio, Sparkles } from "lucide-react"
import { useRequireAdmin } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"
import { PocketActionStack, PocketSection, PocketShell } from "@/components/mobile/pocket-shell"
import { useIsMobile } from "@/components/ui/use-mobile"
import { AdminMobileNav } from "@/components/admin-mobile-nav"
import { AudioSequencePlayer, type ListeningTrack } from "@/components/listen/audio-sequence-player"
import { useListeningSession } from "@/components/listen/listening-session-provider"
import { trackEvent } from "@/lib/analytics"
import { ClusterCard, ReleaseCard as MobileReleaseCard, TakeCard } from "@/components/mobile/audioform-mobile-cards"
import { cn } from "@/lib/utils"

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
  timestamp: string
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
    narrativeSummary: string | null
    signalSummary?: {
      complaint?: string | null
      opportunity?: string | null
    } | null
    powerQuote: string | null
    primaryTheme: string | null
    themes: string[]
    signalScore: number | null
    sentiment: "positive" | "neutral" | "negative"
  } | null
  transcript?: {
    text: string | null
  } | null
}

type ReleaseInsight = {
  id: string
  surveyId: string
  narrativeSummary: string | null
  signalSummary: {
    topComplaints: Array<{ label: string; count: number }>
    topOpportunities: Array<{ label: string; reason: string }>
    emergingSignals: string[]
    contrarianInsights: string[]
  } | null
  clusters: Array<{
    label: string
    count: number
    description: string
    representativeResponseIds: string[]
    representativeQuote: string | null
    representativeTakeId: string | null
  }>
  shareArtifacts: {
    topQuotes: string[]
    bestClusterLabel?: string | null
  } | null
} | null

type ListenView = "starter-pack" | "take-deck" | "decision-board"

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
  const [activeView, setActiveView] = useState<ListenView>("starter-pack")
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null)
  const [releaseInsight, setReleaseInsight] = useState<ReleaseInsight>(null)
  const [savedTakeIds, setSavedTakeIds] = useState<Set<string>>(new Set())

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
          setSelectedReleaseId(surveyJson.surveys?.[0]?.id ?? null)
          setSavedTakeIds(new Set((responseJson.responses ?? []).filter((response) => response.bookmarked).map((response) => response.id)))
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

  useEffect(() => {
    if (!selectedReleaseId || status !== "authenticated") return
    let cancelled = false

    const loadReleaseInsight = async () => {
      try {
        const response = await fetch(`/api/responses?surveyId=${encodeURIComponent(selectedReleaseId)}&limit=500`, {
          credentials: "include",
          cache: "no-store",
        })
        if (!response.ok) throw new Error("Failed to load release insight.")
        const json = (await response.json()) as { releaseInsight?: ReleaseInsight }
        if (!cancelled) {
          setReleaseInsight(json.releaseInsight ?? null)
        }
      } catch {
        if (!cancelled) setReleaseInsight(null)
      }
    }

    void loadReleaseInsight()
    return () => {
      cancelled = true
    }
  }, [selectedReleaseId, status])

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
  const selectedRelease = releaseCards.find((release) => release.id === selectedReleaseId) ?? releaseCards[0] ?? null
  const selectedReleaseResponses = useMemo(
    () => responses
      .filter((response) => response.surveyId === selectedRelease?.id)
      .sort((a, b) => (b.listening?.rank ?? 0) - (a.listening?.rank ?? 0)),
    [responses, selectedRelease?.id],
  )

  const mobileTakeCards = useMemo(
    () => selectedReleaseResponses.map((response) => ({
      id: response.id,
      releaseId: response.surveyId,
      releaseTitle: response.surveyTitle,
      playbackUrl: response.playbackUrl,
      durationSeconds: response.durationSeconds ?? null,
      timestampLabel: new Date(response.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      transcript: response.transcript?.text ?? null,
      rank: response.listening?.rank ?? null,
      saved: savedTakeIds.has(response.id),
      flagged: response.flagged,
      previewStart: response.listening?.previewClipRange?.startSeconds ?? null,
      previewEnd: response.listening?.previewClipRange?.endSeconds ?? null,
      insight: {
        narrativeSummary: response.insight?.narrativeSummary ?? null,
        complaint: response.insight?.signalSummary?.complaint ?? null,
        opportunity: response.insight?.signalSummary?.opportunity ?? null,
        powerQuote: response.insight?.powerQuote ?? response.listening?.hotTake ?? null,
        primaryTheme: response.insight?.primaryTheme ?? null,
        themes: response.insight?.themes ?? [],
        signalScore: response.insight?.signalScore ?? null,
        sentiment: response.insight?.sentiment ?? "neutral",
      },
    })),
    [savedTakeIds, selectedReleaseResponses],
  )

  const toggleSavedTake = (id: string) => {
    setSavedTakeIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (status === "loading" || loading) {
    return <SurveyLoadingSkeleton label="Loading listening workspace..." />
  }

  if (isMobile) {
    return (
      <>
        <PocketShell
          eyebrow="Listen"
          title={`Welcome back${user?.name ? `, ${user.name}` : ""}.`}
          description="Hear what matters first. Save the strongest takes, then move deeper only when a release earns it."
        >
          {message ? (
            <p className="mb-3 rounded-[1rem] border border-[#cfbea4]/55 bg-[#fff8f0] px-3 py-2.5 text-[12px] text-[#8a3d2b]">{message}</p>
          ) : null}

          <div className="mb-2.5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a431f]">Listen</p>
              <p className="mt-1 text-[12px] text-[#665746]">Hear what matters first</p>
            </div>
            <button type="button" className="inline-flex items-center gap-1 rounded-[0.8rem] bg-[#f2ddcd] px-2.5 py-1.5 text-[11px] font-semibold text-[#8a431f]">
              <Bookmark className="size-3.5" />
              {savedTakeIds.size}
            </button>
          </div>

          <div className="mb-2.5 grid grid-cols-3 gap-1.5 rounded-[1rem] bg-[#f3ecdf] p-1">
            {[
              { key: "starter-pack" as const, icon: Flame, label: "Starter Pack" },
              { key: "take-deck" as const, icon: LayoutGrid, label: "Take Deck" },
              { key: "decision-board" as const, icon: BarChart3, label: "Insights" },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveView(key)}
                className={cn(
                  "flex min-h-9 flex-col items-center justify-center gap-1 rounded-[0.85rem] px-2 py-2 text-[10px] font-medium leading-none",
                  activeView === key ? "bg-[#f2ddcd] text-[#8a431f]" : "text-[#7a6146]",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>

          {activeView === "starter-pack" ? (
            <>
              <PocketSection className="bg-[#fff6ed]" title="Strongest takes" description="Ranked by signal strength across your active releases.">
                <AudioSequencePlayer
                  tracks={featuredTracks}
                  title="Starter pack"
                  description="Hook-first playback with preview snippets."
                  previewByDefault
                  compact
                  persistSession
                  sessionSource="listen-home"
                  onSelectTrack={setSelectedTrackId}
                />
              </PocketSection>
              <div className="mt-2.5 space-y-2">
                {featuredTracks.map((track) => {
                  const response = responses.find((item) => item.id === track.id)
                  if (!response) return null
                  const take = mobileTakeCards.find((item) => item.id === track.id)
                  if (!take) return null
                  return (
                    <TakeCard
                      key={take.id}
                      take={take}
                      source="listen-home"
                      onSave={toggleSavedTake}
                      onFlag={() => router.push(`/admin/responses?responseId=${encodeURIComponent(response.id)}`)}
                    />
                  )
                })}
              </div>
            </>
          ) : null}

          {activeView === "take-deck" ? (
            <>
              <PocketSection className="bg-[#fff6ed]" title="Release deck" description="Pick a release, then inspect the takes that deserve closer listening.">
                <div className="-mx-1 overflow-x-auto pb-1">
                  <div className="flex gap-2 px-1">
                    {releaseCards.map((release) => (
                      <MobileReleaseCard
                        key={release.id}
                        release={{
                          id: release.id,
                          title: release.title,
                          description: release.subtitle,
                          publicListening: release.publicListeningEnabled,
                          takeCount: release.responseCount,
                        }}
                        onPress={() => setSelectedReleaseId(release.id)}
                      />
                    ))}
                  </div>
                </div>
              </PocketSection>
              {selectedRelease ? (
                <PocketSection className="mt-2.5" title={selectedRelease.title} description={`${selectedRelease.responseCount} takes · ${selectedRelease.estimatedMinutes} min listen`}>
                  <div className="mb-2.5 flex flex-wrap gap-1.5">
                    <Button
                      variant="outline"
                      className="min-h-8 border-[#dbcdb8]/55 bg-[#fff6ed] px-3 text-[11px]"
                      onClick={() => {
                        const trackId = selectedRelease.topTracks[0]?.id ?? null
                        setSelectedTrackId(trackId)
                        if (trackId && selectedRelease.topTracks.length > 0) {
                          void listeningSession.loadQueue(selectedRelease.topTracks, {
                            selectedTrackId: trackId,
                            autoplay: true,
                            previewMode: true,
                            source: `release:${selectedRelease.id}`,
                          })
                        }
                      }}
                    >
                      <Headphones className="mr-2 size-3.5" />
                      Play release
                    </Button>
                    <Button variant="outline" className="min-h-8 border-[#dbcdb8]/55 bg-[#fffdf8] px-3 text-[11px]" onClick={() => router.push(`/admin/responses?surveyId=${encodeURIComponent(selectedRelease.id)}`)}>
                      Open release detail
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {mobileTakeCards.map((take) => (
                      <TakeCard key={take.id} take={take} source={`release:${selectedRelease.id}`} onSave={toggleSavedTake} onFlag={() => router.push(`/admin/responses?responseId=${encodeURIComponent(take.id)}`)} />
                    ))}
                  </div>
                </PocketSection>
              ) : null}
            </>
          ) : null}

          {activeView === "decision-board" ? (
            <>
              <PocketSection className="bg-[#fff6ed]" title={selectedRelease?.title || "Release insights"} description="Clustered intelligence for the release you are reviewing now.">
                <div className="rounded-[1rem] border border-[#dbcdb8]/45 bg-[#fffdf8] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a6146]">Narrative summary</p>
                  <p className="mt-2 text-[13px] leading-6 text-[#5c5146]">
                    {releaseInsight?.narrativeSummary || "Open a release with enriched takes to generate a stronger release narrative."}
                  </p>
                </div>
                <div className="mt-2.5 grid gap-1.5">
                  <div className="rounded-[0.95rem] border border-[#dbcdb8]/45 bg-[#fffdf8] px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#7a6146]">Top complaint</p>
                    <p className="mt-1 text-[12px] font-medium leading-5 text-[var(--af-color-primary)]">{releaseInsight?.signalSummary?.topComplaints?.[0]?.label || "Waiting for stronger complaint clustering"}</p>
                  </div>
                  <div className="rounded-[0.95rem] border border-[#dbcdb8]/45 bg-[#fffdf8] px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#7a6146]">Lead opportunity</p>
                    <p className="mt-1 text-[12px] font-medium leading-5 text-[var(--af-color-primary)]">{releaseInsight?.signalSummary?.topOpportunities?.[0]?.label || "Waiting for opportunity inference"}</p>
                  </div>
                </div>
              </PocketSection>
              <div className="mt-2.5 space-y-2">
                {releaseInsight?.clusters?.map((cluster, index) => (
                  <ClusterCard
                    key={`${cluster.label}-${index}`}
                    rank={index + 1}
                    cluster={{
                      id: `${selectedRelease?.id ?? "release"}-${index}`,
                      label: cluster.label,
                      count: cluster.count,
                      description: cluster.description,
                      representativeQuote: cluster.representativeQuote,
                    }}
                  />
                ))}
              </div>
              <PocketSection className="mt-2.5" title="Release actions" description="Move from synthesis back into listening or sharing.">
                <PocketActionStack>
                  <Button className="min-h-9 w-full bg-[#b85e2d] px-3 text-[12px] text-[#fff6ed] hover:bg-[#a05227]" onClick={() => router.push(`/admin/responses?surveyId=${encodeURIComponent(selectedRelease?.id ?? "")}`)}>
                    Open release detail
                  </Button>
                  <Button variant="outline" className="min-h-9 w-full border-[#dbcdb8]/55 bg-[#fffdf8] px-3 text-[12px]" onClick={() => router.push("/admin/share")}>Share a release</Button>
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
