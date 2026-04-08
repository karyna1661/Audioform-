"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowRight, AudioWaveform, CheckCircle2, Headphones, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PocketActionStack, PocketSection, PocketShell } from "@/components/mobile/pocket-shell"
import { AudioSequencePlayer, type ListeningTrack } from "@/components/listen/audio-sequence-player"
import { trackEvent } from "@/lib/analytics"
import { useMobile } from "@/hooks/use-mobile"
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

export default function ThankYouPage() {
  const searchParams = useSearchParams()
  const surveyId = searchParams.get("surveyId")
  const responseId = searchParams.get("responseId")
  const arrivalSource = normalizeArrivalSource(searchParams.get("src"))
  const isMobile = useMobile()
  const [playlist, setPlaylist] = useState<PublicPlaylistResponse | null>(null)

  useEffect(() => {
    trackEvent("respondent_thank_you_viewed")
  }, [])

  useEffect(() => {
    if (!surveyId) return
    let cancelled = false

    const loadPlaylist = async () => {
      try {
        const params = new URLSearchParams()
        if (responseId) params.set("responseId", responseId)
        const response = await fetch(
          `/api/surveys/public/${encodeURIComponent(surveyId)}/playlist${params.toString() ? `?${params.toString()}` : ""}`,
          { cache: "no-store" },
        )
        if (!response.ok) return
        const payload = (await response.json()) as PublicPlaylistResponse
        if (!cancelled) setPlaylist(payload)
      } catch {
        // Non-blocking.
      }
    }

    void loadPlaylist()
    return () => {
      cancelled = true
    }
  }, [responseId, surveyId])

  const canListen = Boolean(playlist?.playlistEnabled && playlist.surveyOpen && (playlist.tracks?.length ?? 0) > 0)
  const publicButEmpty = Boolean(playlist?.playlistEnabled && playlist.surveyOpen && (playlist.tracks?.length ?? 0) === 0)
  const isSocialEntry = arrivalSource === "social"
  const isQrEntry = arrivalSource === "qr"
  const mobileDescription = canListen
    ? isSocialEntry
      ? "You unlocked the listening room from the link you followed. Start with the strongest takes."
      : "You unlocked the strongest takes from this survey. Start with the fastest previews."
    : publicButEmpty
      ? isSocialEntry
        ? "Your voice is in. The listening room is live and will open up as more people respond."
        : "Your voice is in. The listening room is live and will fill as more people scan in and respond."
      : "Thanks for contributing your take."
  const privateMomentumTitle = isSocialEntry ? "Creator review is next" : "Your take is with the creator"
  const privateMomentumBody = isSocialEntry
    ? "The creator can now review your voice take privately, even without a public listening room."
    : "The creator can still review your response privately even if public listening is unavailable."
  const publicMomentumTitle = isSocialEntry ? "Conversation unlocked" : "Listening room unlocked"
  const publicMomentumBody = canListen
    ? isSocialEntry
      ? `You are now hearing ${playlist?.tracks.length ?? 0} public voice takes from the same conversation.`
      : `You are in a live listening room with ${playlist?.tracks.length ?? 0} public voice takes.`
    : isSocialEntry
      ? "The listening room is live, but it needs a few more public takes before playback opens."
      : "The listening room is live, but it needs a few more public takes before playback opens."

  if (isMobile) {
    return (
      <PocketShell
        eyebrow="Contribution received"
        title="Your voice is now part of this conversation."
        description={mobileDescription}
      >
        <div className="mb-5 grid grid-cols-3 gap-2">
          <div className="rounded-[1.15rem] border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a6146]">Status</p>
            <p className="mt-1 text-base font-semibold text-[var(--af-color-primary)]">In</p>
            <p className="mt-1 text-[11px] leading-4 text-[#665746]">take received</p>
          </div>
          <div className="rounded-[1.15rem] border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a6146]">Room</p>
            <p className="mt-1 text-base font-semibold text-[var(--af-color-primary)]">{canListen ? "Live" : publicButEmpty ? "Warming" : "Private"}</p>
            <p className="mt-1 text-[11px] leading-4 text-[#665746]">next state</p>
          </div>
          <div className="rounded-[1.15rem] border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a6146]">Source</p>
            <p className="mt-1 text-base font-semibold text-[var(--af-color-primary)]">{isSocialEntry ? "Social" : isQrEntry ? "QR" : "Direct"}</p>
            <p className="mt-1 text-[11px] leading-4 text-[#665746]">entry path</p>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex size-20 items-center justify-center rounded-full border border-[#d5c7b3] bg-[#fff6ed]">
            <CheckCircle2 className="size-10 text-[#2d5a17]" aria-hidden="true" />
          </div>
        </div>

        <PocketSection
          title={canListen || publicButEmpty ? publicMomentumTitle : privateMomentumTitle}
          description={
            canListen
              ? "You are now hearing the clips that hook fastest, not a long list of raw recordings."
              : publicButEmpty
                ? "Your contribution is in. The room opens as more public takes arrive."
                : "Your contribution is in and ready for creator review."
          }
          className="mt-5 bg-[#fff6ed]"
        >
          <div className="inline-flex size-10 items-center justify-center rounded-full border border-[#dbcdb8] bg-[#f3ecdf]">
            <Sparkles className="size-4 text-[#8a431f]" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm text-[#5c5146]">
            {canListen || publicButEmpty ? publicMomentumBody : privateMomentumBody}
          </p>
          {playlist?.contribution ? (
            <p className="mt-3 rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3 text-sm text-[#5c5146]">
              Your take opened in the top {playlist.contribution.percentile}% of this conversation and is currently #{playlist.contribution.position} in the public sequence.
            </p>
          ) : null}
        </PocketSection>

        <div className="af-mobile-rail mt-5">
          {[
            canListen
              ? "The listening room opens in preview mode so you hear the strongest clips first."
              : publicButEmpty
                ? "The room is live but waiting for enough public takes to make playback worth opening."
                : "This release stays private after submission, so the creator reviews the take directly.",
            "Audioform keeps verbatim voice and AI interpretation separate so shared signal stays trustworthy.",
          ].map((line) => (
            <div key={line} className="af-mobile-rail-card rounded-[1.1rem] border border-[#dbcdb8] bg-[#fffdf8] p-3.5 text-sm leading-6 text-[#5c5146]">
              {line}
            </div>
          ))}
        </div>

        {canListen ? (
          <>
            <PocketSection
              title="Player mode is live"
              description="The listening loop is now open for you."
              className="mt-5"
            >
              <div className="grid gap-2">
                <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3">
                  <div className="flex items-center gap-2 text-[#8a431f]">
                    <Headphones className="size-4" />
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">Listen first</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#5c5146]">Preview mode starts with the strongest takes instead of a long list of raw responses.</p>
                </div>
                <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3">
                  <div className="flex items-center gap-2 text-[#8a431f]">
                    <AudioWaveform className="size-4" />
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">Conversation unlocked</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#5c5146]">You can now hear how other responders approached the same topic and where your own take lands.</p>
                </div>
              </div>
            </PocketSection>

            <PocketActionStack className="mt-5">
              <Link href={`/questionnaire/listen?surveyId=${encodeURIComponent(surveyId ?? "")}${responseId ? `&responseId=${encodeURIComponent(responseId)}` : ""}${arrivalSource !== "direct" ? `&src=${arrivalSource}` : ""}`}>
                <Button className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]">
                  Start listening
                  <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                </Button>
              </Link>
            </PocketActionStack>

            <div className="mt-5">
              <AudioSequencePlayer
                tracks={playlist?.tracks ?? []}
                title="Unlocked playlist"
                description="Best clips first, preview mode on."
                previewByDefault
                compact
              />
            </div>
          </>
        ) : publicButEmpty ? (
          <PocketSection
            title="Listening room warming up"
            description="Public listening is on for this release, but playback opens once more voices arrive."
            className="mt-5"
          >
            <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3">
              <p className="text-sm leading-6 text-[#5c5146]">
                {isSocialEntry
                  ? "You joined from a shared link, and your take is already helping start the conversation."
                  : "You scanned into the release, and your take is already helping start the listening room."}
              </p>
            </div>
          </PocketSection>
        ) : null}

        <PocketActionStack className="mt-5">
          <Link href="/signup">
            <Button className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]">
              Open your own Studio
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Button>
          </Link>
        </PocketActionStack>
      </PocketShell>
    )
  }

  return (
    <main className="min-h-dvh bg-[linear-gradient(135deg,#f4ecdf_0%,#efe2cb_100%)] p-4 sm:p-6">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-[#dbcdb8] bg-[#f9f4ea] p-6">
        <div className="text-center">
          <CheckCircle2 className="mx-auto size-16 text-[#2d5a17]" aria-hidden="true" />
          <p className="mt-3 text-sm text-[#5c5146]">Contribution received</p>
          <h1 className="mt-2 text-4xl font-semibold text-balance">Your voice is now part of this conversation.</h1>
          <p className="mx-auto mt-3 max-w-2xl text-[#5c5146]">
            {canListen
              ? isSocialEntry
                ? "You arrived through a shared release link and just unlocked the listening room. Start with preview mode and hear the clips that hook first."
                : "You unlocked the strongest public takes from this survey. Start with preview mode and hear the clips that hook first."
              : publicButEmpty
                ? "Your voice is in. Public listening is enabled for this release, and the room will open as more takes arrive."
                : isQrEntry
                  ? "Thanks for contributing. The creator can review your full take privately from here."
                  : "Thanks for contributing. Your voice take is now with the creator for private review."}
          </p>
          {playlist?.contribution ? (
            <p className="mx-auto mt-4 max-w-xl rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] px-4 py-3 text-sm text-[#5c5146]">
              Your take is currently sitting in the top {playlist.contribution.percentile}% of the live playlist.
            </p>
          ) : null}
        </div>

        {canListen ? (
          <>
            <section className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[#dbcdb8] bg-[#fff6ed] p-5">
                <div className="flex items-center gap-2 text-[#8a431f]">
                  <Headphones className="size-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]">Player mode</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#5c5146]">
                  You just unlocked the listening loop. Preview mode starts with the strongest clips instead of a long list of raw responses.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[#dbcdb8] bg-[#fff6ed] p-5">
                <div className="flex items-center gap-2 text-[#8a431f]">
                  <AudioWaveform className="size-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]">Conversation view</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#5c5146]">
                  Hear how other responders approached the same prompt and where your own take sits inside the sequence.
                </p>
              </div>
            </section>

            <div className="mt-8">
              <AudioSequencePlayer
                tracks={playlist?.tracks ?? []}
                title="Unlocked playlist"
                description="Preview-first listening, strongest clips first."
                previewByDefault
              />
            </div>
          </>
        ) : publicButEmpty ? (
          <section className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[#dbcdb8] bg-[#fff6ed] p-5">
              <div className="flex items-center gap-2 text-[#8a431f]">
                <Headphones className="size-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                  {isSocialEntry ? "Conversation is opening" : "Listening room is opening"}
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#5c5146]">
                Public listening is enabled for this release, but the player opens once a few more public takes are available.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[#dbcdb8] bg-[#fff6ed] p-5">
              <div className="flex items-center gap-2 text-[#8a431f]">
                <AudioWaveform className="size-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Your take is in</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#5c5146]">
                {isSocialEntry
                  ? "You joined from a shared release link, and your voice is already part of what the next responder will add to."
                  : "You scanned into the release, and your voice is already part of the room the creator is building."}
              </p>
            </div>
          </section>
        ) : (
          <section className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[#dbcdb8] bg-[#fff6ed] p-5">
              <div className="flex items-center gap-2 text-[#8a431f]">
                <Sparkles className="size-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                  {isSocialEntry ? "Creator review is next" : "Your take is with the creator"}
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#5c5146]">
                {privateMomentumBody}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[#dbcdb8] bg-[#fff6ed] p-5">
              <div className="flex items-center gap-2 text-[#8a431f]">
                <AudioWaveform className="size-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Private by design</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#5c5146]">
                {isSocialEntry
                  ? "This release is collecting private voice signal, so your contribution goes straight to the creator instead of into a public player."
                  : "This release is private, so your response goes straight to creator review instead of into a public listening room."}
              </p>
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup">
            <Button className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]">
              Open your own Studio
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
  )
}
