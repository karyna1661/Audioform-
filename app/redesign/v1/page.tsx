import Link from "next/link"
import { Bricolage_Grotesque, Lora } from "next/font/google"
import { Mic, Sparkles, AudioWaveform, ChevronRight } from "lucide-react"

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "700"] })
const body = Lora({ subsets: ["latin"], weight: ["400", "500", "600"] })

export default function RedesignV1Page() {
  return (
    <main
      className={`${display.className} min-h-screen bg-[#f3ecdf] text-[#1f1b17]`}
      style={
        {
          "--paper": "#f3ecdf",
          "--ink": "#1f1b17",
          "--muted": "#5c5146",
          "--accent": "#b85e2d",
          "--line": "#dbcdb8",
        } as { [key: string]: string }
      }
    >
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-8">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-full border border-[color:var(--line)] bg-[color:var(--paper)]/80 px-5 py-3 backdrop-blur">
          <p className="text-sm font-semibold tracking-[0.16em]">AUDIOFORM</p>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm">
              Log in
            </Link>
            <Link href="/signup" className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-sm text-[color:var(--paper)]">
              Start free
            </Link>
          </div>
        </header>

        <section className="relative mt-10 overflow-hidden rounded-[2.5rem] border border-[color:var(--line)] bg-[#f9f4ea] p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#e5d2b5] blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[#e6b593] blur-2xl" />

          <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">Voice-first research platform</p>
          <h1 className="mt-5 max-w-3xl text-4xl leading-tight sm:text-6xl">
            Collect answers people can actually feel.
          </h1>
          <p className={`${body.className} mt-5 max-w-2xl text-base leading-relaxed text-[color:var(--muted)] sm:text-lg`}>
            AudioForm turns surveys into conversations. Ask better questions, receive voice responses, and find the
            signal in tone, confidence, and emotion.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/questionnaire"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-[#fff6ed]"
            >
              Try voice survey
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link href="/admin/dashboard" className="rounded-full border border-[color:var(--line)] px-5 py-3 text-sm font-semibold">
              Open dashboard
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <Mic className="h-5 w-5" />,
              title: "Record naturally",
              text: "No typing friction. Respondents speak in their own rhythm.",
            },
            {
              icon: <AudioWaveform className="h-5 w-5" />,
              title: "Understand intent",
              text: "Track pauses, confidence, and depth beyond plain text answers.",
            },
            {
              icon: <Sparkles className="h-5 w-5" />,
              title: "Ship fast",
              text: "Create a survey, share a link, and start collecting voice data in minutes.",
            },
          ].map((item) => (
            <article key={item.title} className="rounded-3xl border border-[color:var(--line)] bg-[#faf6ee] p-6">
              <div className="inline-flex rounded-full border border-[color:var(--line)] p-2 text-[color:var(--accent)]">{item.icon}</div>
              <h2 className="mt-4 text-xl font-semibold">{item.title}</h2>
              <p className={`${body.className} mt-2 text-sm leading-relaxed text-[color:var(--muted)]`}>{item.text}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
