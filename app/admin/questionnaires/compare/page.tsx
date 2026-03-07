"use client"

import Link from "next/link"
import { useRequireAdmin } from "@/lib/auth-context"
import { AdminMobileNav } from "@/components/admin-mobile-nav"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"


export default function QuestionnairesComparePage() {
  const { status } = useRequireAdmin()

  if (status === "loading") return <SurveyLoadingSkeleton label="Loading questionnaire options..." />

  return (
    <main className={`af-shell min-h-dvh p-4 pb-28 sm:p-6 sm:pb-6`}>
      <section className="af-panel af-fade-up mx-auto max-w-5xl rounded-[2rem] border border-[#dbcdb8] p-6">
        <p className={`font-body text-sm text-[#5c5146] text-pretty`}>Survey Creation Tool</p>
        <h1 className="mt-1 text-4xl font-semibold text-balance">Selection Complete</h1>
        <p className={`font-body mt-3 text-pretty text-[#5c5146]`}>
          Version 1 is selected and active as the default survey creation experience.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <OptionCard href="/admin/questionnaires" title="Default Route" description="Now points to Version 1 Flow Builder." />
          <OptionCard href="/admin/questionnaires/v1" title="Version 1" description="Question rail + canvas + respondent preview panel." />
        </div>
      </section>
      <AdminMobileNav />
    </main>
  )
}

function OptionCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="af-accent-card af-fade-up af-delay-1 af-glow-hover rounded-2xl border border-[#dbcdb8] p-4"
    >
      <h2 className="text-2xl font-semibold text-balance">{title}</h2>
      <p className="font-body mt-2 text-sm text-[#5c5146] text-pretty">{description}</p>
      <p className="mt-4 text-sm font-semibold text-[#8a431f]">Open</p>
    </Link>
  )
}

