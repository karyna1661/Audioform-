"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

// Mock user data
const USERS = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@example.com",
    password: "password123",
    role: "admin",
  },
  {
    id: "2",
    name: "Test User",
    email: "user@example.com",
    password: "password123",
    role: "user",
  },
]

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
  signOut: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  status: "loading",
  signIn: async () => false,
  signOut: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem("audioform_user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
      setStatus("authenticated")
    } else {
      setStatus("unauthenticated")
    }
  }, [])

  const signIn = async (email: string, password: string): Promise<boolean> => {
    // Find user with matching email and password
    const matchedUser = USERS.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password)

    if (matchedUser) {
      // Create user object without password
      const { password: _, ...userWithoutPassword } = matchedUser

      // Store in state and localStorage
      setUser(userWithoutPassword)
      setStatus("authenticated")
      localStorage.setItem("audioform_user", JSON.stringify(userWithoutPassword))
      return true
    }

    return false
  }

  const signOut = () => {
    setUser(null)
    setStatus("unauthenticated")
    localStorage.removeItem("audioform_user")
  }

  return <AuthContext.Provider value={{ user, status, signIn, signOut }}>{children}</AuthContext.Provider>
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

    if (user?.role !== "admin") {
      router.push(redirectTo)
    }
  }, [user, status, router, redirectTo])

  return { user, status }
}
