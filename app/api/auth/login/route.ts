import { NextResponse } from "next/server"
import { z } from "zod"
import { toSafeUser, verifyUserPassword } from "@/lib/server/auth-store"
import { issueSessionToken, setSessionCookie } from "@/lib/server/auth-session"
import { applyRateLimit, getRequestClientIp } from "@/lib/server/rate-limit"
import { hasTrustedOrigin } from "@/lib/server/request-guards"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  try {
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

    const ip = getRequestClientIp(request.headers)
    const rate = applyRateLimit({
      key: `auth:login:${ip}`,
      windowMs: 60_000,
      max: 10,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please retry shortly." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      )
    }

    const json = await request.json()
    const parsed = loginSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid login input", details: parsed.error.flatten() }, { status: 400 })
    }

    const user = await verifyUserPassword(parsed.data.email, parsed.data.password)
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const safeUser = toSafeUser(user)
    const token = issueSessionToken({
      userId: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    })

    const response = NextResponse.json({ success: true, user: safeUser })
    setSessionCookie(response, token)
    return response
  } catch {
    return NextResponse.json({ error: "Failed to sign in." }, { status: 500 })
  }
}
