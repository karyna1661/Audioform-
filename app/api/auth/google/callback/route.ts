import { randomBytes } from "node:crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { sanitizeCallbackUrl } from "@/lib/auth/callback-url"
import { hasMatchingState, resolveExpectedOrigin } from "@/lib/server/request-guards"
import { issueSessionToken, setSessionCookie } from "@/lib/server/auth-session"
import { createUser, findUserByEmail, toSafeUser } from "@/lib/server/auth-store"

const OAUTH_STATE_COOKIE = "audioform_google_oauth_state"
const OAUTH_CALLBACK_COOKIE = "audioform_google_oauth_callback"

type GoogleTokenResponse = {
  access_token?: string
  token_type?: string
}

type GoogleUserInfo = {
  email?: string
  email_verified?: boolean
  name?: string
}

function resolveAppOrigin(request: Request): string {
  return resolveExpectedOrigin({
    requestUrl: request.url,
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
  })
}

function requireGoogleConfig(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth configuration.")
  }
  return { clientId, clientSecret }
}

function buildLoginErrorRedirect(request: Request, code: string): NextResponse {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(code)}`, request.url))
}

async function exchangeCodeForToken(input: {
  request: Request
  code: string
  clientId: string
  clientSecret: string
}): Promise<string | null> {
  const appOrigin = resolveAppOrigin(input.request)
  const redirectUri = `${appOrigin}/api/auth/google/callback`

  const body = new URLSearchParams({
    code: input.code,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  })
  if (!tokenRes.ok) return null
  const tokenJson = (await tokenRes.json()) as GoogleTokenResponse
  if (!tokenJson.access_token || tokenJson.token_type?.toLowerCase() !== "bearer") return null
  return tokenJson.access_token
}

async function fetchGoogleUser(accessToken: string): Promise<GoogleUserInfo | null> {
  const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  if (!userRes.ok) return null
  return (await userRes.json()) as GoogleUserInfo
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const oauthError = requestUrl.searchParams.get("error")
  const code = requestUrl.searchParams.get("code")
  const state = requestUrl.searchParams.get("state")
  const cookieStore = await cookies()
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value
  const rawCallback = cookieStore.get(OAUTH_CALLBACK_COOKIE)?.value
  let callbackUrl = sanitizeCallbackUrl(null)
  try {
    callbackUrl = sanitizeCallbackUrl(rawCallback ? decodeURIComponent(rawCallback) : null)
  } catch {
    callbackUrl = sanitizeCallbackUrl(null)
  }

  const clearAndReturn = (response: NextResponse): NextResponse => {
    response.cookies.set({
      name: OAUTH_STATE_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    })
    response.cookies.set({
      name: OAUTH_CALLBACK_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    })
    return response
  }

  if (oauthError) {
    return clearAndReturn(buildLoginErrorRedirect(request, "google_oauth_denied"))
  }
  if (!code || !state || !hasMatchingState(expectedState || "", state)) {
    return clearAndReturn(buildLoginErrorRedirect(request, "google_oauth_state_invalid"))
  }

  try {
    const { clientId, clientSecret } = requireGoogleConfig()
    const accessToken = await exchangeCodeForToken({ request, code, clientId, clientSecret })
    if (!accessToken) {
      return clearAndReturn(buildLoginErrorRedirect(request, "google_oauth_token_exchange_failed"))
    }

    const googleUser = await fetchGoogleUser(accessToken)
    const email = googleUser?.email?.trim().toLowerCase()
    if (!email || googleUser?.email_verified !== true) {
      return clearAndReturn(buildLoginErrorRedirect(request, "google_email_not_verified"))
    }

    let user = await findUserByEmail(email)
    if (!user) {
      const derivedName = googleUser?.name?.trim() || email.split("@")[0] || "User"
      const generatedPassword = randomBytes(32).toString("hex")
      user = await createUser({
        name: derivedName.slice(0, 80),
        email,
        password: generatedPassword,
      })
    }

    const safeUser = toSafeUser(user)
    const token = issueSessionToken({
      userId: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    })

    const response = NextResponse.redirect(new URL(callbackUrl, request.url))
    setSessionCookie(response, token)
    return clearAndReturn(response)
  } catch {
    return clearAndReturn(buildLoginErrorRedirect(request, "google_oauth_failed"))
  }
}
