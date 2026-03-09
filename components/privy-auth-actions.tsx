"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useIdentityToken, useLoginWithOAuth, usePrivy } from "@privy-io/react-auth"
import { sanitizeCallbackUrl } from "@/lib/auth/callback-url"
import { useAuth } from "@/lib/auth-context"

const PRIVY_ENABLED = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID)

export function PrivyAuthActions({
  callbackUrl = "/admin/dashboard/v4",
  mode = "login",
}: {
  callbackUrl?: string
  mode?: "login" | "signup"
}) {
  const router = useRouter()
  const { refreshSession } = useAuth()
  const { ready, authenticated } = usePrivy()
  const { identityToken } = useIdentityToken()
  const { initOAuth, loading } = useLoginWithOAuth()
  const [error, setError] = useState<string | null>(null)
  const isSyncingRef = useRef(false)
  const safeCallbackUrl = sanitizeCallbackUrl(callbackUrl)

  useEffect(() => {
    if (!PRIVY_ENABLED || !ready || !authenticated || !identityToken || isSyncingRef.current) return

    isSyncingRef.current = true
    void (async () => {
      try {
        const response = await fetch("/api/auth/privy/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ identityToken }),
        })
        if (!response.ok) {
          throw new Error("Failed to complete Privy sign-in.")
        }
        await refreshSession()
        router.push(safeCallbackUrl)
      } catch {
        setError("Privy sign-in failed. Please try again.")
      } finally {
        isSyncingRef.current = false
      }
    })()
  }, [authenticated, identityToken, ready, refreshSession, router, safeCallbackUrl])

  if (!PRIVY_ENABLED) return null

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          setError(null)
          void initOAuth({ provider: "google", disableSignup: mode === "login" ? false : false })
        }}
        disabled={loading}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[#dbcdb8] bg-[#fffdf8] px-4 text-sm font-medium text-[#1f1b17] hover:bg-[#f6ecdc] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Opening Google..." : "Continue with Google"}
      </button>
      <div className="relative py-1">
        <div className="border-t border-[#dbcdb8]" />
        <span className="font-body absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded bg-[#fffdf8] px-2 text-xs text-[#5c5146]">
          or use email
        </span>
      </div>
      {error ? <p className="font-body text-sm text-[#8a3d2b]">{error}</p> : null}
    </div>
  )
}

