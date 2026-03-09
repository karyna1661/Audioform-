import { NextResponse } from "next/server"
import { clearSessionCookie } from "@/lib/server/auth-session"
import { hasTrustedOrigin } from "@/lib/server/request-guards"

export async function POST(request: Request) {
  if (
    !hasTrustedOrigin({
      requestOrigin: request.headers.get("origin"),
      requestReferer: request.headers.get("referer"),
      requestUrl: request.url,
      configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    })
  ) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
  }

  const response = NextResponse.json({ success: true })
  clearSessionCookie(response)
  return response
}
