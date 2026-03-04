import Link from "next/link"

export default function RedesignComparePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm uppercase text-zinc-400">AudioForm Redesign Lab</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Selected Direction</h1>
        <p className="mt-4 max-w-2xl text-zinc-300">
          Version 1 is selected as the redesign direction and is now being rolled into the real product pages.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-1">
          <Link
            href="/redesign/v1"
            className="group rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 transition hover:-translate-y-0.5 hover:border-amber-300/60"
          >
            <p className="text-sm uppercase text-amber-300">Version 1</p>
            <h2 className="mt-2 text-2xl font-semibold">Editorial Warmth</h2>
            <p className="mt-2 text-sm text-zinc-300">Human, premium, story-first survey product narrative.</p>
          </Link>
        </div>
      </section>
    </main>
  )
}
