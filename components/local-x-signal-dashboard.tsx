import Link from "next/link"
import { ArrowRight, BarChart3, Copy, MessageSquareQuote, TrendingUp } from "lucide-react"
import type { ContentScheduleItem } from "@/lib/local-content-schedule"

type Snapshot = {
  fileName: string | null
  analysis: {
    totals: {
      items: number
      avgLikes: number
      avgReposts: number
      avgReplies: number
      avgEngagementScore: number
    }
    patterns: {
      questionPostCount: number
      questionPostAvgEngagement: number
      nonQuestionPostAvgEngagement: number
      listPostCount: number
      listPostAvgEngagement: number
      nonListPostAvgEngagement: number
    }
    topPosts: Array<{
      id: string
      text: string
      createdAt: string
      engagementScore: number
      likeCount: number
      retweetCount: number
      replyCount: number
      quoteCount: number
    }>
    topTerms: Array<[string, number]>
    topHashtags: Array<[string, number]>
    languages: Array<{ lang: string; count: number }>
  } | null
  recommendations: ContentScheduleItem[]
  summary: {
    primaryAngle: string
    formatBias: string
    caution: string
  } | null
}

function truncate(text: string, max = 220): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized
}

export function LocalXSignalDashboard({ snapshot }: { snapshot: Snapshot }) {
  if (!snapshot.analysis || !snapshot.summary) {
    return (
      <main className="af-shell min-h-dvh p-4 sm:p-6">
        <div className="af-panel mx-auto max-w-5xl rounded-[2rem] border border-[#dbcdb8] p-6">
          <h1 className="text-3xl font-semibold text-balance">Local X Signal Dashboard</h1>
          <p className="font-body mt-3 text-sm text-[#5c5146] text-pretty">
            No Apify X analysis file was found yet. Run the existing X pipeline first, then open this route again.
          </p>
        </div>
      </main>
    )
  }

  const { analysis, recommendations, summary } = snapshot

  return (
    <main className="af-shell min-h-dvh p-4 sm:p-6">
      <div className="af-panel mx-auto max-w-7xl rounded-[2rem] border border-[#dbcdb8] p-5 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#dbcdb8] pb-5">
          <div>
            <p className="font-body text-sm text-[#5c5146] text-pretty">Local-only intelligence surface</p>
            <h1 className="mt-1 text-4xl font-semibold text-balance">X Signal Dashboard</h1>
            <p className="font-body mt-3 max-w-3xl text-sm text-[#5c5146] text-pretty">
              Uses the latest Apify X analysis file in this repo to turn broad market chatter into concrete posting direction for Audioform.
            </p>
          </div>
          <div className="rounded-2xl border border-[#dbcdb8] bg-[#fff7ee] px-4 py-3">
            <p className="text-sm font-semibold">Source file</p>
            <p className="font-body mt-1 text-xs text-[#5c5146]">{snapshot.fileName}</p>
          </div>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl border border-[#dbcdb8] bg-[#fffaf2] p-5">
            <p className="inline-flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="size-4 text-[#b85e2d]" aria-hidden="true" />
              What the dataset suggests
            </p>
            <ul className="font-body mt-3 space-y-2 text-sm text-[#5c5146] text-pretty">
              <li>{summary.primaryAngle}</li>
              <li>{summary.formatBias}</li>
              <li>{summary.caution}</li>
            </ul>
          </article>
          <article className="rounded-3xl border border-[#dbcdb8] bg-[#fff7ee] p-5">
            <p className="inline-flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="size-4 text-[#b85e2d]" aria-hidden="true" />
              Quant snapshot
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Metric label="Rows" value={String(analysis.totals.items)} />
              <Metric label="Avg engagement" value={String(analysis.totals.avgEngagementScore)} />
              <Metric label="Avg likes" value={String(analysis.totals.avgLikes)} />
              <Metric label="Avg replies" value={String(analysis.totals.avgReplies)} />
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <article className="rounded-3xl border border-[#dbcdb8] bg-[#f9f4ea] p-5">
              <h2 className="text-2xl font-semibold text-balance">Recommended next posts</h2>
              <p className="font-body mt-2 text-sm text-[#5c5146] text-pretty">
                These are the best-fit cards from your 30-day scheduler based on the latest X signal file and current format bias.
              </p>
              <div className="mt-4 space-y-3">
                {recommendations.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">Day {item.day} · {item.platform} · {item.pillar}</p>
                      <span className="rounded-full border border-[#dbcdb8] px-2 py-1 text-xs text-[#5c5146]">{item.format}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-balance">{item.title}</h3>
                    <p className="font-body mt-2 text-sm text-[#5c5146] text-pretty">{item.hook}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/local/content-scheduler"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#8a431f]"
              >
                Open full content scheduler
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </article>

            <article className="rounded-3xl border border-[#dbcdb8] bg-[#f9f4ea] p-5">
              <h2 className="text-2xl font-semibold text-balance">Top X examples</h2>
              <p className="font-body mt-2 text-sm text-[#5c5146] text-pretty">
                These are the strongest posts in the scraped set. Use them to understand structure, not to copy generic survey language.
              </p>
              <div className="mt-4 space-y-3">
                {analysis.topPosts.slice(0, 5).map((post) => (
                  <article key={post.id} className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] p-4">
                    <p className="font-body text-xs text-[#7a6146]">
                      eng {post.engagementScore} · likes {post.likeCount} · reposts {post.retweetCount} · replies {post.replyCount}
                    </p>
                    <p className="font-body mt-2 text-sm leading-6 text-[#5c5146] text-pretty">{truncate(post.text)}</p>
                  </article>
                ))}
              </div>
            </article>
          </div>

          <aside className="space-y-4">
            <article className="rounded-3xl border border-[#dbcdb8] bg-[#fff7ee] p-5">
              <p className="inline-flex items-center gap-2 text-sm font-semibold">
                <Copy className="size-4 text-[#b85e2d]" aria-hidden="true" />
                Top terms
              </p>
              <ul className="font-body mt-3 space-y-2 text-sm text-[#5c5146]">
                {analysis.topTerms.slice(0, 10).map(([term, count]) => (
                  <li key={term} className="flex items-center justify-between rounded-lg border border-[#dbcdb8] bg-[#fffdf8] px-3 py-2">
                    <span>{term}</span>
                    <span className="tabular-nums">{count}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-3xl border border-[#dbcdb8] bg-[#fff7ee] p-5">
              <p className="inline-flex items-center gap-2 text-sm font-semibold">
                <MessageSquareQuote className="size-4 text-[#b85e2d]" aria-hidden="true" />
                Pattern read
              </p>
              <ul className="font-body mt-3 space-y-2 text-sm text-[#5c5146]">
                <li className="rounded-lg border border-[#dbcdb8] bg-[#fffdf8] px-3 py-2">
                  Question posts: {analysis.patterns.questionPostCount}
                </li>
                <li className="rounded-lg border border-[#dbcdb8] bg-[#fffdf8] px-3 py-2">
                  Avg engagement for questions: {analysis.patterns.questionPostAvgEngagement}
                </li>
                <li className="rounded-lg border border-[#dbcdb8] bg-[#fffdf8] px-3 py-2">
                  Avg engagement for statements: {analysis.patterns.nonQuestionPostAvgEngagement}
                </li>
                <li className="rounded-lg border border-[#dbcdb8] bg-[#fffdf8] px-3 py-2">
                  List posts found: {analysis.patterns.listPostCount}
                </li>
              </ul>
            </article>

            <article className="rounded-3xl border border-[#dbcdb8] bg-[#fff7ee] p-5">
              <p className="text-sm font-semibold">Use this dashboard for</p>
              <ul className="font-body mt-3 space-y-2 text-sm text-[#5c5146] text-pretty">
                <li>1. Choosing the next strongest post angle.</li>
                <li>2. Deciding whether to lead with statements or questions.</li>
                <li>3. Keeping your beta content grounded in real language patterns.</li>
              </ul>
            </article>
          </aside>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#dbcdb8] bg-[#fffdf8] p-3">
      <p className="text-sm text-[#5c5146]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

