"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AdminMobileNav } from "@/components/admin-mobile-nav"
import { ArrowLeft, LayoutGrid, QrCode, UserCircle2 } from "lucide-react"
import { PocketActionStack, PocketSection, PocketShell } from "@/components/mobile/pocket-shell"
import { useIsMobile } from "@/components/ui/use-mobile"

export default function AdminProfilePage() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <>
        <PocketShell
          eyebrow="Account"
          title="Profile"
          description="This mobile account surface now acts as your creator orientation point while deeper identity controls are still being built."
        >
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-[1.15rem] border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a6146]">Listen</p>
              <p className="mt-1 text-base font-semibold text-[var(--af-color-primary)]">Fast</p>
              <p className="mt-1 text-[11px] leading-4 text-[#665746]">return path</p>
            </div>
            <div className="rounded-[1.15rem] border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a6146]">Share</p>
              <p className="mt-1 text-base font-semibold text-[var(--af-color-primary)]">Near</p>
              <p className="mt-1 text-[11px] leading-4 text-[#665746]">handoff tools</p>
            </div>
            <div className="rounded-[1.15rem] border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a6146]">Role</p>
              <p className="mt-1 text-base font-semibold text-[var(--af-color-primary)]">Launch</p>
              <p className="mt-1 text-[11px] leading-4 text-[#665746]">orientation point</p>
            </div>
          </div>

          <PocketSection title="Profile posture" description="On mobile this page should orient you, then get out of the way." className="mb-4 bg-[#fff8f0]">
            <div className="af-mobile-rail">
              {[
                "Use profile as a clean re-entry point into Listen, Share, and release review.",
                "Keep identity controls light until the operational loop is fully hardened across mobile.",
              ].map((line) => (
                <div key={line} className="af-mobile-rail-card rounded-[1.1rem] border border-[#dbcdb8] bg-[#fffdf8] p-3.5 text-sm leading-6 text-[#5c5146]">{line}</div>
              ))}
            </div>
          </PocketSection>

          <PocketSection title="Creator quick start" description="Jump into the core mobile loop from here without hunting through admin menus." className="bg-[#fff6ed]">
            <PocketActionStack>
              <Link href="/admin/dashboard/v4">
                <Button className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]">
                  <LayoutGrid className="mr-2 size-4" aria-hidden="true" />
                  Open Listen
                </Button>
              </Link>
              <Link href="/admin/share">
                <Button variant="outline" className="w-full border-[#dbcdb8] bg-[#f3ecdf]">
                  <QrCode className="mr-2 size-4" aria-hidden="true" />
                  Go to share hub
                </Button>
              </Link>
              <Link href="/admin/responses">
                <Button variant="outline" className="w-full border-[#dbcdb8] bg-[#f3ecdf]">
                  Review release tracks
                </Button>
              </Link>
            </PocketActionStack>
          </PocketSection>

          <PocketSection title="Account snapshot" description="This page now sets expectations for the role profile will play in the mobile product." className="mt-4">
            <ul className="space-y-2 text-sm text-[#5c5146]">
              <li className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf4] px-3 py-3">Identity details and profile metadata</li>
              <li className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf4] px-3 py-3">Creator-facing preferences and future workspace ownership controls</li>
              <li className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf4] px-3 py-3">A stable place for account-level settings once the builder loop is fully hardened</li>
            </ul>
          </PocketSection>

          <PocketSection title="Current role" description="Until those deeper controls land, this page should help creators orient themselves, then move quickly into action." className="mt-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--af-color-primary)]">
              <UserCircle2 className="size-4 text-[#8a431f]" aria-hidden="true" />
              Mobile profile now works as a creator launch point
            </p>
          </PocketSection>
        </PocketShell>
        <AdminMobileNav />
      </>
    )
  }

  return (
    <main className="min-h-dvh bg-[#f3ecdf] p-4 pb-28 sm:p-6 sm:pb-6">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-[#dbcdb8] bg-[#f9f4ea] p-6">
        <p className="font-body text-sm text-[#5c5146]">Account</p>
        <h1 className="mt-1 text-3xl font-semibold text-balance">Profile</h1>
        <div className="mt-4 rounded-xl border border-[#dbcdb8] bg-[#fff6ed] p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <UserCircle2 className="size-4 text-[#8a431f]" aria-hidden="true" />
            Profile management is still lightweight
          </p>
          <p className="font-body mt-2 text-sm text-[#5c5146]">
            Use Listen and Studio for the active creator loop while profile-specific account controls are still being expanded.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/admin/dashboard/v4">
            <Button className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]">Open Listen</Button>
          </Link>
          <Link href="/admin/dashboard/v4">
            <Button variant="outline" className="border-[#dbcdb8] bg-[#f3ecdf]">
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              Back to Listen
            </Button>
          </Link>
        </div>
      </section>
      <AdminMobileNav />
    </main>
  )
}
