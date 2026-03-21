import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { deleteFromB2, isB2Configured, uploadToB2 } from "@/lib/server/b2-storage"

export type StoredResponse = {
  id: string
  surveyId: string
  questionId: string
  userId: string | null
  sessionId: string
  status: "pending" | "uploaded" | "failed"
  idempotencyKey: string
  uploadAttempts: number
  fileName: string | null
  mimeType: string | null
  size: number | null
  storagePath: string | null
  storageFileId: string | null
  publicUrl?: string
  durationSeconds?: number | null
  durationBucket?: "short" | "medium" | "deep" | null
  flagged: boolean
  highSignal: boolean
  bookmarked: boolean
  moderationUpdatedAt: string | null
  createdAt: string
}

type ResponseRow = {
  id: string
  survey_id: string
  question_id: string
  user_id: string | null
  session_id: string
  status: "pending" | "uploaded" | "failed"
  idempotency_key: string
  upload_attempts: number | null
  file_name: string | null
  mime_type: string | null
  size: number | null
  storage_path: string | null
  storage_file_id: string | null
  public_url: string | null
  duration_seconds: number | null
  duration_bucket: "short" | "medium" | "deep" | null
  flagged: boolean | null
  high_signal: boolean | null
  bookmarked: boolean | null
  moderation_updated_at: string | null
  created_at: string
}

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "audio-responses")

async function ensureStore(): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true })
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
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    ""

  const explicitUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  if (explicitUrl && key) return { url: explicitUrl.replace(/\/+$/, ""), key }

  const projectRefFromEnv = process.env.SUPABASE_PROJECT_REF || ""
  if (projectRefFromEnv && key) {
    return { url: `https://${projectRefFromEnv}.supabase.co`, key }
  }

  const payload = key ? decodeJwtPayload(key) : null
  const ref = typeof payload?.ref === "string" ? payload.ref : ""
  if (ref && key) {
    return { url: `https://${ref}.supabase.co`, key }
  }

  throw new Error("Missing Supabase config for response store.")
}

async function supabaseRequest<T>(pathValue: string, init?: RequestInit): Promise<T> {
  const { url, key } = resolveSupabaseConfig()
  const response = await fetch(`${url}${pathValue}`, {
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
    throw new Error(`Supabase response-store request failed (${response.status}): ${text.slice(0, 280)}`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm"
  if (mimeType.includes("mpeg")) return "mp3"
  if (mimeType.includes("wav")) return "wav"
  if (mimeType.includes("ogg")) return "ogg"
  return "bin"
}

function mapRow(row: ResponseRow): StoredResponse {
  return {
    id: row.id,
    surveyId: row.survey_id,
    questionId: row.question_id,
    userId: row.user_id,
    sessionId: row.session_id,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    uploadAttempts: row.upload_attempts ?? 0,
    fileName: row.file_name,
    mimeType: row.mime_type,
    size: row.size,
    storagePath: row.storage_path,
    storageFileId: row.storage_file_id,
    publicUrl: row.public_url || undefined,
    durationSeconds: row.duration_seconds,
    durationBucket: row.duration_bucket,
    flagged: Boolean(row.flagged),
    highSignal: Boolean(row.high_signal),
    bookmarked: Boolean(row.bookmarked),
    moderationUpdatedAt: row.moderation_updated_at,
    createdAt: row.created_at,
  }
}

export async function initPendingResponse(input: {
  surveyId: string
  questionId: string
  userId: string | null
  sessionId: string
  idempotencyKey: string
}): Promise<StoredResponse> {
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const rows = await supabaseRequest<ResponseRow[]>("/rest/v1/response_records", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([
      {
        id,
        survey_id: input.surveyId,
        question_id: input.questionId,
        user_id: input.userId,
        session_id: input.sessionId,
        status: "pending",
        upload_attempts: 0,
        idempotency_key: input.idempotencyKey,
        file_name: null,
        mime_type: null,
        size: null,
        storage_path: null,
        storage_file_id: null,
        public_url: null,
        duration_seconds: null,
        duration_bucket: null,
        flagged: false,
        high_signal: false,
        bookmarked: false,
        moderation_updated_at: null,
        created_at: createdAt,
      },
    ]),
  })

  if (!rows.length) throw new Error("Failed to create pending response.")
  return mapRow(rows[0])
}

export async function getStoredResponseById(id: string): Promise<StoredResponse | null> {
  const rows = await supabaseRequest<ResponseRow[]>(
    `/rest/v1/response_records?id=eq.${encodeURIComponent(id)}&select=id,survey_id,question_id,user_id,session_id,status,idempotency_key,upload_attempts,file_name,mime_type,size,storage_path,storage_file_id,public_url,duration_seconds,duration_bucket,flagged,high_signal,bookmarked,moderation_updated_at,created_at&limit=1`,
  )
  if (!rows.length) return null
  return mapRow(rows[0])
}

export async function incrementUploadAttempts(id: string): Promise<void> {
  const existing = await getStoredResponseById(id)
  if (!existing) return
  const nextAttempts = (existing.uploadAttempts ?? 0) + 1
  await supabaseRequest<unknown>(`/rest/v1/response_records?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      upload_attempts: nextAttempts,
    }),
  })
}

export async function markResponseFailed(id: string): Promise<void> {
  await supabaseRequest<unknown>(`/rest/v1/response_records?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "failed",
    }),
  })
}

export async function finalizeUploadedResponse(input: {
  id: string
  fileName: string
  mimeType: string
  size: number
  storagePath: string
  storageFileId?: string | null
  publicUrl?: string | null
  durationSeconds?: number | null
}): Promise<StoredResponse | null> {
  const durationBucket =
    typeof input.durationSeconds === "number" ? classifyDurationBucket(input.durationSeconds) : null

  const rows = await supabaseRequest<ResponseRow[]>(
    `/rest/v1/response_records?id=eq.${encodeURIComponent(input.id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "uploaded",
        file_name: input.fileName,
        mime_type: input.mimeType,
        size: input.size,
        storage_path: input.storagePath,
        storage_file_id: input.storageFileId ?? null,
        public_url: input.publicUrl ?? null,
        duration_seconds: input.durationSeconds ?? null,
        duration_bucket: durationBucket,
      }),
    },
  )
  if (!rows.length) return null
  return mapRow(rows[0])
}

export async function uploadAudioToStorage(input: {
  responseId: string
  audioFile: File
}): Promise<{
  storagePath: string
  publicUrl?: string
  storageFileId?: string | null
}> {
  await ensureStore()

  const ext = extensionForMime(input.audioFile.type || "")
  const fileName = `${input.responseId}.${ext}`
  const arrayBuffer = await input.audioFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const isProduction = process.env.NODE_ENV === "production"
  const shouldUseB2 = isProduction && isB2Configured()

  if (shouldUseB2) {
    const uploaded = await uploadToB2({
      buffer,
      mimeType: input.audioFile.type || "application/octet-stream",
      originalName: input.audioFile.name || fileName,
      prefix: "voice-recordings",
    })
    return {
      storagePath: uploaded.storagePath,
      publicUrl: uploaded.publicUrl,
      storageFileId: uploaded.fileId ?? null,
    }
  }

  const fullPath = path.join(UPLOAD_DIR, fileName)
  await writeFile(fullPath, Uint8Array.from(buffer))
  return { storagePath: fullPath }
}

export async function cleanupStoredFile(input: {
  storagePath: string | null
  storageFileId: string | null
}): Promise<void> {
  if (!input.storagePath) return
  if (input.storagePath.startsWith("b2://")) {
    // Requires fileId. If absent, cleanup is not possible reliably.
    if (input.storageFileId) {
      const withoutScheme = input.storagePath.slice("b2://".length)
      const slash = withoutScheme.indexOf("/")
      const objectKey = slash > 0 ? withoutScheme.slice(slash + 1) : ""
      if (objectKey) {
        await deleteFromB2({ fileId: input.storageFileId, fileName: objectKey })
      }
    }
    return
  }

  try {
    await unlink(input.storagePath)
  } catch {
    // Best-effort.
  }
}

/**
 * Classify response duration into buckets for analytics and filtering
 * - short: < 10 seconds
 * - medium: 10-20 seconds  
 * - deep: > 20 seconds
 */
function classifyDurationBucket(seconds: number): "short" | "medium" | "deep" {
  if (seconds < 10) return "short"
  if (seconds < 20) return "medium"
  return "deep"
}

export async function listStoredResponses(filters?: {
  surveyId?: string
  surveyIds?: string[]
  questionId?: string
  userId?: string
  limit?: number
}): Promise<StoredResponse[]> {
  const params: string[] = [
    "select=id,survey_id,question_id,user_id,session_id,status,idempotency_key,upload_attempts,file_name,mime_type,size,storage_path,storage_file_id,public_url,duration_seconds,duration_bucket,flagged,high_signal,bookmarked,moderation_updated_at,created_at",
    "order=created_at.desc",
    "status=eq.uploaded",
  ]
  if (filters?.surveyId) params.push(`survey_id=eq.${encodeURIComponent(filters.surveyId)}`)
  if (filters?.surveyIds?.length) params.push(`survey_id=in.(${filters.surveyIds.map((id) => encodeURIComponent(id)).join(",")})`)
  if (filters?.questionId) params.push(`question_id=eq.${encodeURIComponent(filters.questionId)}`)
  if (filters?.userId) params.push(`user_id=eq.${encodeURIComponent(filters.userId)}`)
  if (filters?.limit && Number.isFinite(filters.limit) && filters.limit > 0) {
    params.push(`limit=${Math.min(Math.trunc(filters.limit), 500)}`)
  }

  const rows = await supabaseRequest<ResponseRow[]>(`/rest/v1/response_records?${params.join("&")}`)
  return rows.map(mapRow)
}

export async function countStoredResponses(filters?: {
  surveyId?: string
  surveyIds?: string[]
  questionId?: string
  userId?: string
}): Promise<number> {
  const params: string[] = ["select=id", "status=eq.uploaded"]
  if (filters?.surveyId) params.push(`survey_id=eq.${encodeURIComponent(filters.surveyId)}`)
  if (filters?.surveyIds?.length) params.push(`survey_id=in.(${filters.surveyIds.map((id) => encodeURIComponent(id)).join(",")})`)
  if (filters?.questionId) params.push(`question_id=eq.${encodeURIComponent(filters.questionId)}`)
  if (filters?.userId) params.push(`user_id=eq.${encodeURIComponent(filters.userId)}`)

  const { url, key } = resolveSupabaseConfig()
  const response = await fetch(`${url}/rest/v1/response_records?${params.join("&")}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "count=exact",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase response count failed (${response.status}): ${text.slice(0, 280)}`)
  }

  const countHeader = response.headers.get("content-range")
  const total = countHeader?.split("/")[1]
  const parsed = total ? Number.parseInt(total, 10) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getStoredResponseByIdForSurveyIds(
  id: string,
  surveyIds: string[],
): Promise<StoredResponse | null> {
  if (!surveyIds.length) return null
  const rows = await supabaseRequest<ResponseRow[]>(
    `/rest/v1/response_records?id=eq.${encodeURIComponent(id)}&survey_id=in.(${surveyIds
      .map((surveyId) => encodeURIComponent(surveyId))
      .join(",")})&select=id,survey_id,question_id,user_id,session_id,status,idempotency_key,upload_attempts,file_name,mime_type,size,storage_path,storage_file_id,public_url,duration_seconds,duration_bucket,flagged,high_signal,bookmarked,moderation_updated_at,created_at&limit=1`,
  )
  if (!rows.length) return null
  return mapRow(rows[0])
}

export async function updateStoredResponse(
  id: string,
  patch: Partial<Pick<StoredResponse, "flagged" | "highSignal" | "bookmarked">>,
): Promise<StoredResponse | null> {
  const body: Record<string, unknown> = {
    moderation_updated_at: new Date().toISOString(),
  }
  if (patch.flagged !== undefined) body.flagged = patch.flagged
  if (patch.highSignal !== undefined) body.high_signal = patch.highSignal
  if (patch.bookmarked !== undefined) body.bookmarked = patch.bookmarked

  const rows = await supabaseRequest<ResponseRow[]>(
    `/rest/v1/response_records?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body),
    },
  )
  if (!rows.length) return null
  return mapRow(rows[0])
}

export async function updateStoredResponseForSurveyIds(
  id: string,
  surveyIds: string[],
  patch: Partial<Pick<StoredResponse, "flagged" | "highSignal" | "bookmarked">>,
): Promise<StoredResponse | null> {
  if (!surveyIds.length) return null

  const body: Record<string, unknown> = {
    moderation_updated_at: new Date().toISOString(),
  }
  if (patch.flagged !== undefined) body.flagged = patch.flagged
  if (patch.highSignal !== undefined) body.high_signal = patch.highSignal
  if (patch.bookmarked !== undefined) body.bookmarked = patch.bookmarked

  const rows = await supabaseRequest<ResponseRow[]>(
    `/rest/v1/response_records?id=eq.${encodeURIComponent(id)}&survey_id=in.(${surveyIds
      .map((surveyId) => encodeURIComponent(surveyId))
      .join(",")})`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body),
    },
  )
  if (!rows.length) return null
  return mapRow(rows[0])
}

export async function deleteStoredResponse(id: string): Promise<StoredResponse | null> {
  const existing = await getStoredResponseById(id)
  if (!existing) return null

  await supabaseRequest<unknown>(`/rest/v1/response_records?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  })

  // Best-effort local cleanup. B2 object cleanup is intentionally skipped for now
  // unless we have a file id.
  await cleanupStoredFile({
    storagePath: existing.storagePath,
    storageFileId: existing.storageFileId,
  })

  return existing
}

export async function deleteStoredResponseForSurveyIds(
  id: string,
  surveyIds: string[],
): Promise<StoredResponse | null> {
  const existing = await getStoredResponseByIdForSurveyIds(id, surveyIds)
  if (!existing) return null

  await supabaseRequest<unknown>(
    `/rest/v1/response_records?id=eq.${encodeURIComponent(id)}&survey_id=in.(${surveyIds
      .map((surveyId) => encodeURIComponent(surveyId))
      .join(",")})`,
    {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    },
  )

  await cleanupStoredFile({
    storagePath: existing.storagePath,
    storageFileId: existing.storageFileId,
  })

  return existing
}
