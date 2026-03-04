import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import type { NextResponse } from "next/server"

export const AUTH_COOKIE_NAME = "audioform_session"

type SessionPayload = {
  sub: string
  email: string
  role: "admin" | "user"
  iat: number
  exp: number
}

function requireSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET
  if (!secret && process.env.NODE_ENV !== "production") {
    return "dev-insecure-secret-change-me"
  }
  if (!secret) {
    throw new Error("Missing AUTH_SESSION_SECRET. Set it in environment variables.")
  }
  return secret
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(padded, "base64").toString("utf8")
}

function sign(payloadBase64: string): string {
  const secret = requireSecret()
  return createHmac("sha256", secret).update(payloadBase64).digest("base64url")
}

export function issueSessionToken(input: { userId: string; email: string; role: "admin" | "user" }): string {
  const now = Math.floor(Date.now() / 1000)
  const ttlSeconds = Number(process.env.AUTH_SESSION_TTL_SECONDS || 60 * 60 * 24 * 7)
  const payload: SessionPayload = {
    sub: input.userId,
    email: input.email,
    role: input.role,
    iat: now,
    exp: now + ttlSeconds,
  }
  const payloadB64 = base64UrlEncode(JSON.stringify(payload))
  const signature = sign(payloadB64)
  return `${payloadB64}.${signature}`
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [payloadB64, signature] = token.split(".")
  if (!payloadB64 || !signature) return null
  const expected = sign(payloadB64)
  const sigA = Buffer.from(signature)
  const sigB = Buffer.from(expected)
  if (sigA.length !== sigB.length) return null
  if (!timingSafeEqual(sigA, sigB)) return null

  try {
    const parsed = JSON.parse(base64UrlDecode(payloadB64)) as SessionPayload
    const now = Math.floor(Date.now() / 1000)
    if (!parsed?.sub || !parsed?.email || !parsed?.role || parsed.exp <= now) return null
    return parsed
  } catch {
    return null
  }
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Number(process.env.AUTH_SESSION_TTL_SECONDS || 60 * 60 * 24 * 7),
  })
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}

export async function getSessionFromRequest(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}
