import { NextRequest, NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getStoredResponseById } from "@/lib/server/response-store"
import { getSurveyById } from "@/lib/server/survey-store"
import { downloadFromB2StoragePath } from "@/lib/server/b2-storage"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const response = await getStoredResponseById(id)
  if (!response) {
    return NextResponse.json({ error: "Response not found." }, { status: 404 })
  }
  const survey = await getSurveyById(response.surveyId)
  if (!survey || survey.createdBy !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const buffer =
      (response.storagePath.startsWith("b2://")
        ? await downloadFromB2StoragePath(response.storagePath)
        : await readFile(response.storagePath)) ?? null
    if (!buffer) {
      return NextResponse.json({ error: "Audio file is unavailable." }, { status: 404 })
    }
    return new NextResponse(buffer, {
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
