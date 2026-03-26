type InsightRow = {
  id: string
  transcript_id: string
  response_id: string | null
  summary: string | null
  primary_theme: string | null
  themes: string[] | null
  sentiment: string | null
  sentiment_score: number | null
  signal_score: number | null
  quotes: string[] | null
  provider: string | null
  extractor_version: string | null
  created_at: string
  updated_at: string
}

export type StoredInsight = {
  id: string
  transcriptId: string
  responseId: string | null
  summary: string | null
  primaryTheme: string | null
  themes: string[]
  sentiment: string | null
  sentimentScore: number | null
  signalScore: number | null
  quotes: string[]
  provider: string | null
  extractorVersion: string | null
  createdAt: string
  updatedAt: string
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".")
  if (parts.length < 2) return null
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4)
    const decoded = typeof Buffer !== "undefined"
      ? Buffer.from(padded, "base64").toString("utf8")
      : atob(padded)
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
  throw new Error("Missing Supabase config for insight store.")
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
    throw new Error(`Supabase insight request failed (${response.status}): ${text.slice(0, 280)}`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function mapRow(row: InsightRow): StoredInsight {
  return {
    id: row.id,
    transcriptId: row.transcript_id,
    responseId: row.response_id,
    summary: row.summary,
    primaryTheme: row.primary_theme,
    themes: Array.isArray(row.themes) ? row.themes : [],
    sentiment: row.sentiment,
    sentimentScore: row.sentiment_score,
    signalScore: row.signal_score,
    quotes: Array.isArray(row.quotes) ? row.quotes : [],
    provider: row.provider,
    extractorVersion: row.extractor_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function upsertInsightResult(input: {
  transcriptId: string
  responseId?: string | null
  summary?: string | null
  primaryTheme?: string | null
  themes?: string[]
  sentiment?: string | null
  sentimentScore?: number | null
  signalScore?: number | null
  quotes?: string[]
  provider?: string | null
  extractorVersion?: string | null
}) {
  const rows = await supabaseRequest<InsightRow[]>("/rest/v1/insight_results?on_conflict=transcript_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([
      {
        transcript_id: input.transcriptId,
        response_id: input.responseId ?? null,
        summary: input.summary ?? null,
        primary_theme: input.primaryTheme ?? null,
        themes: input.themes ?? [],
        sentiment: input.sentiment ?? null,
        sentiment_score: input.sentimentScore ?? null,
        signal_score: input.signalScore ?? null,
        quotes: input.quotes ?? [],
        provider: input.provider ?? null,
        extractor_version: input.extractorVersion ?? null,
        updated_at: new Date().toISOString(),
      },
    ]),
  })
  return mapRow(rows[0])
}

export async function getInsightByTranscriptId(transcriptId: string): Promise<StoredInsight | null> {
  const rows = await supabaseRequest<InsightRow[]>(`/rest/v1/insight_results?transcript_id=eq.${encodeURIComponent(transcriptId)}&select=id,transcript_id,response_id,summary,primary_theme,themes,sentiment,sentiment_score,signal_score,quotes,provider,extractor_version,created_at,updated_at&limit=1`)
  return rows.length ? mapRow(rows[0]) : null
}

export async function listInsightsByTranscriptIds(transcriptIds: string[]): Promise<StoredInsight[]> {
  if (!transcriptIds.length) return []
  const rows = await supabaseRequest<InsightRow[]>(`/rest/v1/insight_results?transcript_id=in.(${transcriptIds.map((id) => encodeURIComponent(id)).join(",")})&select=id,transcript_id,response_id,summary,primary_theme,themes,sentiment,sentiment_score,signal_score,quotes,provider,extractor_version,created_at,updated_at`)
  return rows.map(mapRow)
}
