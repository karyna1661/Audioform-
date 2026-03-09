import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { verifyIdentityToken } from "@privy-io/node"
import type { User as PrivyUser, LinkedAccount } from "@privy-io/node"
import { createUser, findUserByEmail, toSafeUser } from "@/lib/server/auth-store"
import { issueSessionToken, setSessionCookie } from "@/lib/server/auth-session"

function requirePrivyConfig(): { appId: string; verificationKey: string } {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  const verificationKey = process.env.PRIVY_VERIFICATION_KEY
  if (!appId || !verificationKey) {
    throw new Error("Missing Privy configuration.")
  }
  return { appId, verificationKey }
}

function firstMatchingAccount<T extends LinkedAccount["type"]>(
  user: PrivyUser,
  type: T,
): Extract<LinkedAccount, { type: T }> | null {
  const match = user.linked_accounts.find((account) => account.type === type)
  return (match as Extract<LinkedAccount, { type: T }> | undefined) || null
}

function resolveIdentity(user: PrivyUser): { email: string; name: string } {
  const google = firstMatchingAccount(user, "google_oauth")
  if (google?.email) {
    return {
      email: google.email.trim().toLowerCase(),
      name: google.name?.trim() || google.email.split("@")[0] || "User",
    }
  }

  const emailAccount = firstMatchingAccount(user, "email")
  if (emailAccount?.address) {
    return {
      email: emailAccount.address.trim().toLowerCase(),
      name: emailAccount.address.split("@")[0] || "User",
    }
  }

  const farcaster = firstMatchingAccount(user, "farcaster")
  if (farcaster) {
    const handle = farcaster.username?.trim() || `farcaster-${farcaster.fid}`
    return {
      email: `${handle.toLowerCase()}-${user.id.toLowerCase()}@privy.audioform.local`,
      name: farcaster.display_name?.trim() || handle,
    }
  }

  return {
    email: `privy-${user.id.toLowerCase()}@privy.audioform.local`,
    name: "Privy User",
  }
}

export async function POST(request: Request) {
  try {
    const { identityToken } = (await request.json()) as { identityToken?: string }
    if (!identityToken) {
      return NextResponse.json({ error: "Missing identity token." }, { status: 400 })
    }

    const { appId, verificationKey } = requirePrivyConfig()
    const privyUser = await verifyIdentityToken({
      identity_token: identityToken,
      app_id: appId,
      verification_key: verificationKey,
    })

    const identity = resolveIdentity(privyUser)
    let user = await findUserByEmail(identity.email)
    if (!user) {
      user = await createUser({
        name: identity.name.slice(0, 80),
        email: identity.email,
        password: randomBytes(32).toString("hex"),
      })
    }

    const safeUser = toSafeUser(user)
    const sessionToken = issueSessionToken({
      userId: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    })

    const response = NextResponse.json({ success: true, user: safeUser })
    setSessionCookie(response, sessionToken)
    return response
  } catch (error) {
    console.error("Privy session exchange failed:", error)
    return NextResponse.json({ error: "Failed to create session from Privy." }, { status: 401 })
  }
}
