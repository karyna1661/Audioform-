"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AdminMobileNav } from "@/components/admin-mobile-nav"
import { ArrowLeft, LifeBuoy, Mail, Mic, QrCode } from "lucide-react"
import { PocketActionStack, PocketSection, PocketShell } from "@/components/mobile/pocket-shell"
import { useIsMobile } from "@/components/ui/use-mobile"

export default function AdminHelpPage() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <>
        <PocketShell
          eyebrow="Support"
          title="Help center"
          description="This mobile help surface now routes creators to the fastest unblock path instead of leaving them in a dead-end placeholder."
        >
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-[1.15rem] border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a6146]">Tracks</p>
              <p className="mt-1 text-base font-semibold text-[var(--af-color-primary)]">Review</p>
              <p className="mt-1 text-[11px] leading-4 text-[#665746]">signal first</p>
            </div>
            <div className="rounded-[1.15rem] border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a6146]">Studio</p>
              <p className="mt-1 text-base font-semibold text-[var(--af-color-primary)]">Refine</p>
              <p className="mt-1 text-[11px] leading-4 text-[#665746]">prompt loop</p>
            </div>
            <div className="rounded-[1.15rem] border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a6146]">Share</p>
              <p className="mt-1 text-base font-semibold text-[var(--af-color-primary)]">Check</p>
              <p className="mt-1 text-[11px] leading-4 text-[#665746]">distribution path</p>
            </div>
          </div>

          <PocketSection title="Support posture" description="Help should route you to the real product surface that fixes the problem fastest." className="mb-4 bg-[#fff8f0]">
            <div className="af-mobile-rail">
              {[
                "Use help as a routing layer, not a dead-end documentation page.",
                "If the issue is live signal, distribution, or alerts, jump straight into the operational screen that controls it.",
              ].map((line) => (
                <div key={line} className="af-mobile-rail-card rounded-[1.1rem] border border-[#dbcdb8] bg-[#fffdf8] p-3.5 text-sm leading-6 text-[#5c5146]">{line}</div>
              ))}
            </div>
          </PocketSection>

          <PocketSection title="Fix the loop fast" description="Most mobile questions map to one of these working product surfaces." className="bg-[#fff6ed]">
            <PocketActionStack>
              <Link href="/admin/responses">
                <Button className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]">Open release tracks</Button>
              </Link>
              <Link href="/admin/questionnaires/v1">
                <Button variant="outline" className="w-full border-[#dbcdb8] bg-[#f3ecdf]">
                  <Mic className="mr-2 size-4" aria-hidden="true" />
                  Refine Studio prompts
                </Button>
              </Link>
              <Link href="/admin/notifications">
                <Button variant="outline" className="w-full border-[#dbcdb8] bg-[#f3ecdf]">Manage alerts</Button>
              </Link>
              <Link href="/admin/share">
                <Button variant="outline" className="w-full border-[#dbcdb8] bg-[#f3ecdf]">
                  <QrCode className="mr-2 size-4" aria-hidden="true" />
                  Open share hub
                </Button>
              </Link>
            </PocketActionStack>
          </PocketSection>

          <PocketSection title="Common mobile problems" description="Use these heuristics before you escalate an issue." className="mt-4">
            <ul className="space-y-2 text-sm text-[#5c5146]">
              <li className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf4] px-3 py-3">No takes yet: open Share and confirm a live release link is actually being distributed.</li>
              <li className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf4] px-3 py-3">Need better answers: go back to Studio and tighten the prompt sequence before sharing again.</li>
              <li className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf4] px-3 py-3">Missing alerts: check Notifications and send a test message before assuming delivery is broken.</li>
            </ul>
          </PocketSection>

          <PocketSection title="Support note" description="For support, use the notification or contact channels configured in your workspace." className="mt-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--af-color-primary)]">
              <LifeBuoy className="size-4 text-[#8a431f]" aria-hidden="true" />
              Help now acts as a routing layer for real product actions
            </p>
            <p className="font-body mt-3 inline-flex items-center gap-2 text-sm text-[#5c5146]">
              <Mail className="size-4 text-[#8a431f]" aria-hidden="true" />
              Route urgent builder issues through your existing support workflow.
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
        <p className="font-body text-sm text-[#5c5146]">Support</p>
        <h1 className="mt-1 text-3xl font-semibold text-balance">Help center</h1>
        <div className="mt-4 rounded-xl border border-[#dbcdb8] bg-[#fff6ed] p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <LifeBuoy className="size-4 text-[#8a431f]" aria-hidden="true" />
            Help resources are intentionally light right now
          </p>
          <p className="font-body mt-2 text-sm text-[#5c5146]">
            For the active creator loop, the most useful surfaces are Listen, release tracks, Share, and Alerts.
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
