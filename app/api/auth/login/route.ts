import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { toSafeUser, verifyUserPassword } from "@/lib/server/auth-store"
import { issueSessionToken, setSessionCookie } from "@/lib/server/auth-session"
import { getCorsHeaders, hasAllowedApiOrigin } from "@/lib/server/cors"
import { applyRateLimit, getRequestClientIp } from "@/lib/server/rate-limit"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request, { methods: "POST, OPTIONS" })

  try {
    if (!hasAllowedApiOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: corsHeaders })
    }

    const json = await request.json()
    const parsed = loginSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid login input", details: parsed.error.flatten() }, { status: 400, headers: corsHeaders })
    }

    const ip = getRequestClientIp(request.headers)
    const [ipRate, emailRate] = await Promise.all([
      applyRateLimit({
        key: `auth:login:${ip}`,
        windowMs: 60_000,
        max: 10,
      }),
      applyRateLimit({
        key: `auth:login-email:${parsed.data.email.toLowerCase()}`,
        windowMs: 10 * 60_000,
        max: 8,
      }),
    ])
    if (!ipRate.allowed || !emailRate.allowed) {
      const retryAfterSeconds = Math.max(ipRate.retryAfterSeconds, emailRate.retryAfterSeconds)
      return NextResponse.json(
        { error: "Too many login attempts. Please retry shortly." },
        { status: 429, headers: { ...corsHeaders, "Retry-After": String(retryAfterSeconds) } },
      )
    }

    const user = await verifyUserPassword(parsed.data.email, parsed.data.password)
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401, headers: corsHeaders })
    }

    const safeUser = toSafeUser(user)
    const token = issueSessionToken({
      userId: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    })

    const response = NextResponse.json({ success: true, user: safeUser }, { headers: corsHeaders })
    setSessionCookie(response, token)
    return response
  } catch {
    return NextResponse.json({ error: "Failed to sign in." }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, { methods: "POST, OPTIONS" }),
  })
}
