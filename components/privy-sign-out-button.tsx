"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useLogout } from "@privy-io/react-auth"
import { useAuth } from "@/lib/auth-context"

export function PrivySignOutButton({
  redirectTo,
  children,
}: {
  redirectTo: string
  children: (input: { onClick: () => void }) => React.ReactNode
}) {
  const router = useRouter()
  const { signOut } = useAuth()
  const { logout } = useLogout()

  const handleClick = () => {
    void (async () => {
      await signOut()
      try {
        await logout()
      } catch {
        // Backend session is already cleared; route away regardless.
      }
      router.push(redirectTo)
    })()
  }

  return <>{children({ onClick: handleClick })}</>
}

