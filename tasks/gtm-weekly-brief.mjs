#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const REDDIT_ANALYSIS_DIR = path.join(ROOT, "data", "reddit", "analysis")
const HN_ANALYSIS_DIR = path.join(ROOT, "data", "hn", "analysis")
const OUTPUT_PATH = path.join(ROOT, "future-work", "audioform-weekly-signal-brief.md")

function latestFile(dirPath, prefix) {
  if (!fs.existsSync(dirPath)) return null
  const files = fs
    .readdirSync(dirPath)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
    .map((f) => path.join(dirPath, f))
  if (!files.length) return null
  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  return files[0]
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

function topTermsMap(analysis, limit = 20) {
  const arr = Array.isArray(analysis?.topTerms) ? analysis.topTerms.slice(0, limit) : []
  const map = new Map()
  for (const item of arr) {
    if (!Array.isArray(item) || item.length < 2) continue
    map.set(String(item[0]), Number(item[1]))
  }
  return map
}

function intersectTerms(mapA, mapB) {
  const out = []
  for (const [term, countA] of mapA.entries()) {
    if (!mapB.has(term)) continue
    const countB = mapB.get(term)
    out.push({ term, score: countA + countB, reddit: countA, hn: countB })
  }
  out.sort((a, b) => b.score - a.score)
  return out
}

function topRowsFromAnalysis(name, analysis, limit = 5) {
  const posts = Array.isArray(analysis.topPosts)
    ? analysis.topPosts
    : Array.isArray(analysis.topRows)
      ? analysis.topRows
      : []
  return posts.slice(0, limit).map((row) => ({
    source: name,
    text:
      row.title ||
      row.text ||
      row.selftext ||
      "",
    engagement:
      row.engagementScore ??
      0,
    url: row.permalink || row.url || "",
  }))
}

function truncate(s, n = 160) {
  const t = String(s || "").replace(/\s+/g, " ").trim()
  return t.length > n ? `${t.slice(0, n)}...` : t
}

function buildBrief({ redditPath, hnPath, reddit, hn }) {
  const now = new Date().toISOString()
  const redditTerms = topTermsMap(reddit)
  const hnTerms = topTermsMap(hn)
  const overlaps = intersectTerms(redditTerms, hnTerms).slice(0, 12)

  const redditItems = Number(reddit?.totals?.items ?? 0)
  const hnItems = Number(hn?.totals?.items ?? 0)
  const totalItems = redditItems + hnItems

  const leaders = [
    ...topRowsFromAnalysis("reddit", reddit, 4),
    ...topRowsFromAnalysis("hn", hn, 4),
  ].sort((a, b) => b.engagement - a.engagement)

  const lines = []
  lines.push("# Audioform Weekly Signal Brief")
  lines.push("")
  lines.push(`Generated at: ${now}`)
  lines.push(`Sources:`)
  lines.push(`- Reddit analysis: \`${path.relative(ROOT, redditPath)}\``)
  lines.push(`- Hacker News analysis: \`${path.relative(ROOT, hnPath)}\``)
  lines.push("")
  lines.push("## Snapshot")
  lines.push(`- Total items analyzed: \`${totalItems}\``)
  lines.push(`- Reddit items: \`${redditItems}\``)
  lines.push(`- HN items: \`${hnItems}\``)
  lines.push("")
  lines.push("## Cross-Channel Themes")
  if (!overlaps.length) {
    lines.push("- No strong overlapping terms this week; review source-specific themes.")
  } else {
    for (const item of overlaps) {
      lines.push(`- ${item.term} (reddit=${item.reddit}, hn=${item.hn})`)
    }
  }
  lines.push("")
  lines.push("## Top Conversations")
  for (const row of leaders.slice(0, 8)) {
    lines.push(`- [${row.source}] eng=${row.engagement}: ${truncate(row.text)}`)
    if (row.url) lines.push(`  - ${row.url}`)
  }
  lines.push("")
  lines.push("## This Week JTBD Actions")
  lines.push("1. Messaging job: update 3 homepage/social lines with top cross-channel terms.")
  lines.push("2. Content job: publish one contrarian post + one list post based on top conversation themes.")
  lines.push("3. Product job: run one dogfooding survey prompt tied to highest-friction theme.")
  lines.push("4. Distribution job: post one proof artifact linking product change to voice feedback signal.")
  lines.push("")
  lines.push("## Dogfooding Link")
  lines.push("- Execute against: `future-work/audioform-dogfooding-program.md`")
  lines.push("")
  return `${lines.join("\n")}\n`
}

function main() {
  const redditPath = latestFile(REDDIT_ANALYSIS_DIR, "reddit-keyword-analysis-")
  const hnPath = latestFile(HN_ANALYSIS_DIR, "hn-keyword-analysis-")
  if (!redditPath || !hnPath) {
    throw new Error("Missing analysis files. Run `npm run gtm:reddit` and `npm run gtm:hn` first.")
  }

  const reddit = readJson(redditPath)
  const hn = readJson(hnPath)
  const brief = buildBrief({ redditPath, hnPath, reddit, hn })
  fs.writeFileSync(OUTPUT_PATH, brief, "utf8")

  console.log(`OK: generated weekly brief`)
  console.log(`OUTPUT: ${path.relative(ROOT, OUTPUT_PATH)}`)
}

try {
  main()
} catch (err) {
  console.error(`ERROR: ${err.message}`)
  process.exit(1)
}
