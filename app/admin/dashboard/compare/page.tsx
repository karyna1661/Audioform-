"use client"

import Link from "next/link"
import { Bricolage_Grotesque, Lora } from "next/font/google"
import { useRequireAdmin } from "@/lib/auth-context"

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "700"] })
const body = Lora({ subsets: ["latin"], weight: ["400", "500", "600"] })

export default function DashboardComparePage() {
  const { status } = useRequireAdmin()

  if (status === "loading") {
    return <main className="min-h-dvh bg-[#f3ecdf] p-6">Loading options...</main>
  }

  return (
    <main className={`${display.className} min-h-dvh bg-[#f3ecdf] p-4 sm:p-6`}>
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-[#dbcdb8] bg-[#f9f4ea] p-6">
        <p className={`${body.className} text-sm text-[#5c5146]`}>Admin Dashboard Lab</p>
        <h1 className="mt-1 text-4xl font-semibold text-balance">Pick One Dashboard Direction</h1>
        <p className={`${body.className} mt-3 max-w-2xl text-pretty text-[#5c5146]`}>
          Version 4 is selected as the final direction. The older alternatives were removed.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <CardLink href="/admin/dashboard" title="Final (Default Route)" description="Version 4 hybrid now active at /admin/dashboard." />
          <CardLink href="/admin/dashboard/v4" title="Version 4 Source Route" description="Same selected dashboard on explicit /v4 path." />
        </div>
      </section>
    </main>
  )
}

function CardLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-[#dbcdb8] bg-[#fff6ed] p-4 transition hover:-translate-y-0.5 hover:border-[#b85e2d]">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-[#5c5146]">{description}</p>
      <p className="mt-4 text-sm font-semibold text-[#8a431f]">Open this version</p>
    </Link>
  )
}
