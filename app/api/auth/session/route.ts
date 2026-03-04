import { NextResponse } from "next/server"
import { findUserById, toSafeUser } from "@/lib/server/auth-store"
import { getSessionFromRequest } from "@/lib/server/auth-session"

export async function GET() {
  try {
    const session = await getSessionFromRequest()
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 200 })
    }

    const user = await findUserById(session.sub)
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 200 })
    }

    return NextResponse.json({
      authenticated: true,
      user: toSafeUser(user),
    })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
}
