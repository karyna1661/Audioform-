import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getAnonSessionIdFromRequest, getOrCreateAnonSessionId, setAnonSessionCookie } from "@/lib/server/anon-session"
import { getCorsHeaders, hasAllowedApiOrigin } from "@/lib/server/cors"
import {
  cleanupStoredFile,
  finalizeUploadedResponse,
  getStoredResponseById,
  incrementUploadAttempts,
  markResponseFailed,
  uploadAudioToStorage,
} from "@/lib/server/response-store"
import { applyRateLimit, getRequestClientIp } from "@/lib/server/rate-limit"

const uploadSchema = z.object({
  responseId: z.string().min(1),
  idempotencyKey: z.string().min(10),
  sessionId: z.string().min(1).optional(),
  durationSeconds: z.number().optional(),
})

const ALLOWED_AUDIO_MIME = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
])
const MAX_AUDIO_SIZE_BYTES = 8 * 1024 * 1024

function logUpload(event: string, payload: Record<string, unknown>) {
  console.log(`[responses:upload] ${event}`, payload)
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request, { methods: "POST, OPTIONS" })

  let storagePath: string | null = null
  let storageFileId: string | null = null

  try {
    if (!hasAllowedApiOrigin(request)) {
      logUpload("invalid_origin", { origin: request.headers.get("origin"), referer: request.headers.get("referer") })
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: corsHeaders })
    }

    const ip = getRequestClientIp(request.headers)
    const rate = await applyRateLimit({
      key: `responses:upload:${ip}`,
      windowMs: 60_000,
      max: 40,
    })
    if (!rate.allowed) {
      logUpload("rate_limited", { ip, retryAfterSeconds: rate.retryAfterSeconds })
      return NextResponse.json(
        { error: "Too many submissions. Please retry shortly." },
        { status: 429, headers: { ...corsHeaders, "Retry-After": String(rate.retryAfterSeconds) } },
      )
    }

    const form = await request.formData()
    const audio = form.get("audio") as File | null
    const parsed = uploadSchema.safeParse({
      responseId: form.get("responseId"),
      idempotencyKey: form.get("idempotencyKey"),
      sessionId: form.get("sessionId"),
      durationSeconds: form.get("durationSeconds") ? Number(form.get("durationSeconds")) : undefined,
    })
    if (!parsed.success || !audio) {
      logUpload("invalid_payload", { ip, hasAudio: Boolean(audio) })
      return NextResponse.json({ error: "Invalid payload", details: parsed.success ? undefined : parsed.error.flatten() }, { status: 400, headers: corsHeaders })
    }

    logUpload("received", {
      ip,
      responseId: parsed.data.responseId,
      hasCookieSession: Boolean(await getAnonSessionIdFromRequest()),
      hasFormSession: Boolean(parsed.data.sessionId),
      size: audio.size,
      mimeType: audio.type || null,
      durationSeconds: parsed.data.durationSeconds ?? null,
    })

    if (audio.size <= 0 || audio.size > MAX_AUDIO_SIZE_BYTES) {
      logUpload("invalid_size", { ip, responseId: parsed.data.responseId, size: audio.size })
      return NextResponse.json({ error: `Invalid audio size. Max allowed is ${Math.floor(MAX_AUDIO_SIZE_BYTES / (1024 * 1024))}MB.` }, { status: 413, headers: corsHeaders })
    }

    const mimeType = (audio.type || "").toLowerCase()
    if (!ALLOWED_AUDIO_MIME.has(mimeType)) {
      logUpload("invalid_mime", { ip, responseId: parsed.data.responseId, mimeType })
      return NextResponse.json({ error: "Unsupported audio format." }, { status: 415, headers: corsHeaders })
    }

    const existing = await getStoredResponseById(parsed.data.responseId)
    if (!existing) {
      logUpload("response_missing", { ip, responseId: parsed.data.responseId })
      return NextResponse.json({ error: "Response not found." }, { status: 404, headers: corsHeaders })
    }

    // Idempotency guard
    if (existing.status === "uploaded") {
      logUpload("idempotent_hit", { ip, responseId: existing.id })
      return NextResponse.json({ success: true, response: existing }, { status: 200, headers: corsHeaders })
    }
    if (existing.idempotencyKey !== parsed.data.idempotencyKey) {
      logUpload("idempotency_mismatch", { ip, responseId: existing.id })
      return NextResponse.json({ error: "Idempotency key mismatch." }, { status: 409, headers: corsHeaders })
    }

    // Access guard:
    // - Auth user can upload for their own pending record
    // - Anon can upload only if anon session_id matches
    const authSession = await getSessionFromRequest()
    const anonSessionFromCookie = await getAnonSessionIdFromRequest()
    const anonSessionId = anonSessionFromCookie || parsed.data.sessionId || null
    if (authSession?.sub) {
      if (existing.userId && existing.userId !== authSession.sub) {
        logUpload("forbidden_auth_user", { ip, responseId: existing.id, authUser: authSession.sub, ownerUser: existing.userId })
        return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders })
      }
    } else {
      if (!anonSessionId || anonSessionId !== existing.sessionId) {
        logUpload("forbidden_session", {
          ip,
          responseId: existing.id,
          hasCookieSession: Boolean(anonSessionFromCookie),
          hasFormSession: Boolean(parsed.data.sessionId),
        })
        return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders })
      }
    }

    await incrementUploadAttempts(existing.id)

    const uploaded = await uploadAudioToStorage({
      responseId: existing.id,
      audioFile: audio,
    })
    storagePath = uploaded.storagePath
    storageFileId = uploaded.storageFileId ?? null

    const finalized = await finalizeUploadedResponse({
      id: existing.id,
      fileName: audio.name || `${existing.id}.audio`,
      mimeType: audio.type || "application/octet-stream",
      size: audio.size,
      storagePath,
      storageFileId,
      publicUrl: uploaded.publicUrl ?? null,
      durationSeconds: parsed.data.durationSeconds ?? null,
    })

    if (!finalized) {
      // If DB update failed after upload, clean up the file to avoid orphans.
      await cleanupStoredFile({ storagePath, storageFileId })
      logUpload("finalize_failed", { ip, responseId: existing.id, storagePath })
      return NextResponse.json({ error: "Failed to finalize response." }, { status: 503, headers: corsHeaders })
    }

    logUpload("stored", {
      ip,
      responseId: finalized.id,
      storagePath: finalized.storagePath,
      size: finalized.size,
      durationSeconds: finalized.durationSeconds ?? null,
    })
    const response = NextResponse.json({ success: true, response: finalized }, { status: 200, headers: corsHeaders })
    const sessionIdToPersist = anonSessionId || (await getOrCreateAnonSessionId())
    setAnonSessionCookie(response, sessionIdToPersist)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed."
    logUpload("error", { message, storagePath, storageFileId })
    // Best-effort state reconciliation
    try {
      const form = await request.formData().catch(() => null)
      const responseId = form?.get("responseId")
      if (typeof responseId === "string" && responseId) {
        await markResponseFailed(responseId)
      }
    } catch {
      // ignore
    }
    // Best-effort file cleanup if upload succeeded before error.
    try {
      await cleanupStoredFile({ storagePath, storageFileId })
    } catch {
      // ignore
    }
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, { methods: "POST, OPTIONS" }),
  })
}

