import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { isB2Configured, uploadToB2 } from "@/lib/server/b2-storage"

export type StoredResponse = {
  id: string
  surveyId: string
  questionId: string
  userId: string
  fileName: string
  mimeType: string
  size: number
  storagePath: string
  publicUrl?: string
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
  user_id: string
  file_name: string
  mime_type: string
  size: number
  storage_path: string
  public_url: string | null
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
    process.env.SUPABASE_API ||
    process.env.SUPABASE_ANON_KEY ||
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
    fileName: row.file_name,
    mimeType: row.mime_type,
    size: row.size,
    storagePath: row.storage_path,
    publicUrl: row.public_url || undefined,
    flagged: Boolean(row.flagged),
    highSignal: Boolean(row.high_signal),
    bookmarked: Boolean(row.bookmarked),
    moderationUpdatedAt: row.moderation_updated_at,
    createdAt: row.created_at,
  }
}

export async function createStoredResponse(input: {
  surveyId: string
  questionId: string
  userId: string
  audioFile: File
}): Promise<StoredResponse> {
  await ensureStore()
  const id = randomUUID()
  const ext = extensionForMime(input.audioFile.type || "")
  const fileName = `${id}.${ext}`
  const arrayBuffer = await input.audioFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let storagePath = ""
  let publicUrl: string | undefined
  if (isB2Configured()) {
    const uploaded = await uploadToB2({
      buffer,
      mimeType: input.audioFile.type || "application/octet-stream",
      originalName: input.audioFile.name || fileName,
      prefix: "voice-recordings",
    })
    storagePath = uploaded.storagePath
    publicUrl = uploaded.publicUrl
  } else {
    const fullPath = path.join(UPLOAD_DIR, fileName)
    await writeFile(fullPath, buffer)
    storagePath = fullPath
  }

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
        file_name: input.audioFile.name || fileName,
        mime_type: input.audioFile.type || "application/octet-stream",
        size: input.audioFile.size,
        storage_path: storagePath,
        public_url: publicUrl ?? null,
        flagged: false,
        high_signal: false,
        bookmarked: false,
        moderation_updated_at: null,
        created_at: createdAt,
      },
    ]),
  })

  if (!rows.length) throw new Error("Failed to persist response metadata.")
  return mapRow(rows[0])
}

export async function listStoredResponses(filters?: {
  surveyId?: string
  questionId?: string
  userId?: string
}): Promise<StoredResponse[]> {
  const params: string[] = [
    "select=id,survey_id,question_id,user_id,file_name,mime_type,size,storage_path,public_url,flagged,high_signal,bookmarked,moderation_updated_at,created_at",
    "order=created_at.desc",
  ]
  if (filters?.surveyId) params.push(`survey_id=eq.${encodeURIComponent(filters.surveyId)}`)
  if (filters?.questionId) params.push(`question_id=eq.${encodeURIComponent(filters.questionId)}`)
  if (filters?.userId) params.push(`user_id=eq.${encodeURIComponent(filters.userId)}`)

  const rows = await supabaseRequest<ResponseRow[]>(`/rest/v1/response_records?${params.join("&")}`)
  return rows.map(mapRow)
}

export async function getStoredResponseById(id: string): Promise<StoredResponse | null> {
  const rows = await supabaseRequest<ResponseRow[]>(
    `/rest/v1/response_records?id=eq.${encodeURIComponent(id)}&select=id,survey_id,question_id,user_id,file_name,mime_type,size,storage_path,public_url,flagged,high_signal,bookmarked,moderation_updated_at,created_at&limit=1`,
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

export async function deleteStoredResponse(id: string): Promise<StoredResponse | null> {
  const existing = await getStoredResponseById(id)
  if (!existing) return null

  await supabaseRequest<unknown>(`/rest/v1/response_records?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  })

  // Best-effort local cleanup. B2 object cleanup is intentionally skipped for now
  // because file IDs are not stored with the record metadata.
  if (!existing.storagePath.startsWith("b2://")) {
    try {
      await unlink(existing.storagePath)
    } catch {
      // Non-blocking cleanup.
    }
  }

  return existing
}
