"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

type User = {
  id: string
  name: string
  email: string
  role: string
}

type AuthContextType = {
  user: User | null
  status: "loading" | "authenticated" | "unauthenticated"
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (input: { name: string; email: string; password: string }) => Promise<{ ok: boolean; error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  status: "loading",
  signIn: async () => false,
  signUp: async () => ({ ok: false, error: "Unavailable" }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")

  const refreshSession = async () => {
    try {
      const response = await fetch("/api/auth/session", { method: "GET", credentials: "include" })
      const data = await response.json()
      if (!response.ok || !data?.authenticated) {
        setUser(null)
        setStatus("unauthenticated")
        return
      }
      setUser(data.user as User)
      setStatus("authenticated")
    } catch {
      setUser(null)
      setStatus("unauthenticated")
    }
  }

  useEffect(() => {
    refreshSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      })
      if (!response.ok) return false
      const data = (await response.json()) as { success?: boolean; user?: User }
      if (!data.success || !data.user) return false
      setUser(data.user)
      setStatus("authenticated")
      return true
    } catch {
      return false
    }
  }

  const signUp = async (input: { name: string; email: string; password: string }) => {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      })
      const data = (await response.json()) as { success?: boolean; user?: User; error?: string }
      if (!response.ok) {
        return { ok: false, error: data?.error || "Failed to create account" }
      }
      if (!data.success || !data.user) {
        return { ok: false, error: "Failed to create account" }
      }
      setUser(data.user)
      setStatus("authenticated")
      return { ok: true }
    } catch {
      return { ok: false, error: "Failed to create account" }
    }
  }

  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
    } finally {
      setUser(null)
      setStatus("unauthenticated")
    }
  }

  return <AuthContext.Provider value={{ user, status, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export function useRequireAuth(redirectTo = "/login") {
  const { user, status } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated") {
      router.push(redirectTo)
    }
  }, [status, router, redirectTo])

  return { user, status }
}

export function useRequireAdmin(redirectTo = "/") {
  const { user, status } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
  }, [user, status, router, redirectTo])

  return { user, status }
}
