import { type NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/server/auth-session"
import { getCorsHeaders, hasAllowedApiOrigin } from "@/lib/server/cors"
import { aggregateAndStoreReleaseInsight } from "@/lib/server/release-insight-engine"
import { getSurveyByIdForCreator } from "@/lib/server/survey-store"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const corsHeaders = getCorsHeaders(request, { methods: "GET, POST, OPTIONS" })
  try {
    const session = await getSessionFromRequest()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
    }
    if (!hasAllowedApiOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: corsHeaders })
    }

    const { id } = await context.params
    const survey = await getSurveyByIdForCreator(id, session.sub)
    if (!survey) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404, headers: corsHeaders })
    }

    const releaseInsight = await aggregateAndStoreReleaseInsight(id)
    return NextResponse.json({ releaseInsight }, { headers: corsHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to refresh release insight."
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, { methods: "GET, POST, OPTIONS" }),
  })
}

