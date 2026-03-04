#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const ENV_PATH = path.join(ROOT, ".env")
const RAW_DIR = path.join(ROOT, "data", "apify", "scrapes")
const ANALYSIS_DIR = path.join(ROOT, "data", "apify", "analysis")
const REPORT_PATH = path.join(ROOT, "future-work", "audioform-apify-dataset-insight-report.md")

const DEFAULT_ACTOR_ID = "CJdippxWmn9uRfooo"
const DEFAULT_FALLBACK_ACTOR_ID = "0oVSlMlAX47R2EyoP"
const DEFAULT_FALLBACK_DATASET_ID = "rEylDI8TrA4ZVmmzh"
const DEFAULT_MAX_ITEMS = 200
const DEFAULT_QUERY_TYPE = "Latest"
const DEFAULT_LANGUAGE = "en"
const DEFAULT_SINCE = "2025-01-01_00:00:00_UTC"
const DEFAULT_KEYWORDS = [
  '"build in public" (feedback OR "user feedback" OR "product feedback")',
  '("indie hacker" OR founder) (feedback OR "beta feedback") (product OR app)',
  '("voice feedback" OR "audio feedback") (startup OR SaaS OR product)',
  '("ship in public" OR "building in public") (users OR community) feedback',
  '("product iteration" OR roadmap) (user feedback OR customer feedback) startup',
]

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "")
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
  if (!text) return ""
  const normalized = String(text).replace(/\s+/g, " ").trim()
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized
}

function computeEngagement(item) {
  const likes = Number(item.likeCount ?? 0)
  const reposts = Number(item.retweetCount ?? 0)
  const replies = Number(item.replyCount ?? 0)
  const quotes = Number(item.quoteCount ?? 0)
  return likes + 2 * reposts + replies + quotes
}

function buildAnalysis(items) {
  const rows = items.map((item) => ({
    id: item.id ?? "",
    text: String(item.text ?? ""),
    createdAt: item.createdAt ?? "",
    likeCount: Number(item.likeCount ?? 0),
    retweetCount: Number(item.retweetCount ?? 0),
    replyCount: Number(item.replyCount ?? 0),
    quoteCount: Number(item.quoteCount ?? 0),
    lang: String(item.lang ?? ""),
    searchTermIndex: item.searchTermIndex ?? null,
    engagementScore: computeEngagement(item),
  }))

  const total = rows.length
  const sum = (arr, key) => arr.reduce((acc, cur) => acc + Number(cur[key] ?? 0), 0)
  const avg = (arr, key) => (arr.length ? sum(arr, key) / arr.length : 0)
  const questionPosts = rows.filter((r) => r.text.includes("?"))
  const listPosts = rows.filter((r) => /\\b1\\.|\\b2\\.|\\b3\\./.test(r.text))

  const topPosts = [...rows].sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 10)

  const stopwords = new Set([
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
    "amp",
  ])
  const termCount = new Map()
  const hashtagCount = new Map()
  for (const row of rows) {
    const words = row.text.toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? []
    for (const word of words) {
      if (stopwords.has(word)) continue
      termCount.set(word, (termCount.get(word) ?? 0) + 1)
    }
    const tags = row.text.toLowerCase().match(/#[a-z0-9_]+/g) ?? []
    for (const tag of tags) {
      hashtagCount.set(tag, (hashtagCount.get(tag) ?? 0) + 1)
    }
  }

  const topTerms = [...termCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
  const topHashtags = [...hashtagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  const languages = [...new Map(rows.map((r) => [r.lang || "unknown", 0])).keys()].map((lang) => ({
    lang,
    count: rows.filter((r) => (r.lang || "unknown") === lang).length,
  }))
  languages.sort((a, b) => b.count - a.count)

  return {
    totals: {
      items: total,
      avgLikes: Number(avg(rows, "likeCount").toFixed(2)),
      avgReposts: Number(avg(rows, "retweetCount").toFixed(2)),
      avgReplies: Number(avg(rows, "replyCount").toFixed(2)),
      avgEngagementScore: Number(avg(rows, "engagementScore").toFixed(2)),
    },
    patterns: {
      questionPostCount: questionPosts.length,
      questionPostAvgEngagement: Number(avg(questionPosts, "engagementScore").toFixed(2)),
      nonQuestionPostAvgEngagement: Number(avg(rows.filter((r) => !r.text.includes("?")), "engagementScore").toFixed(2)),
      listPostCount: listPosts.length,
      listPostAvgEngagement: Number(avg(listPosts, "engagementScore").toFixed(2)),
      nonListPostAvgEngagement: Number(avg(rows.filter((r) => !/\\b1\\.|\\b2\\.|\\b3\\./.test(r.text)), "engagementScore").toFixed(2)),
    },
    topPosts,
    topTerms,
    topHashtags,
    languages: languages.slice(0, 8),
  }
}

function buildMarkdownReport({
  actorId,
  startedAt,
  savedRawPath,
  analysis,
  keywords,
}) {
  const lines = []
  lines.push("# Audioform Apify Dataset Insight Report")
  lines.push("")
  lines.push(`Date: ${new Date().toISOString().slice(0, 10)}`)
  lines.push(`Source Actor ID: \`${actorId}\``)
  lines.push(`Raw data file: \`${path.relative(ROOT, savedRawPath)}\``)
  lines.push(`Run started at: \`${startedAt}\``)
  lines.push("")
  lines.push("## Query Terms")
  for (const term of keywords) lines.push(`- ${term}`)
  lines.push("")
  lines.push("## Quant Snapshot")
  lines.push(`- Rows analyzed: \`${analysis.totals.items}\``)
  lines.push(`- Avg likes: \`${analysis.totals.avgLikes}\``)
  lines.push(`- Avg reposts: \`${analysis.totals.avgReposts}\``)
  lines.push(`- Avg replies: \`${analysis.totals.avgReplies}\``)
  lines.push(`- Avg engagement score: \`${analysis.totals.avgEngagementScore}\``)
  lines.push("")
  lines.push("## Pattern Findings")
  lines.push(`- Question posts count: \`${analysis.patterns.questionPostCount}\``)
  lines.push(`- Question posts avg engagement: \`${analysis.patterns.questionPostAvgEngagement}\``)
  lines.push(`- Non-question posts avg engagement: \`${analysis.patterns.nonQuestionPostAvgEngagement}\``)
  lines.push(`- List posts count: \`${analysis.patterns.listPostCount}\``)
  lines.push(`- List posts avg engagement: \`${analysis.patterns.listPostAvgEngagement}\``)
  lines.push(`- Non-list posts avg engagement: \`${analysis.patterns.nonListPostAvgEngagement}\``)
  lines.push("")
  lines.push("## Top Terms")
  for (const [term, count] of analysis.topTerms) lines.push(`- ${term}: ${count}`)
  lines.push("")
  lines.push("## Top Hashtags")
  if (analysis.topHashtags.length === 0) {
    lines.push("- None")
  } else {
    for (const [tag, count] of analysis.topHashtags) lines.push(`- ${tag}: ${count}`)
  }
  lines.push("")
  lines.push("## Top Languages")
  for (const item of analysis.languages) lines.push(`- ${item.lang}: ${item.count}`)
  lines.push("")
  lines.push("## Top Posts (Engagement)")
  for (const post of analysis.topPosts) {
    lines.push(
      `- [eng=${post.engagementScore}] likes=${post.likeCount}, reposts=${post.retweetCount}, replies=${post.replyCount}: ${truncate(post.text)}`
    )
  }
  lines.push("")
  lines.push("## Immediate GTM Actions")
  lines.push("1. Publish one declarative tension post from the top recurring term cluster.")
  lines.push("2. Publish one list-structured post (3-5 bullets) tied to a builder workflow.")
  lines.push("3. Turn top performing theme into one case-study post with concrete CTA.")
  lines.push("4. Feed top terms into messaging matrix and next-week content brief.")
  lines.push("")
  return `${lines.join("\n")}\n`
}

async function run() {
  loadEnv(ENV_PATH)

  const token = process.env.APIFY_TOKEN || process.env.Apify_API
  if (!token) {
    throw new Error("Missing APIFY_TOKEN (or Apify_API) in .env")
  }

  const actorId = process.env.APIFY_ACTOR_ID || DEFAULT_ACTOR_ID
  const fallbackActorId = process.env.APIFY_FALLBACK_ACTOR_ID || DEFAULT_FALLBACK_ACTOR_ID
  const fallbackDatasetId = process.env.APIFY_FALLBACK_DATASET_ID || DEFAULT_FALLBACK_DATASET_ID
  const parsedMaxItems = Number(process.env.APIFY_MAX_ITEMS ?? DEFAULT_MAX_ITEMS)
  const maxItems = Number.isFinite(parsedMaxItems) && parsedMaxItems > 0 ? parsedMaxItems : DEFAULT_MAX_ITEMS
  const queryType = process.env.APIFY_QUERY_TYPE || DEFAULT_QUERY_TYPE
  const lang = process.env.APIFY_LANG || DEFAULT_LANGUAGE
  const since = process.env.APIFY_SINCE || DEFAULT_SINCE
  const keywords = process.env.APIFY_KEYWORDS
    ? process.env.APIFY_KEYWORDS.split("||").map((v) => v.trim()).filter(Boolean)
    : DEFAULT_KEYWORDS

  const primaryPayload = {
    searchTerms: keywords,
    maxItems,
    queryType,
    lang,
    since,
  }
  const fallbackPayload = {
    query: keywords[0],
    maxItems,
  }

  const startedAt = new Date().toISOString()
  async function callActor(targetActorId, payload, runMaxItems) {
    const endpoint = `https://api.apify.com/v2/acts/${targetActorId}/run-sync-get-dataset-items?token=${encodeURIComponent(
      token
    )}&format=json&clean=true&maxItems=${encodeURIComponent(String(runMaxItems))}`
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const text = await response.text()
    return { ok: response.ok, status: response.status, text, actorId: targetActorId }
  }
  async function fetchDatasetItems(datasetId) {
    const endpoint = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(
      token
    )}&clean=true&format=json`
    const response = await fetch(endpoint, { method: "GET" })
    const text = await response.text()
    return { ok: response.ok, status: response.status, text, datasetId }
  }

  const primary = await callActor(actorId, primaryPayload, maxItems)
  let chosenActor = actorId
  let rawText = primary.text
  let dataSource = `actor:${actorId}`
  if (!primary.ok) {
    const fallback = await callActor(fallbackActorId, fallbackPayload, maxItems)
    if (!fallback.ok) {
      const primaryPaidBlocked = primary.status === 402
      const fallbackPaidBlocked = fallback.status === 402
      if (primaryPaidBlocked && fallbackPaidBlocked) {
        const datasetFallback = await fetchDatasetItems(fallbackDatasetId)
        if (!datasetFallback.ok) {
          throw new Error(
            `Primary actor failed (${primary.status}), fallback actor failed (${fallback.status}), and dataset fallback failed (${datasetFallback.status}).`
          )
        }
        chosenActor = `dataset:${fallbackDatasetId}`
        rawText = datasetFallback.text
        dataSource = `dataset:${fallbackDatasetId}`
        console.log(
          `WARN: paid actor usage unavailable, used dataset fallback ${fallbackDatasetId}`
        )
      } else {
        throw new Error(
          `Primary actor failed (${primary.status}) and fallback failed (${fallback.status}). Primary: ${primary.text.slice(
            0,
            280
          )} | Fallback: ${fallback.text.slice(0, 280)}`
        )
      }
    } else {
      chosenActor = fallbackActorId
      rawText = fallback.text
      dataSource = `actor:${fallbackActorId}`
      console.log(`WARN: primary actor ${actorId} failed with ${primary.status}, used fallback ${fallbackActorId}`)
    }
  }

  const items = JSON.parse(rawText)
  const rows = Array.isArray(items) ? items : [items]

  ensureDir(RAW_DIR)
  ensureDir(ANALYSIS_DIR)

  const stamp = nowStamp()
  const rawPath = path.join(RAW_DIR, `x-keyword-scrape-${stamp}.json`)
  fs.writeFileSync(rawPath, JSON.stringify(rows, null, 2), "utf8")

  const analysis = buildAnalysis(rows)
  const analysisPath = path.join(ANALYSIS_DIR, `x-keyword-analysis-${stamp}.json`)
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2), "utf8")

  const report = buildMarkdownReport({
    actorId: chosenActor,
    startedAt,
    savedRawPath: rawPath,
    analysis,
    keywords,
  })
  fs.writeFileSync(REPORT_PATH, report, "utf8")

  console.log(`OK: fetched ${rows.length} items`)
  console.log(`SOURCE: ${dataSource}`)
  console.log(`RAW: ${path.relative(ROOT, rawPath)}`)
  console.log(`ANALYSIS: ${path.relative(ROOT, analysisPath)}`)
  console.log(`REPORT: ${path.relative(ROOT, REPORT_PATH)}`)
}

run().catch((err) => {
  console.error(`ERROR: ${err.message}`)
  process.exit(1)
})

