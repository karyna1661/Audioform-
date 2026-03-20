import { NextRequest, NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getAnonSessionIdFromRequest } from "@/lib/server/anon-session"
import { getStoredResponseById, getStoredResponseByIdForSurveyIds } from "@/lib/server/response-store"
import { listSurveys } from "@/lib/server/survey-store"
import { downloadFromB2StoragePath } from "@/lib/server/b2-storage"

function logAudio(event: string, payload: Record<string, unknown>) {
  console.log(`[responses:audio] ${event}`, payload)
}

async function downloadFromPublicUrl(publicUrl: string): Promise<Buffer | null> {
  const response = await fetch(publicUrl, { cache: "no-store" })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`public download failed (${response.status}): ${text.slice(0, 220)}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const session = await getSessionFromRequest()
  const anonSessionId = await getAnonSessionIdFromRequest()
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

  // Access rules:
  // - Authenticated: must own the survey that the response belongs to
  // - Anonymous: must have matching anon session_id cookie
  const response =
    session?.sub
      ? await getStoredResponseByIdForSurveyIds(id, (await listSurveys({ createdBy: session.sub })).map((s) => s.id))
      : await getStoredResponseById(id)

  if (!response || response.status !== "uploaded") {
    logAudio("missing_response", { id, ip, authUser: session?.sub ?? null })
    return NextResponse.json({ error: "Response not found." }, { status: 404 })
  }

  if (!session?.sub) {
    if (!anonSessionId || anonSessionId !== response.sessionId) {
      logAudio("unauthorized", { id, ip, hasAnonSession: Boolean(anonSessionId) })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    let buffer: Buffer | null = null

    if (response.storagePath?.startsWith("b2://")) {
      try {
        buffer = await downloadFromB2StoragePath(response.storagePath)
      } catch (error) {
        logAudio("b2_download_failed", {
          id,
          ip,
          storagePath: response.storagePath,
          message: error instanceof Error ? error.message : String(error),
        })
        if (response.publicUrl) {
          buffer = await downloadFromPublicUrl(response.publicUrl)
          logAudio("public_url_fallback_used", { id, ip, publicUrl: response.publicUrl })
        }
      }
    } else if (response.storagePath) {
      buffer = await readFile(response.storagePath)
    }

    if (!buffer) {
      logAudio("missing_file", {
        id,
        ip,
        storagePath: response.storagePath,
        publicUrl: response.publicUrl,
      })
      return NextResponse.json({ error: "Audio file is unavailable." }, { status: 404 })
    }

    logAudio("served", {
      id,
      ip,
      storagePath: response.storagePath,
      size: buffer.byteLength,
      mimeType: response.mimeType || null,
    })
    return new NextResponse(Uint8Array.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": response.mimeType || "application/octet-stream",
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch (error) {
    logAudio("error", {
      id,
      ip,
      storagePath: response.storagePath,
      publicUrl: response.publicUrl,
      message: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "Audio file is unavailable." }, { status: 404 })
  }
}
