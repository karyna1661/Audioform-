import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { sanitizeCallbackUrl } from "@/lib/auth/callback-url"
import { resolveExpectedOrigin } from "@/lib/server/request-guards"

const OAUTH_STATE_COOKIE = "audioform_google_oauth_state"
const OAUTH_CALLBACK_COOKIE = "audioform_google_oauth_callback"

function requireGoogleClientId(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error("Missing GOOGLE_CLIENT_ID.")
  }
  return clientId
}

function resolveAppOrigin(request: Request): string {
  return resolveExpectedOrigin({
    requestUrl: request.url,
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
  })
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const callbackUrl = sanitizeCallbackUrl(url.searchParams.get("callbackUrl"))
    const state = randomBytes(24).toString("hex")
    const clientId = requireGoogleClientId()
    const appOrigin = resolveAppOrigin(request)
    const redirectUri = `${appOrigin}/api/auth/google/callback`

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", "openid email profile")
    authUrl.searchParams.set("state", state)
    authUrl.searchParams.set("prompt", "select_account")

    const response = NextResponse.redirect(authUrl)
    const isProd = process.env.NODE_ENV === "production"
    response.cookies.set({
      name: OAUTH_STATE_COOKIE,
      value: state,
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 60 * 10,
    })
    response.cookies.set({
      name: OAUTH_CALLBACK_COOKIE,
      value: encodeURIComponent(callbackUrl),
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 60 * 10,
    })
    return response
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_oauth_not_configured", request.url))
  }
}
