#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const ENV_PATH = path.join(ROOT, ".env")
const RAW_DIR = path.join(ROOT, "data", "hn", "scrapes")
const ANALYSIS_DIR = path.join(ROOT, "data", "hn", "analysis")
const REPORT_PATH = path.join(ROOT, "future-work", "audioform-hn-insight-report.md")

const DEFAULT_KEYWORDS = [
  "build in public feedback",
  "beta feedback startup",
  "user feedback saas",
  "voice feedback product",
  "customer discovery founders",
]
const DEFAULT_LIMIT = 100
const DEFAULT_TAGS = ["story", "comment"]
const DEFAULT_MIN_RELEVANCE = 2
const DEFAULT_MIN_ENGAGEMENT = 8

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

function truncate(value, max = 180) {
  const s = String(value ?? "").replace(/\s+/g, " ").trim()
  return s.length > max ? `${s.slice(0, max)}...` : s
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
  /^show hn:/i,
  /^launch hn:/i,
  /^who is hiring/i,
  /^ask hn: who wants to be hired/i,
]

function relevanceScore(row) {
  const hay = normalizeText(`${row.title} ${row.text}`)
  let score = 0
  for (const term of RELEVANCE_TERMS) {
    if (hay.includes(term)) score += 1
  }
  return score
}

function isNoisy(row) {
  const text = `${row.title} ${row.text}`
  return NOISE_PATTERNS.some((pattern) => pattern.test(text))
}

function dedupeAndFilter(rows, { minRelevance, minEngagement }) {
  const seen = new Set()
  const kept = []
  let duplicates = 0
  let droppedLowRelevance = 0
  let droppedLowSignal = 0
  let droppedNoise = 0

  for (const row of rows) {
    const normalizedTitle = normalizeText(row.title || row.text)
    if (normalizedTitle && seen.has(normalizedTitle)) {
      duplicates += 1
      continue
    }
    if (normalizedTitle) seen.add(normalizedTitle)

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

async function fetchHn({ keyword, tag, hitsPerPage }) {
  const params = new URLSearchParams({
    query: keyword,
    tags: tag,
    hitsPerPage: String(hitsPerPage),
  })
  const url = `https://hn.algolia.com/api/v1/search_by_date?${params.toString()}`
  const response = await fetch(url, {
    headers: {
      "User-Agent": "audioform-gtm-research/1.0",
      Accept: "application/json",
    },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HN request failed (${response.status}) for "${keyword}" tag=${tag}: ${text.slice(0, 220)}`)
  }
  const payload = await response.json()
  return payload.hits ?? []
}

function hitToRow(hit, keyword, tag) {
  const points = Number(hit.points ?? 0)
  const comments = Number(hit.num_comments ?? 0)
  return {
    objectID: hit.objectID ?? "",
    title: hit.title ?? hit.story_title ?? "",
    text: hit.comment_text ?? hit.story_text ?? "",
    url: hit.url ?? hit.story_url ?? "",
    author: hit.author ?? "",
    createdAt: hit.created_at ?? "",
    tag,
    keyword,
    points,
    numComments: comments,
    engagementScore: points + 2 * comments,
  }
}

function buildAnalysis(rows, quality) {
  const total = rows.length
  const avg = (arr, field) => (arr.length ? arr.reduce((acc, cur) => acc + Number(cur[field] ?? 0), 0) / arr.length : 0)
  const questionRows = rows.filter((r) => `${r.title} ${r.text}`.includes("?"))
  const listRows = rows.filter((r) => /\b1\.|\b2\.|\b3\./.test(`${r.title} ${r.text}`))
  const withComments = rows.filter((r) => r.numComments > 0)

  const topRows = [...rows].sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 15)

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
    "http",
    "https",
  ])
  const terms = new Map()
  for (const row of rows) {
    const text = `${row.title} ${row.text}`.toLowerCase()
    const words = text.match(/[a-z][a-z-]{2,}/g) ?? []
    for (const word of words) {
      if (stop.has(word)) continue
      terms.set(word, (terms.get(word) ?? 0) + 1)
    }
  }
  const topTerms = [...terms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)

  const byTag = [...new Map(rows.map((r) => [r.tag, 0])).keys()].map((tag) => ({
    tag,
    count: rows.filter((r) => r.tag === tag).length,
  }))
  byTag.sort((a, b) => b.count - a.count)

  return {
    quality,
    totals: {
      items: total,
      avgPoints: Number(avg(rows, "points").toFixed(2)),
      avgComments: Number(avg(rows, "numComments").toFixed(2)),
      avgEngagementScore: Number(avg(rows, "engagementScore").toFixed(2)),
    },
    patterns: {
      questionPostCount: questionRows.length,
      questionPostAvgEngagement: Number(avg(questionRows, "engagementScore").toFixed(2)),
      nonQuestionPostAvgEngagement: Number(avg(rows.filter((r) => !(`${r.title} ${r.text}`.includes("?"))), "engagementScore").toFixed(2)),
      listPostCount: listRows.length,
      listPostAvgEngagement: Number(avg(listRows, "engagementScore").toFixed(2)),
      nonListPostAvgEngagement: Number(avg(rows.filter((r) => !/\b1\.|\b2\.|\b3\./.test(`${r.title} ${r.text}`)), "engagementScore").toFixed(2)),
      postsWithCommentsPct: Number((total ? (withComments.length / total) * 100 : 0).toFixed(2)),
    },
    topTerms,
    topRows,
    byTag,
  }
}

function buildReport({ keywords, tags, analysis, rawPath }) {
  const lines = []
  lines.push("# Audioform Hacker News Insight Report")
  lines.push("")
  lines.push(`Date: ${new Date().toISOString().slice(0, 10)}`)
  lines.push(`Raw file: \`${path.relative(ROOT, rawPath)}\``)
  lines.push("")
  lines.push("## Query Setup")
  lines.push(`- Tags: ${tags.join(", ")}`)
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
  lines.push(`- Avg points: \`${analysis.totals.avgPoints}\``)
  lines.push(`- Avg comments: \`${analysis.totals.avgComments}\``)
  lines.push(`- Avg engagement score: \`${analysis.totals.avgEngagementScore}\``)
  lines.push("")
  lines.push("## Pattern Findings")
  lines.push(`- Question posts: \`${analysis.patterns.questionPostCount}\``)
  lines.push(`- Question avg engagement: \`${analysis.patterns.questionPostAvgEngagement}\``)
  lines.push(`- Non-question avg engagement: \`${analysis.patterns.nonQuestionPostAvgEngagement}\``)
  lines.push(`- List posts: \`${analysis.patterns.listPostCount}\``)
  lines.push(`- List avg engagement: \`${analysis.patterns.listPostAvgEngagement}\``)
  lines.push(`- Non-list avg engagement: \`${analysis.patterns.nonListPostAvgEngagement}\``)
  lines.push(`- Posts with comments: \`${analysis.patterns.postsWithCommentsPct}%\``)
  lines.push("")
  lines.push("## Top Terms")
  for (const [term, count] of analysis.topTerms) lines.push(`- ${term}: ${count}`)
  lines.push("")
  lines.push("## Distribution by Tag")
  for (const x of analysis.byTag) lines.push(`- ${x.tag}: ${x.count}`)
  lines.push("")
  lines.push("## Top Threads")
  for (const row of analysis.topRows) {
    lines.push(`- [eng=${row.engagementScore}] (${row.tag}) points=${row.points}, comments=${row.numComments}: ${truncate(row.title || row.text)}`)
    if (row.url) lines.push(`  - ${row.url}`)
  }
  lines.push("")
  lines.push("## Immediate GTM Actions")
  lines.push("1. Use top HN pain terms to rewrite one contrarian X/Farcaster post.")
  lines.push("2. Publish one builder case post anchored in top-commented thread themes.")
  lines.push("3. Add one FAQ entry to messaging docs for the most repeated objection term.")
  lines.push("")
  return `${lines.join("\n")}\n`
}

async function main() {
  loadEnv(ENV_PATH)
  const keywords = (process.env.HN_KEYWORDS || DEFAULT_KEYWORDS.join("||"))
    .split("||")
    .map((v) => v.trim())
    .filter(Boolean)
  const tags = (process.env.HN_TAGS || DEFAULT_TAGS.join(","))
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
  const limit = Number(process.env.HN_LIMIT || DEFAULT_LIMIT)
  const minRelevance = Number(process.env.HN_MIN_RELEVANCE || DEFAULT_MIN_RELEVANCE)
  const minEngagement = Number(process.env.HN_MIN_ENGAGEMENT || DEFAULT_MIN_ENGAGEMENT)

  const seen = new Set()
  const rows = []
  for (const keyword of keywords) {
    for (const tag of tags) {
      const hits = await fetchHn({ keyword, tag, hitsPerPage: limit })
      for (const hit of hits) {
        if (!hit?.objectID || seen.has(hit.objectID)) continue
        seen.add(hit.objectID)
        rows.push(hitToRow(hit, keyword, tag))
      }
      await sleep(500)
    }
  }

  ensureDir(RAW_DIR)
  ensureDir(ANALYSIS_DIR)
  const stamp = nowStamp()
  const rawPath = path.join(RAW_DIR, `hn-keyword-scrape-${stamp}.json`)
  const analysisPath = path.join(ANALYSIS_DIR, `hn-keyword-analysis-${stamp}.json`)
  fs.writeFileSync(rawPath, JSON.stringify(rows, null, 2), "utf8")

  const { rows: filteredRows, quality } = dedupeAndFilter(rows, {
    minRelevance,
    minEngagement,
  })
  const analysis = buildAnalysis(filteredRows, quality)
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2), "utf8")

  const report = buildReport({ keywords, tags, analysis, rawPath })
  fs.writeFileSync(REPORT_PATH, report, "utf8")

  console.log(`OK: fetched ${rows.length} unique HN records`)
  console.log(`OK: kept ${filteredRows.length} records after quality filtering`)
  console.log(`RAW: ${path.relative(ROOT, rawPath)}`)
  console.log(`ANALYSIS: ${path.relative(ROOT, analysisPath)}`)
  console.log(`REPORT: ${path.relative(ROOT, REPORT_PATH)}`)
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`)
  process.exit(1)
})
