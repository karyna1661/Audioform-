"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Copy, RotateCcw } from "lucide-react"
import { localContentSchedule } from "@/lib/local-content-schedule"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "audioform-local-content-scheduler-v1"

type CompletionMap = Record<string, boolean>

export function LocalContentScheduler() {
  const [completed, setCompleted] = useState<CompletionMap>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      setCompleted(JSON.parse(raw) as CompletionMap)
    } catch {
      setCompleted({})
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(completed))
  }, [completed])

  const doneCount = useMemo(
    () => localContentSchedule.filter((item) => completed[item.id]).length,
    [completed],
  )

  const remainingCount = localContentSchedule.length - doneCount

  return (
    <main className="af-shell min-h-dvh p-4 sm:p-6">
      <div className="af-panel mx-auto max-w-6xl rounded-[2rem] border border-[#dbcdb8] p-5 sm:p-8">
        <header className="border-b border-[#dbcdb8] pb-5">
          <p className="font-body text-sm text-[#5c5146] text-pretty">Local-only planning surface</p>
          <h1 className="mt-1 text-4xl font-semibold text-balance">30-Day Pre-Beta Content Scheduler</h1>
          <p className="font-body mt-3 max-w-3xl text-sm text-[#5c5146] text-pretty">
            This page is for localhost only. It is seeded with 30 days of Audioform pre-beta content and a checklist so each post can be marked complete after you publish it.
          </p>
        </header>

        <section className="mt-5 grid gap-4 md:grid-cols-[1.2fr_280px]">
          <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffaf2] p-4">
            <h2 className="text-lg font-semibold text-balance">Posting rhythm</h2>
            <ul className="font-body mt-2 space-y-2 text-sm text-[#5c5146] text-pretty">
              <li>1. Publish one scheduled post per day.</li>
              <li>2. Tick it complete after posting so it does not get reused accidentally.</li>
              <li>3. Reuse comments to shape the next beta-facing post.</li>
            </ul>
            <Link
              href="/local/x-signal"
              className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#8a431f]"
            >
              Open X signal dashboard
            </Link>
          </div>
          <aside className="rounded-2xl border border-[#dbcdb8] bg-[#fff7ee] p-4">
            <p className="text-sm font-semibold">Tracker</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-[#6e3316]">{doneCount}/30</p>
            <p className="font-body mt-1 text-sm text-[#5c5146]">{remainingCount} posts left before beta opening.</p>
            <Button
              variant="outline"
              className="mt-4 w-full border-[#dbcdb8] bg-[#fffdf8]"
              onClick={() => setCompleted({})}
            >
              <RotateCcw className="mr-2 size-4" aria-hidden="true" />
              Reset checklist
            </Button>
          </aside>
        </section>

        <section className="mt-6 space-y-4">
          {localContentSchedule.map((item) => {
            const isDone = Boolean(completed[item.id])
            const postText = `${item.hook}\n\n${item.body}\n\n${item.cta}`

            return (
              <article
                key={item.id}
                className={`rounded-3xl border p-5 transition ${
                  isDone ? "border-[#b9d5b4] bg-[#eef7eb]" : "border-[#dbcdb8] bg-[#f9f4ea]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-body text-xs uppercase text-[#7a6146]">
                      Day {item.day} · {item.platform} · {item.format} · {item.pillar}
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-balance">{item.title}</h2>
                  </div>
                  <label className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#dbcdb8] bg-[#fffdf8] px-4 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={(event) =>
                        setCompleted((prev) => ({
                          ...prev,
                          [item.id]: event.target.checked,
                        }))
                      }
                      className="size-4 accent-[#b85e2d]"
                    />
                    Mark posted
                  </label>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
                  <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] p-4">
                    <p className="text-sm font-semibold">Post copy</p>
                    <p className="font-body mt-3 whitespace-pre-line text-sm leading-6 text-[#5c5146] text-pretty">
                      {postText}
                    </p>
                  </div>

                  <aside className="space-y-3 rounded-2xl border border-[#dbcdb8] bg-[#fff7ee] p-4">
                    <div>
                      <p className="text-sm font-semibold">Checklist</p>
                      <ul className="font-body mt-2 space-y-2 text-sm text-[#5c5146]">
                        <li className="inline-flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-[#2d5a17]" aria-hidden="true" />
                          Tailor the first line to today&apos;s context
                        </li>
                        <li className="inline-flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-[#2d5a17]" aria-hidden="true" />
                          Post on the scheduled platform
                        </li>
                        <li className="inline-flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-[#2d5a17]" aria-hidden="true" />
                          Tick this card after publishing
                        </li>
                      </ul>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full border-[#dbcdb8] bg-[#fffdf8]"
                      onClick={async () => {
                        await navigator.clipboard.writeText(postText)
                        setCopiedId(item.id)
                        window.setTimeout(() => setCopiedId((current) => (current === item.id ? null : current)), 1500)
                      }}
                    >
                      <Copy className="mr-2 size-4" aria-hidden="true" />
                      {copiedId === item.id ? "Copied" : "Copy post"}
                    </Button>
                  </aside>
                </div>
              </article>
            )
          })}
        </section>
      </div>
    </main>
  )
}
