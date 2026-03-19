import { NextRequest, NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getAnonSessionIdFromRequest } from "@/lib/server/anon-session"
import { getStoredResponseById, getStoredResponseByIdForSurveyIds } from "@/lib/server/response-store"
import { listSurveys } from "@/lib/server/survey-store"
import { downloadFromB2StoragePath } from "@/lib/server/b2-storage"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const session = await getSessionFromRequest()
  const anonSessionId = await getAnonSessionIdFromRequest()

  // Access rules:
  // - Authenticated: must own the survey that the response belongs to
  // - Anonymous: must have matching anon session_id cookie
  const response =
    session?.sub
      ? await getStoredResponseByIdForSurveyIds(id, (await listSurveys({ createdBy: session.sub })).map((s) => s.id))
      : await getStoredResponseById(id)

  if (!response || response.status !== "uploaded") {
    return NextResponse.json({ error: "Response not found." }, { status: 404 })
  }

  if (!session?.sub) {
    if (!anonSessionId || anonSessionId !== response.sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const buffer =
      (response.storagePath?.startsWith("b2://")
        ? await downloadFromB2StoragePath(response.storagePath)
        : response.storagePath
          ? await readFile(response.storagePath)
          : null) ?? null
    if (!buffer) {
      return NextResponse.json({ error: "Audio file is unavailable." }, { status: 404 })
    }
    return new NextResponse(Uint8Array.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": response.mimeType || "application/octet-stream",
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch {
    return NextResponse.json({ error: "Audio file is unavailable." }, { status: 404 })
  }
}
