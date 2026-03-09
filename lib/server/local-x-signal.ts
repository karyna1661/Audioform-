import fs from "node:fs"
import path from "node:path"
import { localContentSchedule, type ContentScheduleItem } from "@/lib/local-content-schedule"

type XAnalysis = {
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
    likeCount: number
    retweetCount: number
    replyCount: number
    quoteCount: number
    lang: string
    searchTermIndex: number | null
    engagementScore: number
  }>
  topTerms: Array<[string, number]>
  topHashtags: Array<[string, number]>
  languages: Array<{ lang: string; count: number }>
}

function projectRoot(): string {
  return process.cwd()
}

function latestAnalysisPath(): string | null {
  const analysisDir = path.join(projectRoot(), "data", "apify", "analysis")
  if (!fs.existsSync(analysisDir)) return null
  const files = fs
    .readdirSync(analysisDir)
    .filter((file) => file.startsWith("x-keyword-analysis-") && file.endsWith(".json"))
    .sort()
    .reverse()
  if (!files.length) return null
  return path.join(analysisDir, files[0])
}

function buildRecommendedPosts(analysis: XAnalysis): ContentScheduleItem[] {
  const terms = new Set(analysis.topTerms.slice(0, 12).map(([term]) => term.toLowerCase()))
  const platformPriority: Array<ContentScheduleItem["platform"]> = ["X", "LinkedIn", "Farcaster"]
  const scored = localContentSchedule.map((item) => {
    const text = `${item.title} ${item.hook} ${item.body} ${item.cta}`.toLowerCase()
    let score = 0
    for (const term of terms) {
      if (text.includes(term)) score += 2
    }
    if (analysis.patterns.nonQuestionPostAvgEngagement > analysis.patterns.questionPostAvgEngagement && !item.hook.includes("?")) {
      score += 2
    }
    if (item.platform === "X") score += 3
    if (item.pillar === "Problem" || item.pillar === "Education" || item.pillar === "Proof") score += 1
    return { item, score }
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const platformDiff = platformPriority.indexOf(a.item.platform) - platformPriority.indexOf(b.item.platform)
    if (platformDiff !== 0) return platformDiff
    return a.item.day - b.item.day
  })

  return scored.slice(0, 6).map((entry) => entry.item)
}

export function getLocalXSignalSnapshot(): {
  fileName: string | null
  analysis: XAnalysis | null
  recommendations: ContentScheduleItem[]
  summary: {
    primaryAngle: string
    formatBias: string
    caution: string
  } | null
} {
  const analysisPath = latestAnalysisPath()
  if (!analysisPath) {
    return {
      fileName: null,
      analysis: null,
      recommendations: [],
      summary: null,
    }
  }

  const raw = fs.readFileSync(analysisPath, "utf8")
  const analysis = JSON.parse(raw) as XAnalysis
  const recommendations = buildRecommendedPosts(analysis)

  const topTheme = analysis.topTerms[0]?.[0] || "feedback"
  const secondaryTheme = analysis.topTerms[1]?.[0] || "survey"
  const prefersStatements = analysis.patterns.nonQuestionPostAvgEngagement > analysis.patterns.questionPostAvgEngagement

  return {
    fileName: path.basename(analysisPath),
    analysis,
    recommendations,
    summary: {
      primaryAngle: `Lead with declarative tension around ${topTheme} and ${secondaryTheme}, then bridge to builder pain.`,
      formatBias: prefersStatements
        ? "Statement-led posts are outperforming question-led posts in this dataset."
        : "Question-led posts are competitive enough to test directly.",
      caution: "The dataset contains broad survey/feedback chatter, so keep using builder-specific framing instead of generic engagement bait.",
    },
  }
}

