type TranscriptRow = {
  id: string
  job_id: string
  response_id: string | null
  question_id: string
  status: "pending" | "completed" | "failed"
  transcript_text: string | null
  provider: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export type StoredTranscript = {
  id: string
  jobId: string
  responseId: string | null
  questionId: string
  status: "pending" | "completed" | "failed"
  transcriptText: string | null
  provider: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".")
  if (parts.length < 2) return null
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4)
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>
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
  throw new Error("Missing Supabase config for transcript store.")
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
    throw new Error(`Supabase transcript request failed (${response.status}): ${text.slice(0, 280)}`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function mapRow(row: TranscriptRow): StoredTranscript {
  return {
    id: row.id,
    jobId: row.job_id,
    responseId: row.response_id,
    questionId: row.question_id,
    status: row.status,
    transcriptText: row.transcript_text,
    provider: row.provider,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createPendingTranscript(input: { jobId: string; responseId?: string | null; questionId: string; provider?: string | null }) {
  const rows = await supabaseRequest<TranscriptRow[]>("/rest/v1/response_transcripts", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([
      {
        job_id: input.jobId,
        response_id: input.responseId ?? null,
        question_id: input.questionId,
        status: "pending",
        provider: input.provider ?? null,
        updated_at: new Date().toISOString(),
      },
    ]),
  })
  return mapRow(rows[0])
}

export async function completeTranscript(jobId: string, transcriptText: string, provider = "openai") {
  const rows = await supabaseRequest<TranscriptRow[]>(`/rest/v1/response_transcripts?job_id=eq.${encodeURIComponent(jobId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      status: "completed",
      transcript_text: transcriptText,
      provider,
      error_message: null,
      updated_at: new Date().toISOString(),
    }),
  })
  return rows.length ? mapRow(rows[0]) : null
}

export async function failTranscript(jobId: string, errorMessage: string, provider = "openai") {
  const rows = await supabaseRequest<TranscriptRow[]>(`/rest/v1/response_transcripts?job_id=eq.${encodeURIComponent(jobId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      status: "failed",
      provider,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    }),
  })
  return rows.length ? mapRow(rows[0]) : null
}

export async function getTranscriptByJobId(jobId: string): Promise<StoredTranscript | null> {
  const rows = await supabaseRequest<TranscriptRow[]>(`/rest/v1/response_transcripts?job_id=eq.${encodeURIComponent(jobId)}&select=id,job_id,response_id,question_id,status,transcript_text,provider,error_message,created_at,updated_at&limit=1`)
  return rows.length ? mapRow(rows[0]) : null
}

export async function getTranscriptByResponseId(responseId: string): Promise<StoredTranscript | null> {
  const rows = await supabaseRequest<TranscriptRow[]>(`/rest/v1/response_transcripts?response_id=eq.${encodeURIComponent(responseId)}&select=id,job_id,response_id,question_id,status,transcript_text,provider,error_message,created_at,updated_at&order=updated_at.desc&limit=1`)
  return rows.length ? mapRow(rows[0]) : null
}

export async function listTranscriptsByResponseIds(responseIds: string[]): Promise<StoredTranscript[]> {
  if (!responseIds.length) return []
  const rows = await supabaseRequest<TranscriptRow[]>(`/rest/v1/response_transcripts?response_id=in.(${responseIds.map((id) => encodeURIComponent(id)).join(",")})&select=id,job_id,response_id,question_id,status,transcript_text,provider,error_message,created_at,updated_at&order=updated_at.desc`)
  return rows.map(mapRow)
}
