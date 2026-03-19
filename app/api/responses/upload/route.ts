import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getAnonSessionIdFromRequest, getOrCreateAnonSessionId, setAnonSessionCookie } from "@/lib/server/anon-session"
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

export async function POST(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  }

  let storagePath: string | null = null
  let storageFileId: string | null = null

  try {
    const ip = getRequestClientIp(request.headers)
    const rate = applyRateLimit({
      key: `responses:upload:${ip}`,
      windowMs: 60_000,
      max: 40,
    })
    if (!rate.allowed) {
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
      durationSeconds: form.get("durationSeconds") ? Number(form.get("durationSeconds")) : undefined,
    })
    if (!parsed.success || !audio) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.success ? undefined : parsed.error.flatten() }, { status: 400, headers: corsHeaders })
    }

    if (audio.size <= 0 || audio.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json({ error: `Invalid audio size. Max allowed is ${Math.floor(MAX_AUDIO_SIZE_BYTES / (1024 * 1024))}MB.` }, { status: 413, headers: corsHeaders })
    }

    const mimeType = (audio.type || "").toLowerCase()
    if (!ALLOWED_AUDIO_MIME.has(mimeType)) {
      return NextResponse.json({ error: "Unsupported audio format." }, { status: 415, headers: corsHeaders })
    }

    const existing = await getStoredResponseById(parsed.data.responseId)
    if (!existing) {
      return NextResponse.json({ error: "Response not found." }, { status: 404, headers: corsHeaders })
    }

    // Idempotency guard
    if (existing.status === "uploaded") {
      return NextResponse.json({ success: true, response: existing }, { status: 200, headers: corsHeaders })
    }
    if (existing.idempotencyKey !== parsed.data.idempotencyKey) {
      return NextResponse.json({ error: "Idempotency key mismatch." }, { status: 409, headers: corsHeaders })
    }

    // Access guard:
    // - Auth user can upload for their own pending record
    // - Anon can upload only if anon session_id matches
    const authSession = await getSessionFromRequest()
    const anonSessionFromCookie = await getAnonSessionIdFromRequest()
    if (authSession?.sub) {
      if (existing.userId && existing.userId !== authSession.sub) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders })
      }
    } else {
      if (!anonSessionFromCookie || anonSessionFromCookie !== existing.sessionId) {
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
      return NextResponse.json({ error: "Failed to finalize response." }, { status: 503, headers: corsHeaders })
    }

    const response = NextResponse.json({ success: true, response: finalized }, { status: 200, headers: corsHeaders })
    const anonSessionId = anonSessionFromCookie || (await getOrCreateAnonSessionId())
    setAnonSessionCookie(response, anonSessionId)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed."
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    },
  })
}

