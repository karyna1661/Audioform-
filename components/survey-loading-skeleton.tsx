import { Bricolage_Grotesque } from "next/font/google"

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "700"] })

export function SurveyLoadingSkeleton({ label = "Loading survey..." }: { label?: string }) {
  return (
    <main className={`${display.className} min-h-dvh bg-[#f3ecdf] p-4 sm:p-6`}>
      <section className="mx-auto max-w-3xl animate-pulse rounded-[1.5rem] border border-[#dbcdb8] bg-[#f9f4ea] p-4 sm:rounded-[2rem] sm:p-6">
        <p className="text-xs uppercase tracking-wide text-[#8c7f70]">{label}</p>
        <div className="mt-3 h-4 w-64 rounded bg-[#e8dcc9]" />
        <div className="mt-2 h-4 w-40 rounded bg-[#e8dcc9]" />
        <div className="mt-3 h-2 w-full rounded bg-[#e8dcc9]" />
        <div className="mt-8 h-10 w-[85%] rounded bg-[#e8dcc9]" />
        <div className="mt-2 h-4 w-[65%] rounded bg-[#e8dcc9]" />
        <div className="mt-6 h-44 rounded-2xl bg-[#efe4d3]" />
        <div className="mt-4 h-10 w-28 rounded bg-[#e8dcc9]" />
      </section>
    </main>
  )
}

