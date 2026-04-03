"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AdminMobileNav } from "@/components/admin-mobile-nav"
import { ArrowLeft, Bell, QrCode, SlidersHorizontal } from "lucide-react"
import { PocketActionStack, PocketSection, PocketShell } from "@/components/mobile/pocket-shell"
import { useIsMobile } from "@/components/ui/use-mobile"

export default function AdminSettingsPage() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <>
        <PocketShell
          eyebrow="Workspace"
          title="Settings"
          description="Use this mobile control room to steer the live feedback loop while fuller workspace settings continue to grow."
        >
          <PocketSection
            title="Loop controls"
            description="These are the settings-adjacent actions that matter most on mobile right now."
            className="bg-[#fff6ed]"
          >
            <PocketActionStack>
              <Link href="/admin/notifications">
                <Button className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]">
                  <Bell className="mr-2 size-4" aria-hidden="true" />
                  Manage alerts
                </Button>
              </Link>
              <Link href="/admin/share">
                <Button variant="outline" className="w-full border-[#dbcdb8] bg-[#f3ecdf]">
                  <QrCode className="mr-2 size-4" aria-hidden="true" />
                  Open share controls
                </Button>
              </Link>
              <Link href="/admin/dashboard/v4">
                <Button variant="outline" className="w-full border-[#dbcdb8] bg-[#f3ecdf]">
                  Return to Listen
                </Button>
              </Link>
            </PocketActionStack>
          </PocketSection>

          <PocketSection title="What lands here next" description="Workspace defaults, creator preferences, and deeper operational controls will live here as the mobile admin stack matures." className="mt-4">
            <ul className="space-y-2 text-sm text-[#5c5146]">
              <li className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf4] px-3 py-3">Notification defaults for every new release</li>
              <li className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf4] px-3 py-3">Workspace identity and contact preferences</li>
              <li className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf4] px-3 py-3">Operational safeguards and future team controls</li>
            </ul>
          </PocketSection>

          <PocketSection title="Why this page stays light" description="Settings should support the live loop, not interrupt it. That is why the core mobile actions are linked directly above." className="mt-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--af-color-primary)]">
              <SlidersHorizontal className="size-4 text-[#8a431f]" aria-hidden="true" />
              Built to guide, not bury, the current mobile workflow
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
        <p className="font-body text-sm text-[#5c5146]">Workspace</p>
        <h1 className="mt-1 text-3xl font-semibold text-balance">Settings</h1>
        <div className="mt-4 rounded-xl border border-[#dbcdb8] bg-[#fff6ed] p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-[#8a431f]" aria-hidden="true" />
            Settings are intentionally light right now
          </p>
          <p className="font-body mt-2 text-sm text-[#5c5146]">
            Use Listen and Alerts for the active creator loop while deeper workspace settings are still being built.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/admin/notifications">
            <Button className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]">Manage alerts</Button>
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
