import { randomUUID } from "node:crypto"
import { cookies } from "next/headers"
import type { NextResponse } from "next/server"

export const ANON_SESSION_COOKIE_NAME = "audioform_anon_session"

export async function getOrCreateAnonSessionId(): Promise<string> {
  const store = await cookies()
  const existing = store.get(ANON_SESSION_COOKIE_NAME)?.value
  if (existing && existing.trim()) return existing
  return randomUUID()
}

export function setAnonSessionCookie(response: NextResponse, sessionId: string): void {
  response.cookies.set({
    name: ANON_SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

export async function getAnonSessionIdFromRequest(): Promise<string | null> {
  const store = await cookies()
  const value = store.get(ANON_SESSION_COOKIE_NAME)?.value
  return value && value.trim() ? value : null
}

