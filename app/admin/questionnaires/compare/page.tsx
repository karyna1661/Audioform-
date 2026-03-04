"use client"

import Link from "next/link"
import { Bricolage_Grotesque, Lora } from "next/font/google"
import { useRequireAdmin } from "@/lib/auth-context"

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "700"] })
const body = Lora({ subsets: ["latin"], weight: ["400", "500", "600"] })

export default function QuestionnairesComparePage() {
  const { status } = useRequireAdmin()

  if (status === "loading") return <main className="min-h-dvh bg-[#f3ecdf] p-6">Loading...</main>

  return (
    <main className={`${display.className} min-h-dvh bg-[#f3ecdf] p-4 sm:p-6`}>
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-[#dbcdb8] bg-[#f9f4ea] p-6">
        <p className={`${body.className} text-sm text-[#5c5146]`}>Survey Creation Tool</p>
        <h1 className="mt-1 text-4xl font-semibold text-balance">Selection Complete</h1>
        <p className={`${body.className} mt-3 text-pretty text-[#5c5146]`}>
          Version 1 is selected and active as the default survey creation experience.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <OptionCard href="/admin/questionnaires" title="Default Route" description="Now points to Version 1 Flow Builder." />
          <OptionCard href="/admin/questionnaires/v1" title="Version 1" description="Question rail + canvas + respondent preview panel." />
        </div>
      </section>
    </main>
  )
}

function OptionCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-[#dbcdb8] bg-[#fff6ed] p-4 transition hover:-translate-y-0.5 hover:border-[#b85e2d]">
      <h2 className="text-2xl font-semibold text-balance">{title}</h2>
      <p className="mt-2 text-sm text-[#5c5146] text-pretty">{description}</p>
      <p className="mt-4 text-sm font-semibold text-[#8a431f]">Open</p>
    </Link>
  )
}

