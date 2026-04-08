"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Ear, Headphones, Quote, Users } from "lucide-react"
import { AudioSequencePlayer, type ListeningTrack } from "@/components/listen/audio-sequence-player"
import { Button } from "@/components/ui/button"
import { MobilePage, MobileSection } from "@/components/mobile/pocket-shell"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"
import { normalizeArrivalSource } from "@/lib/share-links"

type PublicPlaylistResponse = {
  surveyOpen: boolean
  playlistEnabled: boolean
  tracks: ListeningTrack[]
  contribution?: {
    position: number
    percentile: number
  } | null
}

export default function QuestionnaireListenPage() {
  const searchParams = useSearchParams()
  const surveyId = searchParams.get("surveyId")
  const responseId = searchParams.get("responseId")
  const arrivalSource = normalizeArrivalSource(searchParams.get("src"))
  const [playlist, setPlaylist] = useState<PublicPlaylistResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!surveyId) {
      setLoading(false)
      return
    }

    let cancelled = false
    const loadPlaylist = async () => {
      try {
        const params = new URLSearchParams()
        if (responseId) params.set("responseId", responseId)
        const response = await fetch(`/api/surveys/public/${encodeURIComponent(surveyId)}/playlist${params.toString() ? `?${params.toString()}` : ""}`, {
          cache: "no-store",
        })
        if (!response.ok) throw new Error("Failed to load listening room.")
        const payload = (await response.json()) as PublicPlaylistResponse
        if (!cancelled) setPlaylist(payload)
      } catch {
        if (!cancelled) setPlaylist(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadPlaylist()
    return () => {
      cancelled = true
    }
  }, [responseId, surveyId])

  const sourceLabel = useMemo(() => {
    if (arrivalSource === "qr") return "The room"
    if (arrivalSource === "social") return "The conversation"
    return "Responses"
  }, [arrivalSource])

  if (loading) {
    return <SurveyLoadingSkeleton label="Loading listening room..." />
  }

  if (!surveyId || !playlist?.playlistEnabled || !playlist.surveyOpen || !playlist.tracks?.length) {
    return (
      <MobilePage title="Listening room" description="The room is still filling, or this release is not open for public listening.">
        <MobileSection title="No playable takes yet" description="Come back once more voices have landed in the public playlist.">
          <div className="rounded-[1rem] border border-[#dbcdb8]/55 bg-[#fffdf8] p-4 text-[12px] leading-5 text-[#665746]">
            Public listening only opens when the release is live and there are eligible takes ready for playback.
          </div>
          <div className="mt-3">
            <Link href={surveyId ? `/questionnaire/thank-you?surveyId=${encodeURIComponent(surveyId)}` : "/"}>
              <Button variant="outline" className="w-full border-[#dbcdb8] bg-[#fffdf8]">Back</Button>
            </Link>
          </div>
        </MobileSection>
      </MobilePage>
    )
  }

  const leadTrack = playlist.tracks[0]

  return (
    <MobilePage
      eyebrow="Listening room"
      title={sourceLabel}
      description="Best clips first, preview mode on. Hear how other people responded to the same release."
      action={
        <Link href={`/questionnaire/thank-you?surveyId=${encodeURIComponent(surveyId)}${responseId ? `&responseId=${encodeURIComponent(responseId)}` : ""}${arrivalSource !== "direct" ? `&src=${arrivalSource}` : ""}`}>
          <Button variant="outline" className="min-h-9 border-[#dbcdb8]/55 bg-[#fffdf8] px-3 text-[11px]">
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Button>
        </Link>
      }
    >
      <MobileSection title="Now playing" description="Preview-first playback keeps the room feeling alive instead of list-heavy.">
        <div className="rounded-[1rem] border border-[#dbcdb8]/55 bg-[#fffdf8] p-4">
          <div className="inline-flex rounded-full bg-[#f2ddcd] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a431f]">
            Take 1 of {playlist.tracks.length}
          </div>
          <div className="mt-3 flex items-start gap-3">
            <div className="inline-flex size-11 items-center justify-center rounded-full bg-[#f3ecdf] text-[#8a431f]">
              <Ear className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-6 text-[var(--af-color-primary)]">{leadTrack?.listening.hotTake || "Strongest take ready."}</p>
              <p className="mt-1 text-[12px] leading-5 text-[#665746]">{leadTrack?.subtitle || "Preview-first listening room"}</p>
            </div>
          </div>
        </div>
      </MobileSection>

      <MobileSection title="Player" description="The room keeps strongest takes near the front so you can hear the shape of opinion quickly.">
        <AudioSequencePlayer
          tracks={playlist.tracks}
          title="Unlocked playlist"
          description="Strongest takes first."
          previewByDefault
          compact
          persistSession
          sessionSource={`respondent-room:${surveyId}`}
        />
      </MobileSection>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[1rem] border border-[#dbcdb8]/55 bg-[#fffdf8] p-4">
          <div className="inline-flex size-9 items-center justify-center rounded-[0.8rem] bg-[#f2ddcd] text-[#8a431f]">
            <Users className="size-4" />
          </div>
          <p className="mt-3 text-[18px] font-semibold text-[var(--af-color-primary)]">{playlist.tracks.length}</p>
          <p className="mt-1 text-[11px] leading-4 text-[#665746]">public takes</p>
        </div>
        <div className="rounded-[1rem] border border-[#dbcdb8]/55 bg-[#fffdf8] p-4">
          <div className="inline-flex size-9 items-center justify-center rounded-[0.8rem] bg-[#f3ecdf] text-[#7a6146]">
            <Headphones className="size-4" />
          </div>
          <p className="mt-3 text-[18px] font-semibold text-[var(--af-color-primary)]">{playlist.contribution?.percentile ?? "--"}%</p>
          <p className="mt-1 text-[11px] leading-4 text-[#665746]">your take rank</p>
        </div>
      </div>

      {leadTrack?.transcript ? (
        <MobileSection title="Power quote" description="One strong line can carry the room's shape faster than a full transcript.">
          <div className="rounded-[1rem] border border-[#dbcdb8]/55 bg-[#fff8f0] p-4">
            <Quote className="size-4 text-[#8a431f]" />
            <p className="mt-2 text-[14px] italic leading-6 text-[var(--af-color-primary)]">"{leadTrack.transcript.slice(0, 180)}{leadTrack.transcript.length > 180 ? "..." : ""}"</p>
          </div>
        </MobileSection>
      ) : null}
    </MobilePage>
  )
}
