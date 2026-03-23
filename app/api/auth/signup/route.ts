import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createUser, toSafeUser } from "@/lib/server/auth-store"
import { issueSessionToken, setSessionCookie } from "@/lib/server/auth-session"
import { getCorsHeaders, hasAllowedApiOrigin } from "@/lib/server/cors"
import { applyRateLimit, getRequestClientIp } from "@/lib/server/rate-limit"

const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request, { methods: "POST, OPTIONS" })

  try {
    if (!hasAllowedApiOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: corsHeaders })
    }

    const json = await request.json()
    const parsed = signupSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid signup input", details: parsed.error.flatten() }, { status: 400, headers: corsHeaders })
    }

    const ip = getRequestClientIp(request.headers)
    const [ipRate, emailRate] = await Promise.all([
      applyRateLimit({
        key: `auth:signup:${ip}`,
        windowMs: 60_000,
        max: 5,
      }),
      applyRateLimit({
        key: `auth:signup-email:${parsed.data.email.toLowerCase()}`,
        windowMs: 60 * 60_000,
        max: 3,
      }),
    ])
    if (!ipRate.allowed || !emailRate.allowed) {
      const retryAfterSeconds = Math.max(ipRate.retryAfterSeconds, emailRate.retryAfterSeconds)
      return NextResponse.json(
        { error: "Too many signup attempts. Please retry shortly." },
        { status: 429, headers: { ...corsHeaders, "Retry-After": String(retryAfterSeconds) } },
      )
    }

    const user = await createUser({
      ...parsed.data,
      role: "admin",
    })
    const safeUser = toSafeUser(user)
    const token = issueSessionToken({
      userId: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    })

    const response = NextResponse.json({ success: true, user: safeUser }, { status: 201, headers: corsHeaders })
    setSessionCookie(response, token)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create account."
    const status = message.toLowerCase().includes("exists") ? 409 : 500
    return NextResponse.json({ error: message }, { status, headers: corsHeaders })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, { methods: "POST, OPTIONS" }),
  })
}
