import { NextResponse } from "next/server"
import { z } from "zod"
import { createUser, toSafeUser } from "@/lib/server/auth-store"
import { issueSessionToken, setSessionCookie } from "@/lib/server/auth-session"
import { applyRateLimit, getRequestClientIp } from "@/lib/server/rate-limit"

const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export async function POST(request: Request) {
  try {
    const ip = getRequestClientIp(request.headers)
    const rate = applyRateLimit({
      key: `auth:signup:${ip}`,
      windowMs: 60_000,
      max: 5,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please retry shortly." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      )
    }

    const json = await request.json()
    const parsed = signupSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid signup input", details: parsed.error.flatten() }, { status: 400 })
    }

    const user = await createUser(parsed.data)
    const safeUser = toSafeUser(user)
    const token = issueSessionToken({
      userId: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    })

    const response = NextResponse.json({ success: true, user: safeUser }, { status: 201 })
    setSessionCookie(response, token)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create account."
    const status = message.toLowerCase().includes("exists") ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
