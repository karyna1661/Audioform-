import type { ReleaseInsightCluster, ReleaseShareArtifacts, ReleaseSignalSummary, StoredReleaseInsight } from "@/lib/server/insight-types"

type ReleaseInsightRow = {
  id: string
  survey_id: string
  narrative_summary: string | null
  signal_summary: ReleaseSignalSummary | null
  clusters: ReleaseInsightCluster[] | null
  share_artifacts: ReleaseShareArtifacts | null
  provider: string | null
  extractor_version: string | null
  created_at: string
  updated_at: string
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".")
  if (parts.length < 2) return null
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4)
    const decoded = typeof Buffer !== "undefined" ? Buffer.from(padded, "base64").toString("utf8") : atob(padded)
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

function resolveSupabaseConfig(): { url: string; key: string } {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ""
  const explicitUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  if (explicitUrl && key) return { url: explicitUrl.replace(/\/+$/, ""), key }
  const payload = key ? decodeJwtPayload(key) : null
  const ref = typeof payload?.ref === "string" ? payload.ref : ""
  if (ref && key) return { url: `https://${ref}.supabase.co`, key }
  throw new Error("Missing Supabase config for release insight store.")
}

async function supabaseRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { url, key } = resolveSupabaseConfig()
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase release-insight request failed (${response.status}): ${text.slice(0, 280)}`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function mapRow(row: ReleaseInsightRow): StoredReleaseInsight {
  return {
    id: row.id,
    surveyId: row.survey_id,
    narrativeSummary: row.narrative_summary,
    signalSummary: row.signal_summary ?? null,
    clusters: Array.isArray(row.clusters) ? row.clusters : [],
    shareArtifacts: row.share_artifacts ?? null,
    provider: row.provider,
    extractorVersion: row.extractor_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const RELEASE_INSIGHT_SELECT =
  "id,survey_id,narrative_summary,signal_summary,clusters,share_artifacts,provider,extractor_version,created_at,updated_at"

export async function getReleaseInsightBySurveyId(surveyId: string): Promise<StoredReleaseInsight | null> {
  const rows = await supabaseRequest<ReleaseInsightRow[]>(
    `/rest/v1/release_insights?survey_id=eq.${encodeURIComponent(surveyId)}&select=${RELEASE_INSIGHT_SELECT}&limit=1`,
  )
  return rows.length ? mapRow(rows[0]) : null
}

export async function upsertReleaseInsight(input: {
  surveyId: string
  narrativeSummary?: string | null
  signalSummary?: ReleaseSignalSummary | null
  clusters?: ReleaseInsightCluster[]
  shareArtifacts?: ReleaseShareArtifacts | null
  provider?: string | null
  extractorVersion?: string | null
}) {
  const rows = await supabaseRequest<ReleaseInsightRow[]>(
    `/rest/v1/release_insights?on_conflict=survey_id&select=${RELEASE_INSIGHT_SELECT}`,
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([
        {
          survey_id: input.surveyId,
          narrative_summary: input.narrativeSummary ?? null,
          signal_summary: input.signalSummary ?? {},
          clusters: input.clusters ?? [],
          share_artifacts: input.shareArtifacts ?? {},
          provider: input.provider ?? null,
          extractor_version: input.extractorVersion ?? null,
          updated_at: new Date().toISOString(),
        },
      ]),
    },
  )
  return mapRow(rows[0])
}

