"use client"

import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Mic, Users } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useIsMobile } from "@/components/ui/use-mobile"
import { PocketSection, PocketShell } from "@/components/mobile/pocket-shell"

export default function SignupPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { signUp, status } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const errorId = error ? "signup-form-error" : undefined

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/admin/dashboard/v4")
    }
  }, [status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await signUp({ name, email, password })
      if (!result.ok) {
        setError(result.error || "Unable to create account.")
        setIsLoading(false)
        return
      }
      router.push("/admin/dashboard/v4")
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  if (isMobile) {
    return (
      <PocketShell
        eyebrow="Audioform access"
        title="Start in Studio, grow in Listen."
        description="Create your workspace, shape one release in Studio, then hear the strongest takes in Listen."
      >
        <PocketSection title="Create your creator account" description="Set up your workspace and launch your first release.">
          {error && (
            <Alert variant="destructive" className="mb-4" aria-live="assertive" id={errorId}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={errorId}
                required
              />
            </div>
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
              <Label htmlFor="password">Password</Label>
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
              <p className="font-body text-xs text-[#5c5146] text-pretty">Use at least 8 characters.</p>
            </div>

            <Button type="submit" className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Creating workspace
                </>
              ) : (
                "Create workspace"
              )}
            </Button>
          </form>
        </PocketSection>

        <PocketSection title="What happens next" description="The first creator loop should stay simple." className="mt-4 bg-[#fff6ed]">
          <ol className="font-body space-y-1 text-sm text-[#5c5146] text-pretty">
            <li>1. Define one product decision.</li>
            <li>2. Shape the prompt flow in Studio.</li>
            <li>3. Publish the release and hear first takes in Listen.</li>
          </ol>
        </PocketSection>

        <p className="font-body mt-5 text-center text-sm text-[#5c5146] text-pretty">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#8a431f] hover:underline">
            Log in
          </Link>
        </p>
      </PocketShell>
    )
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
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight text-balance sm:text-6xl">
            Start your <span className="whitespace-nowrap">Studio + Listen</span> loop
          </h1>
          <p className="font-body mt-4 text-base text-[#5c5146] text-pretty">
            Create a workspace, shape better prompts in Studio, and hear ranked takes in Listen when responses start flowing.
          </p>

          <div className="mt-6 space-y-3">
            <InfoTile icon={<Mic className="size-4 text-[#8a431f]" aria-hidden="true" />} title="Shape stronger prompts" text="Use Studio to frame the one decision you need real signal on." />
            <InfoTile icon={<Users className="size-4 text-[#8a431f]" aria-hidden="true" />} title="Hear ranked takes" text="Use Listen to hear conviction and hesitation before you open a transcript." />
            <InfoTile icon={<CheckCircle2 className="size-4 text-[#8a431f]" aria-hidden="true" />} title="Fast first run" text="Go from signup to first release, then start listening as responses arrive." />
          </div>
        </aside>

        <section className="p-6 sm:p-8">
          <div className="max-w-md pt-8 sm:pt-10 lg:pt-14">
            <h2 className="text-3xl font-semibold text-balance">Create your creator account</h2>
            <p className="font-body mt-2 text-[#5c5146] text-pretty">Create your account, open Studio, and launch your first release.</p>

            {error && (
              <Alert variant="destructive" className="mt-4" aria-live="assertive" id={errorId}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="mt-10 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={errorId}
                  required
                />
              </div>
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
                <Label htmlFor="password">Password</Label>
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
                <p className="font-body text-xs text-[#5c5146] text-pretty">Use at least 8 characters.</p>
              </div>

              <Button type="submit" className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Creating workspace
                  </>
                ) : (
                  "Create workspace"
                )}
              </Button>
            </form>

            <article className="mt-5 rounded-xl border border-[#dbcdb8] bg-[#f9f4ea] p-3">
              <p className="text-sm font-semibold text-balance">What happens next</p>
              <ol className="font-body mt-2 space-y-1 text-sm text-[#5c5146] text-pretty">
                <li>1. Define one product decision.</li>
                <li>2. Shape the prompt flow in Studio.</li>
                <li>3. Publish the release and hear first takes in Listen.</li>
              </ol>
            </article>

            <p className="font-body mt-6 text-sm text-[#5c5146] text-pretty">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[#8a431f] hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </section>
      </section>
    </main>
  )
}

function InfoTile({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div className="rounded-xl border border-[#dbcdb8] bg-[#f9f4ea] p-3">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-1 text-sm text-[#5c5146] text-pretty">{text}</p>
    </div>
  )
}
