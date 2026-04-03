import { NextRequest, NextResponse } from "next/server"
import { listStoredResponses } from "@/lib/server/response-store"
import { getPublishedSurveyById } from "@/lib/server/survey-store"
import { listTranscriptsByResponseIds } from "@/lib/server/transcript-store"
import { listInsightsByTranscriptIds } from "@/lib/server/insight-store"
import { buildPreviewClipRange, computeListeningRank, deriveHotTake, deriveMomentumTags } from "@/lib/listening-model"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const responseId = request.nextUrl.searchParams.get("responseId")
    const survey = await getPublishedSurveyById(id)
    if (!survey) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404 })
    }
    if (!survey.publicListeningEnabled) {
      return NextResponse.json({ surveyOpen: true, playlistEnabled: survey.publicListeningEnabled, tracks: [], contribution: null })
    }

    const responses = (await listStoredResponses({ surveyId: id, limit: 50 }))
      .filter((item) => item.publicPlaylistEligible)

    const transcripts = await listTranscriptsByResponseIds(responses.map((item) => item.id))
    const transcriptByResponseId = new Map(transcripts.filter((item) => item.responseId).map((item) => [item.responseId as string, item]))
    const insights = await listInsightsByTranscriptIds(transcripts.map((item) => item.id))
    const insightByTranscriptId = new Map(insights.map((item) => [item.transcriptId, item]))

    const tracks = responses
      .map((item, index) => {
        const transcript = transcriptByResponseId.get(item.id) ?? null
        const insight = transcript ? insightByTranscriptId.get(transcript.id) ?? null : null
        const listeningRank = item.listeningRank ?? computeListeningRank({
          durationSeconds: item.durationSeconds,
          transcriptText: transcript?.transcriptText ?? null,
          transcriptStatus: transcript?.status ?? null,
          summary: insight?.summary ?? null,
          primaryTheme: insight?.primaryTheme ?? null,
          themes: insight?.themes ?? [],
          signalScore: insight?.signalScore ?? null,
          sentimentScore: insight?.sentimentScore ?? null,
          highSignal: item.highSignal,
          bookmarked: item.bookmarked,
          flagged: item.flagged,
        })

        return {
          id: item.id,
          title: `Voice take ${index + 1}`,
          anonymousLabel: "Anonymous voice",
          durationSeconds: item.durationSeconds,
          playbackUrl: `/api/responses/${item.id}/audio`,
          listening: {
            rank: listeningRank,
            previewClipRange:
              item.previewStartSeconds != null && item.previewEndSeconds != null
                ? { startSeconds: item.previewStartSeconds, endSeconds: item.previewEndSeconds }
                : buildPreviewClipRange(item.durationSeconds),
            hotTake:
              item.hotTake ||
              deriveHotTake({
                durationSeconds: item.durationSeconds,
                summary: insight?.summary ?? null,
                primaryTheme: insight?.primaryTheme ?? null,
                highSignal: item.highSignal,
                bookmarked: item.bookmarked,
              }),
            momentumTags:
              item.momentumTags.length > 0
                ? item.momentumTags
                : deriveMomentumTags({
                    durationSeconds: item.durationSeconds,
                    themes: insight?.themes ?? [],
                    signalScore: insight?.signalScore ?? null,
                    sentimentScore: insight?.sentimentScore ?? null,
                    highSignal: item.highSignal,
                    bookmarked: item.bookmarked,
                  }),
          },
          transcript: transcript?.transcriptText ?? null,
        }
      })
      .sort((a, b) => b.listening.rank - a.listening.rank)

    const contributionIndex = responseId ? tracks.findIndex((item) => item.id === responseId) : -1
    const contribution =
      contributionIndex >= 0
        ? {
            position: contributionIndex + 1,
            percentile: Math.max(1, Math.round(((tracks.length - contributionIndex) / Math.max(tracks.length, 1)) * 100)),
          }
        : null

    return NextResponse.json({
      surveyOpen: true,
      playlistEnabled: survey.publicListeningEnabled,
      tracks,
      contribution,
    })
  } catch {
    return NextResponse.json({ error: "Failed to load public playlist." }, { status: 500 })
  }
}
