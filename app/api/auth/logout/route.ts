import { NextResponse, type NextRequest } from "next/server"
import { clearSessionCookie } from "@/lib/server/auth-session"
import { getCorsHeaders, hasAllowedApiOrigin } from "@/lib/server/cors"

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request, { methods: "POST, OPTIONS" })

  if (!hasAllowedApiOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: corsHeaders })
  }

  const response = NextResponse.json({ success: true }, { headers: corsHeaders })
  clearSessionCookie(response)
  return response
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, { methods: "POST, OPTIONS" }),
  })
}
