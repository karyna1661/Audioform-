import { listInsightsByTranscriptIds } from "@/lib/server/insight-store"
import type {
  ReleaseInsightCluster,
  ReleaseOpportunitySummary,
  ReleaseSignalSummary,
  StoredInsight,
  StoredReleaseInsight,
} from "@/lib/server/insight-types"
import { upsertReleaseInsight } from "@/lib/server/release-insight-store"
import { listStoredResponses } from "@/lib/server/response-store"
import { getSurveyById } from "@/lib/server/survey-store"
import { listTranscriptsByResponseIds } from "@/lib/server/transcript-store"

type ReleaseAggregationItem = {
  responseId: string
  signalScore: number
  sentiment: string | null
  narrativeSummary: string | null
  powerQuote: string | null
  primaryTheme: string | null
  themes: string[]
  complaint: string | null
  opportunity: string | null
  emotion: string | null
  frictionMoment: string | null
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
}

function titleCase(label: string): string {
  return label
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function normalizeClusterKey(value: string | null | undefined): string | null {
  const compact = normalizeWhitespace(value ?? "").toLowerCase()
  if (!compact) return null
  return compact
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an|this|that|these|those|it|they|their)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function compactLabel(value: string | null | undefined): string | null {
  const normalized = normalizeClusterKey(value)
  if (!normalized) return null
  return titleCase(normalized.split(" ").slice(0, 4).join(" "))
}

function buildHeuristicNarrativeSummary(surveyTitle: string, items: ReleaseAggregationItem[], signalSummary: ReleaseSignalSummary): string {
  const topComplaint = signalSummary.topComplaints[0]?.label
  const secondComplaint = signalSummary.topComplaints[1]?.label
  const topOpportunity = signalSummary.topOpportunities[0]?.label
  const contrarian = signalSummary.contrarianInsights[0]
  const parts: string[] = []

  if (topComplaint && secondComplaint) {
    parts.push(`Across this release, the strongest friction clusters around ${topComplaint.toLowerCase()} and ${secondComplaint.toLowerCase()}.`)
  } else if (topComplaint) {
    parts.push(`Across this release, the clearest repeated complaint centers on ${topComplaint.toLowerCase()}.`)
  } else {
    parts.push(`Across this release, creators are hearing a mix of emerging voice takes rather than one single dominant complaint.`)
  }

  if (topOpportunity) {
    parts.push(`The strongest opportunity points toward ${topOpportunity.toLowerCase()}.`)
  }

  if (signalSummary.emergingSignals.length) {
    parts.push(`A smaller but promising signal is ${signalSummary.emergingSignals[0].toLowerCase()}.`)
  }

  if (contrarian) {
    parts.push(`There is also a contrarian thread: ${contrarian.toLowerCase()}.`)
  }

  if (!parts.length) {
    parts.push(`This release is still filling in, but early takes from ${surveyTitle} are ready for review.`)
  }

  return truncate(parts.join(" "), 420)
}

function pickRepresentativeQuote(insights: ReleaseAggregationItem[]): string | null {
  return insights
    .map((item) => item.powerQuote)
    .find((quote): quote is string => Boolean(quote?.trim())) ?? null
}

function buildClusterDescription(label: string, items: ReleaseAggregationItem[]): string {
  const topOpportunity = items.find((item) => item.opportunity)?.opportunity
  const frictionMoment = items.find((item) => item.frictionMoment)?.frictionMoment
  if (topOpportunity && frictionMoment) {
    return truncate(`${label} shows up most clearly around ${frictionMoment.toLowerCase()}, and the strongest fix points toward ${topOpportunity.toLowerCase()}.`, 220)
  }
  if (topOpportunity) {
    return truncate(`${label} is recurring, and the best next move appears to be ${topOpportunity.toLowerCase()}.`, 220)
  }
  if (frictionMoment) {
    return truncate(`${label} keeps showing up around ${frictionMoment.toLowerCase()}.`, 220)
  }
  return truncate(`${label} is showing up repeatedly across the release and deserves direct listening.`, 220)
}

function buildReleaseSignalSummary(items: ReleaseAggregationItem[]): {
  signalSummary: ReleaseSignalSummary
  clusters: ReleaseInsightCluster[]
} {
  const complaintMap = new Map<string, ReleaseAggregationItem[]>()
  const opportunityMap = new Map<string, ReleaseAggregationItem[]>()
  const themeMap = new Map<string, ReleaseAggregationItem[]>()
  const contrarianInsights = new Set<string>()

  for (const item of items) {
    const complaintKey = normalizeClusterKey(item.complaint) || normalizeClusterKey(item.primaryTheme)
    if (complaintKey) {
      complaintMap.set(complaintKey, [...(complaintMap.get(complaintKey) ?? []), item])
    }

    const opportunityKey = normalizeClusterKey(item.opportunity)
    if (opportunityKey) {
      opportunityMap.set(opportunityKey, [...(opportunityMap.get(opportunityKey) ?? []), item])
    }

    for (const theme of item.themes) {
      const themeKey = normalizeClusterKey(theme)
      if (!themeKey) continue
      themeMap.set(themeKey, [...(themeMap.get(themeKey) ?? []), item])
    }

    if (item.sentiment === "positive" && item.complaint) {
      contrarianInsights.add(`A minority of responders still frame ${item.complaint.toLowerCase()} as working better than expected.`)
    }
    if (item.sentiment === "negative" && item.opportunity) {
      contrarianInsights.add(`Not every responder agrees on the fix; some still see risk in ${item.opportunity.toLowerCase()}.`)
    }
  }

  const sortedComplaints = Array.from(complaintMap.entries())
    .sort((a, b) => b[1].length - a[1].length || (b[1][0]?.signalScore ?? 0) - (a[1][0]?.signalScore ?? 0))
    .map(([key, grouped]) => ({
      label: compactLabel(key) ?? titleCase(key),
      count: grouped.length,
      items: grouped,
    }))

  const sortedOpportunities: Array<ReleaseOpportunitySummary & { count: number }> = Array.from(opportunityMap.entries())
    .sort((a, b) => b[1].length - a[1].length || (b[1][0]?.signalScore ?? 0) - (a[1][0]?.signalScore ?? 0))
    .map(([key, grouped]) => ({
      label: compactLabel(key) ?? titleCase(key),
      reason: truncate(grouped[0]?.narrativeSummary || grouped[0]?.frictionMoment || "Responders keep pointing back to this change as the clearest fix.", 180),
      count: grouped.length,
    }))

  const emergingSignals = Array.from(themeMap.entries())
    .map(([key, grouped]) => ({
      label: compactLabel(key) ?? titleCase(key),
      count: grouped.length,
      avgSignal: Math.round(grouped.reduce((sum, item) => sum + item.signalScore, 0) / Math.max(grouped.length, 1)),
    }))
    .filter((item) => item.count <= 2 && item.avgSignal >= 68)
    .sort((a, b) => b.avgSignal - a.avgSignal)
    .slice(0, 3)
    .map((item) => `${item.label} is showing up less often, but with unusually strong conviction.`)

  const clusters: ReleaseInsightCluster[] = sortedComplaints.slice(0, 4).map(({ label, items: grouped }) => {
    const sortedItems = grouped
      .slice()
      .sort((a, b) => b.signalScore - a.signalScore)

    return {
      label,
      count: grouped.length,
      description: buildClusterDescription(label, sortedItems),
      representativeResponseIds: sortedItems.map((item) => item.responseId).filter(Boolean).slice(0, 3) as string[],
      representativeQuote: pickRepresentativeQuote(sortedItems),
      representativeTakeId: sortedItems[0]?.responseId ?? null,
    }
  })

  return {
    signalSummary: {
      topComplaints: sortedComplaints.slice(0, 4).map(({ label, count }) => ({ label, count })),
      topOpportunities: sortedOpportunities.slice(0, 4).map(({ label, reason }) => ({ label, reason })),
      emergingSignals,
      contrarianInsights: Array.from(contrarianInsights).slice(0, 3),
    },
    clusters,
  }
}

async function generateAiReleaseSummary(
  surveyTitle: string,
  items: ReleaseAggregationItem[],
  fallbackNarrativeSummary: string,
  fallbackSignalSummary: ReleaseSignalSummary,
  fallbackClusters: ReleaseInsightCluster[],
): Promise<{
  narrativeSummary: string
  signalSummary: ReleaseSignalSummary
  clusters: ReleaseInsightCluster[]
  provider: string
  extractorVersion: string
}> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      narrativeSummary: fallbackNarrativeSummary,
      signalSummary: fallbackSignalSummary,
      clusters: fallbackClusters,
      provider: "audioform-release-heuristic",
      extractorVersion: "release-v1",
    }
  }

  const model = process.env.OPENAI_INSIGHT_MODEL || process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini"
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a world-class product analyst. Synthesize clustered voice insights into decision-grade intelligence. " +
            "Return strict JSON with keys: narrativeSummary, signalSummary, clusters. " +
            "narrativeSummary must be 3-5 sentences and focus on patterns, tensions, and what matters most. " +
            "signalSummary must contain topComplaints, topOpportunities, emergingSignals, contrarianInsights. " +
            "clusters must keep the provided representativeQuote verbatim.",
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              surveyTitle,
              insights: items.map((item) => ({
                responseId: item.responseId,
                narrativeSummary: item.narrativeSummary,
                complaint: item.complaint,
                opportunity: item.opportunity,
                emotion: item.emotion,
                frictionMoment: item.frictionMoment,
                powerQuote: item.powerQuote,
                primaryTheme: item.primaryTheme,
                themes: item.themes,
                signalScore: item.signalScore,
                sentiment: item.sentiment,
              })),
              fallbackSignalSummary,
              fallbackClusters,
            },
            null,
            2,
          ),
        },
      ],
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(`OpenAI release insight generation failed (${response.status}): ${message.slice(0, 280)}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as {
    narrativeSummary?: string
    signalSummary?: ReleaseSignalSummary
    clusters?: ReleaseInsightCluster[]
  }

  return {
    narrativeSummary: normalizeWhitespace(parsed.narrativeSummary ?? "") || fallbackNarrativeSummary,
    signalSummary: parsed.signalSummary ?? fallbackSignalSummary,
    clusters: Array.isArray(parsed.clusters) && parsed.clusters.length ? parsed.clusters : fallbackClusters,
    provider: "openai-release-structured",
    extractorVersion: "release-v1",
  }
}

function buildShareArtifacts(clusters: ReleaseInsightCluster[]): { topQuotes: string[]; bestClusterLabel?: string | null; bestClipCandidateIds?: string[] } {
  const topQuotes = clusters
    .map((cluster) => cluster.representativeQuote)
    .filter((quote): quote is string => Boolean(quote?.trim()))
    .slice(0, 3)

  return {
    topQuotes,
    bestClusterLabel: clusters[0]?.label ?? null,
    bestClipCandidateIds: clusters
      .map((cluster) => cluster.representativeTakeId)
      .filter((value): value is string => Boolean(value))
      .slice(0, 3),
  }
}

function toAggregationItem(responseId: string, insight: StoredInsight): ReleaseAggregationItem {
  return {
    responseId,
    signalScore: insight.signalScore ?? 0,
    sentiment: insight.sentiment,
    narrativeSummary: insight.narrativeSummary,
    powerQuote: insight.powerQuote,
    primaryTheme: insight.primaryTheme,
    themes: insight.themes,
    complaint: insight.signalSummary?.complaint ?? null,
    opportunity: insight.signalSummary?.opportunity ?? null,
    emotion: insight.signalSummary?.emotion ?? null,
    frictionMoment: insight.signalSummary?.frictionMoment ?? null,
  }
}

export async function aggregateAndStoreReleaseInsight(surveyId: string): Promise<StoredReleaseInsight | null> {
  const survey = await getSurveyById(surveyId)
  if (!survey) return null

  const responses = await listStoredResponses({ surveyId, limit: 500 })
  if (!responses.length) {
    return upsertReleaseInsight({
      surveyId,
      narrativeSummary: "This release is live, but it does not have enough enriched takes yet to build a signal summary.",
      signalSummary: {
        topComplaints: [],
        topOpportunities: [],
        emergingSignals: [],
        contrarianInsights: [],
      },
      clusters: [],
      shareArtifacts: { topQuotes: [] },
      provider: "audioform-release-heuristic",
      extractorVersion: "release-v1",
    })
  }

  const transcripts = await listTranscriptsByResponseIds(responses.map((response) => response.id))
  const transcriptByResponseId = new Map(
    transcripts.filter((item) => item.responseId).map((item) => [item.responseId as string, item]),
  )
  const insights = await listInsightsByTranscriptIds(transcripts.map((item) => item.id))
  const insightByTranscriptId = new Map(insights.map((item) => [item.transcriptId, item]))

  const items = responses
    .map((response) => {
      const transcript = transcriptByResponseId.get(response.id)
      const insight = transcript ? insightByTranscriptId.get(transcript.id) : null
      return insight ? toAggregationItem(response.id, insight) : null
    })
    .filter((value): value is ReleaseAggregationItem => Boolean(value))

  if (!items.length) {
    return upsertReleaseInsight({
      surveyId,
      narrativeSummary: "This release has takes waiting for transcript and insight extraction before clustering can begin.",
      signalSummary: {
        topComplaints: [],
        topOpportunities: [],
        emergingSignals: [],
        contrarianInsights: [],
      },
      clusters: [],
      shareArtifacts: { topQuotes: [] },
      provider: "audioform-release-heuristic",
      extractorVersion: "release-v1",
    })
  }

  const { signalSummary: fallbackSignalSummary, clusters: fallbackClusters } = buildReleaseSignalSummary(items)
  const fallbackNarrativeSummary = buildHeuristicNarrativeSummary(survey.title, items, fallbackSignalSummary)
  const aiResult = await generateAiReleaseSummary(
    survey.title,
    items,
    fallbackNarrativeSummary,
    fallbackSignalSummary,
    fallbackClusters,
  ).catch(() => ({
    narrativeSummary: fallbackNarrativeSummary,
    signalSummary: fallbackSignalSummary,
    clusters: fallbackClusters,
    provider: "audioform-release-heuristic",
    extractorVersion: "release-v1",
  }))

  return upsertReleaseInsight({
    surveyId,
    narrativeSummary: aiResult.narrativeSummary,
    signalSummary: aiResult.signalSummary,
    clusters: aiResult.clusters,
    shareArtifacts: buildShareArtifacts(aiResult.clusters),
    provider: aiResult.provider,
    extractorVersion: aiResult.extractorVersion,
  })
}

