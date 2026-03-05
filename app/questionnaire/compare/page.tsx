"use client"

import Link from "next/link"


export default function QuestionnaireComparePage() {
  return (
    <main className={`min-h-dvh bg-[#f3ecdf] p-4 sm:p-6`}>
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-[#dbcdb8] bg-[#f9f4ea] p-6">
        <p className={`font-body text-sm text-[#5c5146]`}>Respondent Questionnaire</p>
        <h1 className="mt-1 text-4xl font-semibold text-balance">Selection Complete</h1>
        <p className={`font-body mt-3 text-pretty text-[#5c5146]`}>
          Version 1 is selected and active as the default respondent questionnaire.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <OptionCard href="/questionnaire" title="Default Route" description="Now points to Version 1 Guided Focus." />
          <OptionCard href="/questionnaire/v1" title="Version 1" description="Single-track guided answering with centered recording flow." />
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
      <p className="mt-4 text-sm font-semibold text-[#8a431f]">Open version</p>
    </Link>
  )
}

