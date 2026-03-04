#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const ENV_PATH = path.join(ROOT, ".env")
const RAW_DIR = path.join(ROOT, "data", "reddit", "scrapes")
const ANALYSIS_DIR = path.join(ROOT, "data", "reddit", "analysis")
const REPORT_PATH = path.join(ROOT, "future-work", "audioform-reddit-insight-report.md")

const DEFAULT_KEYWORDS = [
  "build in public feedback",
  "voice feedback startup",
  "beta feedback product",
  "user feedback saas",
  "product iteration founder",
]
const DEFAULT_SUBREDDITS = [
  "startups",
  "SaaS",
  "Entrepreneur",
  "SideProject",
  "indiehackers",
]
const DEFAULT_LIMIT = 50
const DEFAULT_WINDOW = "year"
const DEFAULT_SORT = "new"
const DEFAULT_MIN_RELEVANCE = 2
const DEFAULT_MIN_ENGAGEMENT = 6

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "")
    if (!(key in process.env)) process.env[key] = value
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-")
}

function truncate(text, max = 180) {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim()
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const RELEVANCE_TERMS = [
  "feedback",
  "user feedback",
  "customer feedback",
  "voice feedback",
  "product feedback",
  "beta feedback",
  "founder",
  "startup",
  "saas",
  "customer discovery",
  "user research",
  "product validation",
  "build in public",
  "ship in public",
  "feature request",
  "onboarding",
  "churn",
  "interview",
]

const NOISE_PATTERNS = [
  /share your startup/i,
  /quarterly post/i,
  /weekly thread/i,
  /what are you building right now/i,
]

function relevanceScore(row) {
  const hay = normalizeText(`${row.title} ${row.selftext}`)
  let score = 0
  for (const term of RELEVANCE_TERMS) {
    if (hay.includes(term)) score += 1
  }
  return score
}

function isNoisy(row) {
  const hay = `${row.title} ${row.selftext}`
  return NOISE_PATTERNS.some((pattern) => pattern.test(hay))
}

function dedupeAndFilter(rows, { minRelevance, minEngagement }) {
  const seen = new Set()
  const kept = []
  let duplicates = 0
  let droppedLowRelevance = 0
  let droppedLowSignal = 0
  let droppedNoise = 0

  for (const row of rows) {
    const normalizedTitle = normalizeText(row.title)
    const dedupeKey = `${row.subreddit}::${normalizedTitle}`
    if (normalizedTitle && seen.has(dedupeKey)) {
      duplicates += 1
      continue
    }
    if (normalizedTitle) seen.add(dedupeKey)

    const relevance = relevanceScore(row)
    const engagement = Number(row.engagementScore ?? 0)
    const comments = Number(row.numComments ?? 0)

    if (isNoisy(row) && relevance < minRelevance + 1) {
      droppedNoise += 1
      continue
    }
    if (relevance < minRelevance) {
      droppedLowRelevance += 1
      continue
    }
    if (engagement < minEngagement && comments < 2 && relevance < minRelevance + 2) {
      droppedLowSignal += 1
      continue
    }

    kept.push({
      ...row,
      relevanceScore: relevance,
    })
  }

  return {
    rows: kept,
    quality: {
      inputItems: rows.length,
      keptItems: kept.length,
      droppedDuplicates: duplicates,
      droppedNoise,
      droppedLowRelevance,
      droppedLowSignal,
    },
  }
}

async function fetchRedditSearch({ subreddit, keyword, limit, sort, t }) {
  const params = new URLSearchParams({
    q: keyword,
    restrict_sr: "1",
    sort,
    t,
    limit: String(limit),
  })
  const url = `https://www.reddit.com/r/${subreddit}/search.json?${params.toString()}`
  const response = await fetch(url, {
    headers: {
      // Public JSON endpoints are stricter without user-agent.
      "User-Agent": "audioform-gtm-research/1.0",
      Accept: "application/json",
    },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Reddit request failed (${response.status}) for r/${subreddit} "${keyword}": ${text.slice(0, 220)}`)
  }
  const payload = await response.json()
  const children = payload?.data?.children ?? []
  return children.map((item) => item.data)
}

function postToRow(post, keyword) {
  return {
    id: post.id ?? "",
    title: post.title ?? "",
    selftext: post.selftext ?? "",
    subreddit: post.subreddit ?? "",
    author: post.author ?? "",
    createdUtc: post.created_utc ?? 0,
    score: Number(post.score ?? 0),
    numComments: Number(post.num_comments ?? 0),
    upvoteRatio: Number(post.upvote_ratio ?? 0),
    permalink: post.permalink ? `https://www.reddit.com${post.permalink}` : "",
    url: post.url ?? "",
    keyword,
    engagementScore: Number(post.score ?? 0) + 2 * Number(post.num_comments ?? 0),
  }
}

function buildAnalysis(rows, quality) {
  const total = rows.length
  const avg = (arr, key) => (arr.length ? arr.reduce((a, b) => a + Number(b[key] ?? 0), 0) / arr.length : 0)
  const questionPosts = rows.filter((r) => r.title.includes("?") || r.selftext.includes("?"))
  const listPosts = rows.filter((r) => /\b1\.|\b2\.|\b3\./.test(`${r.title} ${r.selftext}`))
  const withComments = rows.filter((r) => r.numComments > 0)

  const topPosts = [...rows].sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 15)

  const stop = new Set([
    "the",
    "and",
    "for",
    "that",
    "with",
    "this",
    "you",
    "your",
    "are",
    "from",
    "have",
    "has",
    "was",
    "were",
    "will",
    "can",
    "not",
    "but",
    "our",
    "its",
    "they",
    "their",
    "about",
    "just",
    "into",
    "what",
    "when",
    "where",
    "why",
    "how",
    "who",
    "all",
    "out",
    "get",
    "got",
    "new",
    "more",
    "now",
    "im",
    "ive",
    "dont",
    "didnt",
  ])
  const terms = new Map()
  for (const row of rows) {
    const text = `${row.title} ${row.selftext}`.toLowerCase()
    const words = text.match(/[a-z][a-z-]{2,}/g) ?? []
    for (const word of words) {
      if (stop.has(word)) continue
      terms.set(word, (terms.get(word) ?? 0) + 1)
    }
  }
  const topTerms = [...terms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)

  const subredditDist = [...new Map(rows.map((r) => [r.subreddit, 0])).keys()].map((subreddit) => ({
    subreddit,
    count: rows.filter((r) => r.subreddit === subreddit).length,
  }))
  subredditDist.sort((a, b) => b.count - a.count)

  return {
    quality,
    totals: {
      items: total,
      avgScore: Number(avg(rows, "score").toFixed(2)),
      avgComments: Number(avg(rows, "numComments").toFixed(2)),
      avgEngagementScore: Number(avg(rows, "engagementScore").toFixed(2)),
    },
    patterns: {
      questionPostCount: questionPosts.length,
      questionPostAvgEngagement: Number(avg(questionPosts, "engagementScore").toFixed(2)),
      nonQuestionPostAvgEngagement: Number(avg(rows.filter((r) => !(r.title.includes("?") || r.selftext.includes("?"))), "engagementScore").toFixed(2)),
      listPostCount: listPosts.length,
      listPostAvgEngagement: Number(avg(listPosts, "engagementScore").toFixed(2)),
      nonListPostAvgEngagement: Number(avg(rows.filter((r) => !/\b1\.|\b2\.|\b3\./.test(`${r.title} ${r.selftext}`)), "engagementScore").toFixed(2)),
      commentedSharePct: Number((withComments.length && total ? (withComments.length / total) * 100 : 0).toFixed(2)),
    },
    topTerms,
    topPosts,
    subredditDist: subredditDist.slice(0, 10),
  }
}

function buildMarkdown({ keywords, subreddits, analysis, rawPath }) {
  const lines = []
  lines.push("# Audioform Reddit Insight Report")
  lines.push("")
  lines.push(`Date: ${new Date().toISOString().slice(0, 10)}`)
  lines.push(`Raw file: \`${path.relative(ROOT, rawPath)}\``)
  lines.push("")
  lines.push("## Query Setup")
  lines.push(`- Subreddits: ${subreddits.join(", ")}`)
  lines.push(`- Keywords: ${keywords.join(" | ")}`)
  lines.push("")
  lines.push("## Quant Snapshot")
  lines.push(`- Input rows before filtering: \`${analysis.quality?.inputItems ?? "n/a"}\``)
  lines.push(`- Kept after quality filter: \`${analysis.quality?.keptItems ?? "n/a"}\``)
  lines.push(`- Dropped duplicates: \`${analysis.quality?.droppedDuplicates ?? "n/a"}\``)
  lines.push(`- Dropped noise: \`${analysis.quality?.droppedNoise ?? "n/a"}\``)
  lines.push(`- Dropped low relevance: \`${analysis.quality?.droppedLowRelevance ?? "n/a"}\``)
  lines.push(`- Dropped low signal: \`${analysis.quality?.droppedLowSignal ?? "n/a"}\``)
  lines.push(`- Rows analyzed: \`${analysis.totals.items}\``)
  lines.push(`- Avg score: \`${analysis.totals.avgScore}\``)
  lines.push(`- Avg comments: \`${analysis.totals.avgComments}\``)
  lines.push(`- Avg engagement score: \`${analysis.totals.avgEngagementScore}\``)
  lines.push("")
  lines.push("## Pattern Findings")
  lines.push(`- Question posts: \`${analysis.patterns.questionPostCount}\``)
  lines.push(`- Question post avg engagement: \`${analysis.patterns.questionPostAvgEngagement}\``)
  lines.push(`- Non-question avg engagement: \`${analysis.patterns.nonQuestionPostAvgEngagement}\``)
  lines.push(`- List posts: \`${analysis.patterns.listPostCount}\``)
  lines.push(`- List post avg engagement: \`${analysis.patterns.listPostAvgEngagement}\``)
  lines.push(`- Non-list avg engagement: \`${analysis.patterns.nonListPostAvgEngagement}\``)
  lines.push(`- Posts with comments: \`${analysis.patterns.commentedSharePct}%\``)
  lines.push("")
  lines.push("## Top Subreddits")
  for (const s of analysis.subredditDist) lines.push(`- r/${s.subreddit}: ${s.count}`)
  lines.push("")
  lines.push("## Top Terms")
  for (const [term, count] of analysis.topTerms) lines.push(`- ${term}: ${count}`)
  lines.push("")
  lines.push("## Top Posts")
  for (const p of analysis.topPosts) {
    lines.push(`- [eng=${p.engagementScore}] r/${p.subreddit} score=${p.score}, comments=${p.numComments}: ${truncate(p.title)}`)
    lines.push(`  - ${p.permalink}`)
  }
  lines.push("")
  lines.push("## Immediate GTM Actions")
  lines.push("1. Convert top post themes into X/Farcaster hooks using Audioform positioning language.")
  lines.push("2. Build one weekly Reddit-sourced 'pain-to-message' content brief.")
  lines.push("3. Prioritize subreddits with higher comments-per-post for community discovery and interviews.")
  lines.push("")
  return `${lines.join("\n")}\n`
}

async function main() {
  loadEnv(ENV_PATH)

  const keywords = (process.env.REDDIT_KEYWORDS || DEFAULT_KEYWORDS.join("||"))
    .split("||")
    .map((v) => v.trim())
    .filter(Boolean)
  const subreddits = (process.env.REDDIT_SUBREDDITS || DEFAULT_SUBREDDITS.join(","))
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
  const limit = Number(process.env.REDDIT_LIMIT || DEFAULT_LIMIT)
  const sort = process.env.REDDIT_SORT || DEFAULT_SORT
  const t = process.env.REDDIT_TIME_WINDOW || DEFAULT_WINDOW
  const minRelevance = Number(process.env.REDDIT_MIN_RELEVANCE || DEFAULT_MIN_RELEVANCE)
  const minEngagement = Number(process.env.REDDIT_MIN_ENGAGEMENT || DEFAULT_MIN_ENGAGEMENT)

  const seen = new Set()
  const rows = []

  for (const subreddit of subreddits) {
    for (const keyword of keywords) {
      const posts = await fetchRedditSearch({ subreddit, keyword, limit, sort, t })
      for (const post of posts) {
        if (!post?.id || seen.has(post.id)) continue
        seen.add(post.id)
        rows.push(postToRow(post, keyword))
      }
      // Polite pacing
      await sleep(900)
    }
  }

  ensureDir(RAW_DIR)
  ensureDir(ANALYSIS_DIR)
  const stamp = nowStamp()
  const rawPath = path.join(RAW_DIR, `reddit-keyword-scrape-${stamp}.json`)
  const analysisPath = path.join(ANALYSIS_DIR, `reddit-keyword-analysis-${stamp}.json`)

  fs.writeFileSync(rawPath, JSON.stringify(rows, null, 2), "utf8")

  const { rows: filteredRows, quality } = dedupeAndFilter(rows, {
    minRelevance,
    minEngagement,
  })
  const analysis = buildAnalysis(filteredRows, quality)
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2), "utf8")

  const report = buildMarkdown({ keywords, subreddits, analysis, rawPath })
  fs.writeFileSync(REPORT_PATH, report, "utf8")

  console.log(`OK: fetched ${rows.length} unique reddit posts`)
  console.log(`OK: kept ${filteredRows.length} posts after quality filtering`)
  console.log(`RAW: ${path.relative(ROOT, rawPath)}`)
  console.log(`ANALYSIS: ${path.relative(ROOT, analysisPath)}`)
  console.log(`REPORT: ${path.relative(ROOT, REPORT_PATH)}`)
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`)
  process.exit(1)
})
