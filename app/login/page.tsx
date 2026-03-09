"use client"

import type React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { AlertCircle, Eye, EyeOff, Headphones, Loader2, ShieldCheck } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { sanitizeCallbackUrl } from "@/lib/auth/callback-url"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PrivyAuthActions } from "@/components/privy-auth-actions"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedCallbackUrl = searchParams.get("callbackUrl")
  const callbackUrl = sanitizeCallbackUrl(requestedCallbackUrl)
  const { signIn, status } = useAuth()
  const hasPrivy = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const errorId = error ? "login-form-error" : undefined

  useEffect(() => {
    if (status === "authenticated") {
      router.push(callbackUrl)
    }
  }, [status, router, callbackUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const success = await signIn(email, password)
      if (!success) {
        setError("Invalid email or password")
        setIsLoading(false)
        return
      }
      router.push(callbackUrl)
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <main className="af-shell min-h-dvh p-4 sm:p-6">
      <section className="af-panel af-fade-up mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border lg:grid-cols-[1.15fr_1fr]">
        <aside className="af-accent-card border-b border-[#dbcdb8] p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-[#dbcdb8] bg-[#f9f4ea] px-4 py-2 text-sm text-[#5c5146] hover:bg-[#f3ecdf]"
          >
            Home
          </Link>
          <p className="font-body mt-4 text-sm text-[#5c5146] text-pretty">AudioForm Access</p>
          <h1 className="mt-2 text-4xl font-semibold text-balance">Sign in to your signal inbox</h1>
          <p className="font-body mt-4 text-base text-[#5c5146] text-pretty">
            Review responses, find signal, and decide your next build step.
          </p>

          <div className="mt-6 space-y-3">
            <FeatureRow icon={<Headphones className="size-4 text-[#8a431f]" aria-hidden="true" />} text="Hear what users felt, not just what they typed." />
            <FeatureRow icon={<ShieldCheck className="size-4 text-[#8a431f]" aria-hidden="true" />} text="Creator and respondent flows stay separated." />
          </div>

          <div className="mt-8 rounded-xl border border-[#dbcdb8] bg-[#f9f4ea] p-4">
            <p className="text-sm font-semibold">Need access?</p>
            <p className="font-body mt-1 text-sm text-[#5c5146] text-pretty">
              Create an account to start running voice surveys and reviewing high-signal responses.
            </p>
          </div>
        </aside>

        <section className="p-6 sm:p-8">
          <div className="max-w-md pt-10 sm:pt-12 lg:pt-20">
            <h2 className="text-3xl font-semibold text-balance">Welcome back</h2>
            <p className="font-body mt-2 text-[#5c5146] text-pretty">Enter your details to reopen your signal loop.</p>

            {error && (
              <Alert variant="destructive" className="mt-4" aria-live="assertive" id={errorId}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {hasPrivy ? <PrivyAuthActions callbackUrl={callbackUrl} mode="login" /> : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={errorId}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="font-body text-sm text-[#8a431f] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!error}
                    aria-describedby={errorId}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#5c5146] hover:bg-[#f3ecdf]"
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Opening workspace
                  </>
                ) : (
                  "Enter workspace"
                )}
              </Button>
            </form>

            <article className="mt-5 rounded-xl border border-[#dbcdb8] bg-[#f9f4ea] p-3">
              <p className="text-sm font-semibold text-balance">Resume your loop</p>
              <ol className="font-body mt-2 space-y-1 text-sm text-[#5c5146] text-pretty">
                <li>1. Open your active survey draft.</li>
                <li>2. Publish or share the link.</li>
                <li>3. Replay strongest responses in Signal Inbox.</li>
              </ol>
            </article>

            <p className="font-body mt-6 text-sm text-[#5c5146]">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-[#8a431f] hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </section>
      </section>
    </main>
  )
}

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#dbcdb8] bg-[#f9f4ea] p-3">
      <span className="mt-0.5">{icon}</span>
      <p className="text-sm text-[#5c5146] text-pretty">{text}</p>
    </div>
  )
}
