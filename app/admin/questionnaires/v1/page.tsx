"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useRequireAdmin } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle2, ChevronRight, Copy, GripVertical, Heart, LayoutTemplate, Library, Lightbulb, Plus, Rocket, Search, Sparkles, Star, Target, Trash2, Undo2 } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import { recordSurveyPublished } from "@/lib/behavior-metrics"
import { AdminMobileNav } from "@/components/admin-mobile-nav"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"


const EMPTY_QUESTIONS: string[] = []

// Question Category System
const questionCategories = [
  {
    id: "ux",
    label: "User Experience",
    description: "Confusion, friction, and usability insights",
    icon: Target,
    questions: [
      "What confused you the most when you first used this product?",
      "At what moment did you almost stop using it?",
      "What felt surprisingly easy or delightful?",
      "Walk me through your experience. What part felt confusing?",
    ],
  },
  {
    id: "product",
    label: "Product Feedback",
    description: "Missing features and improvement areas",
    icon: Lightbulb,
    questions: [
      "What problem were you hoping this product would solve?",
      "What feels missing right now?",
      "If you could change one thing, what would it be?",
      "When using this product, was there a moment you almost stopped? What happened?",
    ],
  },
  {
    id: "feature",
    label: "Feature Ideas",
    description: "Discovery of needed capabilities",
    icon: Sparkles,
    questions: [
      "What feature would make this product indispensable for you?",
      "What do you currently use instead of this product?",
      "What workflow would you love this product to support?",
      "What would make you use this product every week?",
    ],
  },
  {
    id: "market",
    label: "Market Validation",
    description: "Competitive landscape and alternatives",
    icon: Search,
    questions: [
      "How are you currently solving this problem?",
      "What frustrates you about existing solutions?",
      "What would convince you to switch to a new solution?",
      "Tell me about the last time you tried solving this problem. What made it difficult?",
    ],
  },
  {
    id: "satisfaction",
    label: "Customer Satisfaction",
    description: "Emotional response and loyalty signals",
    icon: Heart,
    questions: [
      "What was your reaction when you first saw this product?",
      "What increased or decreased your confidence?",
      "What would make you recommend this to a colleague?",
    ],
  },
  {
    id: "insight",
    label: "Open Insight",
    description: "Broad exploration and storytelling",
    icon: Star,
    questions: [
      "Tell me about the last time you tried to get feedback from users. What was frustrating about it?",
      "What's the most important outcome you're trying to achieve?",
      "Describe a moment when this product really clicked for you.",
    ],
  },
]

// Pre-built Survey Templates
const surveyTemplates = [
  {
    id: "pmf-discovery",
    label: "PMF Discovery",
    description: "Uncover product-market fit signals",
    questions: [
      "What problem were you hoping this product would solve for you?",
      "What part of the experience felt confusing or frustrating?",
      "What would make this product something you use every week?",
    ],
  },
  {
    id: "user-feedback",
    label: "User Feedback",
    description: "Understand user experience and pain points",
    questions: [
      "What problem were you hoping this product would solve?",
      "What confused you the most while using it?",
      "What feature would make you use this weekly?",
    ],
  },
  {
    id: "feature-validation",
    label: "Feature Validation",
    description: "Validate new feature ideas",
    questions: [
      "How are you currently solving this problem today?",
      "What feature would make this product indispensable?",
      "What would convince you to adopt this feature immediately?",
    ],
  },
  {
    id: "onboarding",
    label: "Onboarding Insights",
    description: "Identify onboarding friction points",
    questions: [
      "What confused you the most when you first used this product?",
      "At what moment did you almost give up?",
      "What would have made onboarding feel effortless?",
    ],
  },
  {
    id: "efr-format",
    label: "Experience → Friction → Desire",
    description: "High-signal story-based questions",
    questions: [
      "Tell me about the last time you tried to solve this problem. What was frustrating about it, and what do you wish existed instead?",
    ],
  },
]
const DEFAULT_SURVEY_TITLE = ""
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// REMOVED: starterPackOptions - Replaced by surveyTemplates in Question Intelligence System

function createSurveyId(_title: string, _creatorId: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === "x" ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

function ensureSurveyId(candidate: string | null | undefined, title: string, creatorId: string): string {
  if (candidate && UUID_PATTERN.test(candidate)) {
    return candidate
  }

  return createSurveyId(title, creatorId)
}

function reorderQuestionList(questions: string[], fromIndex: number, toIndex: number): string[] {
  const next = [...questions]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

function remapSelectedIndexForReorder(currentSelected: number, fromIndex: number, toIndex: number): number {
  if (currentSelected === fromIndex) return toIndex
  if (fromIndex < currentSelected && currentSelected <= toIndex) return currentSelected - 1
  if (toIndex <= currentSelected && currentSelected < fromIndex) return currentSelected + 1
  return currentSelected
}

function evaluateQuestionQuality(question: string): {
  score: number
  checks: Array<{ label: string; ok: boolean }>
} {
  const text = question.trim()
  const lower = text.toLowerCase()
  const questionMarks = (text.match(/\?/g) || []).length
  const words = text.split(/\s+/).filter(Boolean).length

  const checks = [
    { label: "Enough context (8+ words)", ok: words >= 8 },
    { label: "Asks one question", ok: questionMarks <= 1 },
    {
      label: "Open-ended phrasing",
      ok: /^(what|how|where|which|describe|tell)\b/i.test(lower),
    },
    {
      label: "Has concrete anchor (moment/example/timeframe)",
      ok: /(last|week|day|moment|example|specific|when|where|task|step|flow)\b/i.test(lower),
    },
    {
      label: "Avoids yes/no framing",
      ok: !/^(is|are|do|did|can|will|would|should|could)\b/i.test(lower),
    },
  ]

  const passed = checks.filter((item) => item.ok).length
  return {
    score: Math.round((passed / checks.length) * 100),
    checks,
  }
}

export default function QuestionnairesV1Page() {
  const { status, user } = useRequireAdmin()
  const searchParams = useSearchParams()
  const requestedSurveyId = searchParams.get("surveyId")
  const [questions, setQuestions] = useState(EMPTY_QUESTIONS)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [questionHistory, setQuestionHistory] = useState<Array<{ questions: string[]; selectedIndex: number }>>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [title, setTitle] = useState(DEFAULT_SURVEY_TITLE)
  const [draftSurveyId, setDraftSurveyId] = useState("")
  const [draftMessage, setDraftMessage] = useState<string | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishedSurveyId, setPublishedSurveyId] = useState<string | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [showTemplates, setShowTemplates] = useState(true) // Toggle for mobile: templates vs categories
  const [mobileStep, setMobileStep] = useState(0)

  const commitQuestionChange = useCallback(
    (nextQuestions: string[], nextSelectedIndex: number) => {
      const safeSelected = Math.min(Math.max(nextSelectedIndex, 0), Math.max(nextQuestions.length - 1, 0))
      if (
        nextQuestions.length === questions.length &&
        nextQuestions.every((question, index) => question === questions[index]) &&
        safeSelected === selectedIndex
      ) {
        return
      }
      setQuestionHistory((prev) => [...prev.slice(-79), { questions: [...questions], selectedIndex }])
      setQuestions(nextQuestions)
      setSelectedIndex(safeSelected)
    },
    [questions, selectedIndex],
  )

  const undoQuestionChange = useCallback(() => {
    let restored = false
    setQuestionHistory((prev) => {
      const snapshot = prev[prev.length - 1]
      if (!snapshot) return prev
      restored = true
      setQuestions(snapshot.questions)
      setSelectedIndex(Math.min(snapshot.selectedIndex, Math.max(snapshot.questions.length - 1, 0)))
      return prev.slice(0, -1)
    })
    if (!restored) {
      setDraftMessage("Nothing to undo yet.")
    } else {
      setDraftMessage("Last question change undone.")
    }
  }, [])

  const startNewDraft = useCallback(() => {
    setDraftSurveyId(createSurveyId(DEFAULT_SURVEY_TITLE, user?.id || "creator"))
    setPublishedSurveyId(null)
    setTitle(DEFAULT_SURVEY_TITLE)
    setQuestions(EMPTY_QUESTIONS)
    setSelectedIndex(0)
    setQuestionHistory([])
    setDraggedIndex(null)
    setDragOverIndex(null)
    window.localStorage.removeItem("audioform_survey_draft_v1")
    setDraftMessage("Started a new draft. Previous saved drafts are still available from dashboard.")
    trackEvent("creator_clicked_start", {
      source: requestedSurveyId ? "loaded_draft" : "builder",
    })
  }, [requestedSurveyId, user?.id])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault()
        undoQuestionChange()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [undoQuestionChange])

  const saveSurvey = async (nextStatus: "draft" | "published") => {
    const surveyId = ensureSurveyId(draftSurveyId, title, user?.id || "creator")
    if (draftSurveyId !== surveyId) {
      setDraftSurveyId(surveyId)
    }
    const normalizedQuestions = questions.map((q) => q.trim()).filter((q) => q.length > 0)
    const payload = {
      id: surveyId,
      title: title.trim(),
      questions: normalizedQuestions,
      questionCount: normalizedQuestions.length,
      status: nextStatus,
    }

    const response = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string; details?: string }
      throw new Error(body.details || body.error || "Failed to save survey.")
    }

    return surveyId
  }

  const saveDraft = useCallback(async () => {
    if (!title.trim()) {
      setDraftMessage("Add a survey title before saving.")
      return
    }

    setIsSavingDraft(true)
    const savedAt = new Date().toISOString()
    window.localStorage.setItem(
      "audioform_survey_draft_v1",
      JSON.stringify({
        surveyId: draftSurveyId || createSurveyId(title, user?.id || "creator"),
        title,
        questions,
        savedAt,
      }),
    )

    try {
      await saveSurvey("draft")
      setDraftMessage(`Draft saved at ${new Date(savedAt).toLocaleString()}`)
      trackEvent("survey_draft_saved", {
        question_count: questions.length,
      })
    } catch (error) {
      setDraftMessage(error instanceof Error ? error.message : "Failed to save draft.")
    } finally {
      setIsSavingDraft(false)
    }
  }, [draftSurveyId, questions, title, user?.id])

  useEffect(() => {
    const rawDraft = window.localStorage.getItem("audioform_survey_draft_v1")
    if (!rawDraft) return

    try {
      const parsed = JSON.parse(rawDraft) as {
        surveyId?: string
        title?: string
        questions?: string[]
        savedAt?: string
      }
      if (parsed.title) setTitle(parsed.title)
      if (parsed.surveyId) setDraftSurveyId(ensureSurveyId(parsed.surveyId, parsed.title || DEFAULT_SURVEY_TITLE, user?.id || "creator"))
      if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        setQuestions(parsed.questions)
        setSelectedIndex(0)
      }
      if (parsed.savedAt) {
        setDraftMessage(`Loaded draft saved at ${new Date(parsed.savedAt).toLocaleString()}`)
      }
    } catch {
      setDraftMessage("Found a corrupted local draft. Save again to overwrite it.")
    }
  }, [user?.id])

  useEffect(() => {
    if (status === "loading" || draftSurveyId) return
    setDraftSurveyId(createSurveyId(title, user?.id || "creator"))
  }, [status, draftSurveyId, title, user?.id])

  useEffect(() => {
    if (status !== "authenticated" || !requestedSurveyId) return
    let canceled = false

    const loadDraftById = async () => {
      setDraftLoading(true)
      try {
        const response = await fetch(`/api/surveys?id=${encodeURIComponent(requestedSurveyId)}`, {
          credentials: "include",
          cache: "no-store",
        })
        if (!response.ok) throw new Error("Failed to load draft.")
        const json = (await response.json()) as {
          survey?: {
            id: string
            title: string
            status?: "draft" | "published"
            questions?: string[]
          }
        }
        const survey = json.survey
        if (!survey || canceled) return

        setDraftSurveyId(survey.id)
        setTitle(survey.title || DEFAULT_SURVEY_TITLE)
        if (Array.isArray(survey.questions)) {
          setQuestions(survey.questions)
          setSelectedIndex(0)
        }
        setDraftMessage(
          survey.status === "published"
            ? "Loaded published survey. You can update and republish."
            : "Draft loaded. Continue editing and publish when ready.",
        )
      } catch (error) {
        if (!canceled) {
          setDraftMessage(error instanceof Error ? error.message : "Failed to load draft.")
        }
      } finally {
        if (!canceled) setDraftLoading(false)
      }
    }

    void loadDraftById()
    return () => {
      canceled = true
    }
  }, [status, requestedSurveyId])

  if (status === "loading" || draftLoading) return <SurveyLoadingSkeleton label="Loading survey builder..." />

  const selected = questions[selectedIndex] || ""
  const selectedQuestionQuality = evaluateQuestionQuality(selected)
  const averageQuestionQuality = questions.length > 0
    ? Math.round(questions.reduce((sum, q) => sum + evaluateQuestionQuality(q).score, 0) / questions.length)
    : 0
  const minimumQualityThreshold = 60
  const nonEmptyPromptCount = questions.filter((q) => q.trim().length > 0).length
  const readyChecks = {
    hasTitle: title.trim().length > 0,
    hasPrompt: nonEmptyPromptCount >= 1,
    hasDepthPrompt: questions.some((q) => q.length > 40),
  }
  const readinessItems = [
    { ok: readyChecks.hasTitle, label: "Title" },
    { ok: readyChecks.hasPrompt, label: "Prompt flow (1+ prompt)" },
    { ok: readyChecks.hasDepthPrompt, label: "Depth prompt" },
  ]
  const completionScore =
    readinessItems.reduce((sum, item) => sum + Number(item.ok), 0) / readinessItems.length
  const builderOnboardingChecklist = [
    {
      id: "questions",
      label: "Add 1+ high-quality prompt",
      done: readyChecks.hasPrompt && selectedQuestionQuality.score >= 80,
    },
    {
      id: "quality",
      label: "Reach 80%+ quality on all prompts",
      done: averageQuestionQuality >= 80,
    },
    {
      id: "publish",
      label: "Publish and share your survey",
      done: Boolean(publishedSurveyId),
    },
  ]

  const creatorId = user?.id || ""
  const mobileSteps = ["Brief", "Source", "Sequence", "Refine", "Publish"]
  const mobileSectionClass = (step: number) => (mobileStep === step ? "block" : "hidden lg:block")
  const mobileRangeSectionClass = (steps: number[]) => (steps.includes(mobileStep) ? "block" : "hidden lg:block")
  const mobileGridSectionClass = (step: number) => (mobileStep === step ? "grid" : "hidden lg:grid")
  const surveyLink =
    publishedSurveyId
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/survey/${encodeURIComponent(
          publishedSurveyId,
        )}?v=${Date.now()}`
      : ""
  const embedLink =
    publishedSurveyId && creatorId
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/embed/by-creator/${creatorId}/${publishedSurveyId}`
      : ""
  const iframeSnippet = publishedSurveyId
    ? `<iframe src="${embedLink}" width="100%" height="760" style="border:0;border-radius:16px;" title="Audioform survey"></iframe>`
    : ""
  const scriptSnippet = publishedSurveyId
    ? `<div id="audioform-embed"></div>\n<script src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/widget.js" data-survey-id="${publishedSurveyId}" data-creator-id="${creatorId}" data-target="audioform-embed" data-height="760"></script>`
    : ""
  const workingRuleCopy = "Keep this to 2-3 prompts, ask for one concrete moment, and avoid anything that can be answered with yes or no."
  const qualityCoachCopy = "Target 80%+ before publish. Ask for one concrete moment, not a rating or yes/no answer."
  const releaseDeskCopy = "Publish when the title is clear, the sequence is short, and each prompt asks for one concrete moment."

  return (
    <main className={`af-shell min-h-dvh p-3 pb-28 sm:p-6 sm:pb-6`}>
      <div className="af-panel af-fade-up mx-auto max-w-7xl rounded-[1.7rem] border border-[#cfbea4] p-3 sm:rounded-[2.2rem] sm:p-6">
        <header className="af-fade-up af-delay-1 border-b border-[#cfbea4] pb-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="max-w-3xl">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.22em] text-[#7a6146]">Research Desk</p>
              <h1 className="mt-3 text-[clamp(1.85rem,7.5vw,3rem)] font-semibold leading-[0.96] text-balance">
                Build a voice survey that yields decision-grade signal.
              </h1>
              <p className="font-body mt-4 max-w-2xl text-sm leading-6 text-[#665746] text-pretty sm:text-[15px]">
                Start with a proven prompt angle, keep the sequence short, and publish only when every question feels specific enough to earn a real story.
              </p>
            </div>
            <div className="hidden flex-wrap gap-2 lg:justify-self-end lg:justify-end lg:self-start lg:flex">
              <Link href="/admin/dashboard/v4">
                <Button variant="outline" className="border-[#cfbea4] bg-[#efe3cf]">
                  <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
                  Back to dashboard
                </Button>
              </Link>
              <Button
                variant="outline"
                className="border-[#cfbea4] bg-[#efe3cf]"
                onClick={startNewDraft}
              >
                New draft
              </Button>
              <Button
                className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]"
                onClick={() => void saveDraft()}
                disabled={isSavingDraft}
              >
                {isSavingDraft ? "Saving..." : "Save draft"}
              </Button>
            </div>
          </div>

          <div className="mt-5 rounded-[1.4rem] border border-[#d7c6b0] bg-[#fff8f0] px-4 py-2">
            <div className="af-marquee" aria-label="Working rule">
              <p className="af-marquee-track font-body text-sm text-[#665746]">
                <span>Working rule: {workingRuleCopy}</span>
                <span aria-hidden="true">Working rule: {workingRuleCopy}</span>
              </p>
            </div>
          </div>
        </header>
        {draftMessage ? (
          <p className="font-body mt-3 rounded-2xl border border-[#cfbea4] bg-[#fff8f0] px-4 py-3 text-sm text-[#665746]">{draftMessage}</p>
        ) : null}

        <section className="mt-4 rounded-[1.3rem] border border-[#cfbea4] bg-[#fff8f0] p-3 sm:rounded-[1.6rem] sm:p-4 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6146]">Step {mobileStep + 1} of {mobileSteps.length}: {mobileSteps[mobileStep]}</p>
            </div>
            <p className="font-body text-xs text-[#665746]">{questions.length} prompts</p>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {mobileSteps.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setMobileStep(index)}
                className={`min-w-10 shrink-0 rounded-full px-3 py-2 text-[11px] font-semibold transition-colors ${mobileStep === index ? "bg-[#b85e2d] text-[#fff6ed]" : "bg-[#efe3cf] text-[#7a6146]"}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <p className="font-body mt-3 hidden text-sm leading-6 text-[#665746] sm:block">
            Focus on one decision at a time: name the survey, choose a source, arrange prompts, refine the wording, then publish.
          </p>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <section className={`af-accent-card af-fade-up af-delay-1 overflow-hidden rounded-3xl border border-[#cfbea4] ${mobileSectionClass(0)}`}>
              <div className="border-b border-[#cfbea4] bg-[#f6ead8] px-5 py-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a6146]">Builder Brief</p>
              </div>
              <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)] lg:items-start">
                <div>
                  <label className="block text-sm font-semibold" htmlFor="survey-title">
                    Survey title
                  </label>
                  <input
                    id="survey-title"
                    className="mt-2 w-full rounded-2xl border border-[#cfbea4] bg-[#fffdf8] px-4 py-3 text-base"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <p className="font-body mt-3 max-w-xl text-sm leading-6 text-[#665746]">
                    Name the conversation after the decision it should inform. A strong title feels like a working brief, not a generic feedback form.
                  </p>
                </div>
                <div className="hidden rounded-[1.6rem] border border-[#cfbea4] bg-[#fff8f0] p-4 sm:block">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7a6146]">Publishing standard</p>
                  <p className="mt-2 text-lg font-semibold text-[#6e3316]">Short, pointed, replayable.</p>
                  <p className="font-body mt-2 text-sm leading-6 text-[#665746]">
                    The best surveys here stay tight: 2-3 prompts, one friction moment, one concrete example, one clear suggestion.
                  </p>
                </div>
              </div>
              <div className="border-t border-[#cfbea4] bg-[#fff8f0] px-5 py-4 lg:hidden">
                <div className="flex justify-end">
                  <Button onClick={() => setMobileStep(1)} className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]">
                    Next: Prompt source
                  </Button>
                </div>
              </div>
            </section>

            <section className={`af-accent-card af-fade-up af-delay-2 overflow-hidden rounded-3xl border border-[#cfbea4] ${mobileRangeSectionClass([1, 2, 3])}`}>
              <div className="border-b border-[#cfbea4] bg-[#f6ead8] px-5 py-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a6146]">Prompt Studio</p>
              </div>
              <div className="p-5">
                <div className={`rounded-[1.8rem] border border-[#cfbea4] bg-[#fff7ee] p-4 sm:p-5 ${mobileSectionClass(1)}`}>
                  <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_280px] lg:items-start">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a6146]">Prompt source</p>
                      <h2 className="mt-2 text-2xl font-semibold text-[#261c14]">Start with a research angle, then shape the sequence.</h2>
                      <p className="font-body mt-2 max-w-2xl text-sm leading-6 text-[#665746]">
                        Templates give you a strong opening move. Categories help you add the missing tension, context, or desire without bloating the survey.
                      </p>
                    </div>
                    <div className="hidden rounded-[1.4rem] border border-[#d8c7b3] bg-[#fffdf8] p-4 lg:block">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7a6146]">Editor note</p>
                      <p className="mt-2 text-sm leading-6 text-[#665746]">
                        If the sequence drifts past three prompts, trim it. More questions usually lowers honesty and depth.
                      </p>
                    </div>
                  </div>

                  {/* Mobile Toggle - Only visible on small screens */}
                    <div className="mb-4 flex rounded-xl border border-[#cfbea4] bg-[#fffdf8] p-1 sm:hidden">
                      <button
                        type="button"
                        onClick={() => setShowTemplates(true)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                          showTemplates
                            ? "bg-[#b85e2d] text-[#fff6ed]"
                            : "text-[#665746] hover:bg-[#f8efdf]"
                        }`}
                      >
                        <LayoutTemplate className="size-4" aria-hidden="true" />
                        Templates
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTemplates(false)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                          !showTemplates
                            ? "bg-[#b85e2d] text-[#fff6ed]"
                            : "text-[#665746] hover:bg-[#f8efdf]"
                        }`}
                      >
                        <Library className="size-4" aria-hidden="true" />
                        Categories
                      </button>
                    </div>

                  {/* Survey Templates Section */}
                  <div className={showTemplates ? "" : "hidden sm:block"}>
                      <div className="mb-4 hidden sm:block">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6146]">Template shelf</p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {surveyTemplates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => {
                              commitQuestionChange(template.questions, 0)
                              setMobileStep(2)
                              setDraftMessage(`Applied ${template.label} template. These questions are optimized for voice responses.`)
                              trackEvent("prompt_template_applied", {
                                template_id: template.id,
                                template_label: template.label,
                                question_count: template.questions.length,
                              })
                            }}
                            className="af-glow-hover rounded-[1.25rem] border border-[#cfbea4] bg-[#fffdf8] px-4 py-4 text-left"
                          >
                            <p className="text-sm font-semibold text-[#6e3316]">{template.label}</p>
                            <p className="font-body mt-1 text-sm leading-5 text-[#665746]">{template.description}</p>
                            <p className="font-body mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c7f70]">
                              {template.questions.length} prompt{template.questions.length !== 1 ? "s" : ""}
                            </p>
                          </button>
                        ))}
                      </div>
                  </div>

                  {/* Question Categories Section */}
                  <div className={`${showTemplates ? 'hidden sm:block' : ''} mt-6`}>
                      <div className="mb-4 hidden sm:block">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6146]">Question bank</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {questionCategories.map((category) => (
                          <details key={category.id} className="group rounded-[1.25rem] border border-[#cfbea4] bg-[#fffdf8] p-4">
                            <summary className="flex cursor-pointer list-none items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex size-9 items-center justify-center rounded-full border border-[#d8c7b3] bg-[#f8efdf] text-[#b85e2d]">
                                  {(() => {
                                    const Icon = category.icon
                                    return <Icon className="size-4" />
                                  })()}
                                </span>
                                <div className="text-left">
                                  <p className="text-sm font-semibold text-[#6e3316]">{category.label}</p>
                                  <p className="font-body text-xs leading-5 text-[#665746]">{category.description}</p>
                                </div>
                              </div>
                              <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
                            </summary>
                            <div className="mt-3 space-y-2">
                              {category.questions.map((question, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    const next = [...questions, question]
                                    commitQuestionChange(next, questions.length)
                                    setMobileStep(2)
                                    trackEvent("decision_intent_prompt_viewed", {
                                      category_id: category.id,
                                      category_label: category.label,
                                    })
                                  }}
                                  className="w-full rounded-xl border border-[#cfbea4] bg-[#f8efdf] px-3 py-3 text-left text-sm leading-6 text-[#665746] hover:border-[#b85e2d] hover:bg-[#fff7ee]"
                                >
                                  {question}
                                </button>
                              ))}
                            </div>
                          </details>
                        ))}
                      </div>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(250px,0.9fr)]">
                    <div className="rounded-[1.4rem] border border-[#cfbea4] bg-[#fffdf8] p-4">
                      <p className="text-sm font-semibold">Voice interview principles</p>
                      <ul className="font-body mt-3 space-y-2 text-sm leading-6 text-[#665746]">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-3.5 text-[#2d5a17]" />
                        <span>Good voice questions invite <strong>stories</strong>, not opinions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-3.5 text-[#2d5a17]" />
                        <span>Ask about <strong>concrete moments</strong>: "What confused you the most..." vs "Did you like it?"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-3.5 text-[#2d5a17]" />
                        <span><strong>Experience → Friction → Desire</strong> format produces 30-60 second insights</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-3.5 text-[#2d5a17]" />
                        <span>Voice surveys work best with <strong>1-3 thoughtful questions</strong></span>
                      </li>
                      </ul>
                      <p className="mt-3 text-xs text-[#7a6146] sm:hidden">Keep it to one friction moment and one concrete example.</p>
                    </div>
                    <div className="hidden rounded-[1.4rem] border border-[#d8c7b3] bg-[#f7ecde] p-4 lg:block">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7a6146]">A good final sequence sounds like</p>
                      <div className="mt-3 space-y-3">
                        <p className="text-sm font-semibold text-[#6e3316]">Context to friction to desired future</p>
                        <p className="font-body text-sm leading-6 text-[#665746]">
                          That arc keeps respondents grounded in reality, gives you the moment of tension, and ends with a useful direction instead of vague praise.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3 lg:hidden">
                    <Button variant="outline" className="border-[#cfbea4] bg-[#fff7ee]" onClick={() => setMobileStep(0)}>
                      Back
                    </Button>
                    <Button className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]" onClick={() => setMobileStep(2)}>
                      Next: Sequence
                    </Button>
                  </div>
                </div>

                <div className={`mt-4 rounded-2xl border border-[#cfbea4] bg-[#fffdf8] p-4 ${mobileSectionClass(2)}`}>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a6146]">Signal path</p>
                      <h3 className="mt-1 text-2xl font-semibold text-[#261c14]">Order the prompts like an interview.</h3>
                      <p className="font-body mt-2 text-sm leading-6 text-[#665746]">Drag to reorder. Start broad, move to the hardest friction moment, then close on what would change the decision.</p>
                    </div>
                    <Button variant="outline" className="border-[#cfbea4] bg-[#fff7ee]" onClick={undoQuestionChange} disabled={questionHistory.length === 0}>
                      <Undo2 className="mr-2 size-4" aria-hidden="true" />
                      Undo change
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {questions.length === 0 ? (
                      <div className="sm:col-span-2 rounded-[1.25rem] border border-dashed border-[#cfbea4] bg-[#fff8f0] px-4 py-6">
                        <p className="text-sm font-semibold text-[#6e3316]">No prompts yet.</p>
                        <p className="font-body mt-2 max-w-2xl text-sm leading-6 text-[#665746]">
                          Start from a template or add individual prompts from the question bank. The sequence stays blank until you choose what belongs in this survey.
                        </p>
                      </div>
                    ) : null}
                    {questions.map((q, i) => {
                      const questionQuality = evaluateQuestionQuality(q)
                      const isLowQuality = questionQuality.score < minimumQualityThreshold
                      return (
                        <button
                          key={`${q}-${i}`}
                          type="button"
                          draggable
                          onDragStart={(event) => {
                            setDraggedIndex(i)
                            event.dataTransfer.effectAllowed = "move"
                          }}
                          onDragOver={(event) => {
                            event.preventDefault()
                            if (dragOverIndex !== i) setDragOverIndex(i)
                            event.dataTransfer.dropEffect = "move"
                          }}
                          onDragLeave={() => {
                            if (dragOverIndex === i) setDragOverIndex(null)
                          }}
                          onDrop={(event) => {
                            event.preventDefault()
                            if (draggedIndex === null || draggedIndex === i) return
                            const nextQuestions = reorderQuestionList(questions, draggedIndex, i)
                            const nextSelected = remapSelectedIndexForReorder(selectedIndex, draggedIndex, i)
                            commitQuestionChange(nextQuestions, nextSelected)
                            setDragOverIndex(null)
                            setDraggedIndex(null)
                          }}
                          onDragEnd={() => {
                            setDragOverIndex(null)
                            setDraggedIndex(null)
                          }}
                          onClick={() => setSelectedIndex(i)}
                           className={`rounded-[1.25rem] border px-4 py-4 text-left transition-colors ${i === selectedIndex ? "border-[#b85e2d] bg-[#fff7ee]" : isLowQuality ? "border-[#d8b2a7] bg-[#fcf2ef]" : "border-[#cfbea4] bg-[#f8efdf]"} ${dragOverIndex === i ? "ring-2 ring-[#b85e2d]/40" : ""}`}
                          aria-label={`Edit question ${i + 1}`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-[#7a6146]">
                              <GripVertical className="size-3.5" aria-hidden="true" />
                              Prompt {i + 1}
                            </p>
                            <span
                              className={`text-xs font-semibold ${
                                isLowQuality ? "text-[#8a3d2b]" : "text-[#2d5a17]"
                              }`}
                            >
                              {questionQuality.score}%
                            </span>
                          </div>
                           <p className="font-body mt-2 line-clamp-3 text-sm leading-6 text-[#665746]">{q}</p>
                         </button>
                       )
                     })}
                    <button
                      type="button"
                      onClick={() => {
                        const nextQuestions = [...questions, "New prompt"]
                        commitQuestionChange(nextQuestions, questions.length)
                        setMobileStep(3)
                      }}
                      className="inline-flex min-h-20 items-center justify-center gap-2 rounded-xl border border-dashed border-[#c5b296] bg-[#f8efdf] text-sm text-[#665746]"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      Add prompt
                    </button>
                  </div>
                  <div className="mt-6 flex items-center justify-between gap-3 lg:hidden">
                    <Button variant="outline" className="border-[#cfbea4] bg-[#fff7ee]" onClick={() => setMobileStep(1)}>
                      Back
                    </Button>
                    <Button className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]" onClick={() => setMobileStep(3)}>
                      Next: Refine
                    </Button>
                  </div>
                </div>

                <div className={`mt-4 ${mobileGridSectionClass(3)} gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-start`}>
                  <div>
                     <div className="flex flex-wrap items-start justify-between gap-3">
                       <div>
                         <label className="block text-sm font-semibold uppercase tracking-[0.18em] text-[#7a6146]" htmlFor="question-editor">
                           Prompt editor
                         </label>
                          <h3 className="mt-2 text-2xl font-semibold text-[#261c14]">Refine the selected prompt until it earns a story.</h3>
                       </div>
                       <Button
                         type="button"
                         variant="outline"
                         className="border-[#cfbea4] bg-[#fff7ee]"
                         disabled={questions.length === 0}
                         onClick={() => {
                           if (questions.length === 0) return
                           const nextQuestions = questions.filter((_, index) => index !== selectedIndex)
                           commitQuestionChange(nextQuestions, Math.max(0, selectedIndex - 1))
                           setDraftMessage("Prompt removed from the sequence.")
                         }}
                       >
                         <Trash2 className="mr-2 size-4" aria-hidden="true" />
                         Delete prompt
                       </Button>
                     </div>
                     <textarea
                       id="question-editor"
                       className="font-body mt-3 min-h-40 w-full rounded-[1.4rem] border border-[#cfbea4] bg-[#fffdf8] px-4 py-4 text-sm leading-6 text-pretty"
                       value={selected}
                       placeholder="Choose a template or add a prompt from the question bank to begin editing."
                       disabled={questions.length === 0}
                       onChange={(e) => {
                         const next = [...questions]
                         next[selectedIndex] = e.target.value
                         commitQuestionChange(next, selectedIndex)
                       }}
                     />
                  </div>

                  <div className="rounded-[1.5rem] border border-[#cfbea4] bg-[#f8efdf] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">Quality coach</p>
                        <p className="font-body mt-1 text-sm leading-6 text-[#665746]">
                          {qualityCoachCopy}
                        </p>
                      </div>
                      {questions.length > 0 && selectedQuestionQuality.score < minimumQualityThreshold && (
                        <div className="rounded-full border border-[#e0b8ad] bg-[#f9e6e0] px-2 py-1 text-xs font-semibold text-[#8a3d2b]">
                          Needs improvement
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-[#cfbea4] bg-[#fff7ee] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#7a6146]">Quality score</p>
                      <p className="text-lg font-semibold text-[#6e3316]">{selectedQuestionQuality.score}%</p>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {selectedQuestionQuality.checks.map((item) => (
                        <li key={item.label} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className={`size-3.5 ${item.ok ? "text-[#2d5a17]" : "text-[#8c7f70]"}`} aria-hidden="true" />
                          <span className={item.ok ? "text-[#2d5a17]" : "text-[#665746]"}>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 grid gap-2">
                      <Button
                        variant="outline"
                        className="w-full border-[#cfbea4] bg-[#fff7ee] text-xs"
                        disabled={questions.length === 0}
                        onClick={() => {
                          if (!selected.trim()) return
                          const next = [...questions]
                          next[selectedIndex] = /last|week|day|recent|moment/i.test(selected)
                            ? selected
                            : `In the last week, ${selected.charAt(0).toLowerCase()}${selected.slice(1)}`
                          commitQuestionChange(next, selectedIndex)
                        }}
                      >
                        Add timeframe
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-[#cfbea4] bg-[#fff7ee] text-xs"
                        disabled={questions.length === 0}
                        onClick={() => {
                          if (!selected.trim()) return
                          const next = [...questions]
                          next[selectedIndex] = selected.replace(
                            /^(is|are|do|did|can|will|would|should|could)\b/i,
                            "What",
                          )
                          commitQuestionChange(next, selectedIndex)
                        }}
                      >
                        Convert to open question
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-[#cfbea4] bg-[#fff7ee] text-xs"
                        disabled={questions.length === 0}
                        onClick={() => {
                          if (!selected.trim()) return
                          const next = [...questions]
                          next[selectedIndex] = /example|specific|moment/i.test(selected)
                            ? selected
                            : `${selected.replace(/\?*$/, "?")} Share one concrete moment.`
                          commitQuestionChange(next, selectedIndex)
                        }}
                      >
                        Add depth cue
                      </Button>
                    </div>
                  </div>

                  {/* REMOVED: Old Depth starters section - Replaced by Question Intelligence categories */}
                </div>

                <div className={`mt-4 flex items-center justify-between gap-3 lg:hidden ${mobileSectionClass(3)}`}>
                  <Button variant="outline" className="border-[#cfbea4] bg-[#fff7ee]" onClick={() => setMobileStep(2)}>
                    Back
                  </Button>
                  <Button className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]" onClick={() => setMobileStep(4)}>
                    Next: Publish
                  </Button>
                </div>
              </div>
            </section>

             <section className={`overflow-hidden rounded-3xl border border-[#cfbea4] bg-[#fff7ee] ${mobileSectionClass(3)}`}>
              <div className="border-b border-[#cfbea4] bg-[#f6ead8] px-5 py-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a6146]">Responder preview</p>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-[1.4fr_1fr]">
                <article className="rounded-2xl border border-[#cfbea4] bg-[#fffdf8] p-4">
                  <p className="font-body text-xs uppercase tracking-[0.18em] text-[#7a6146]">What the respondent hears</p>
                  <h3 className="mt-2 text-xl font-semibold text-balance">
                    {selected || "Select a question to preview the respondent experience."}
                  </h3>
                  <p className={`font-body mt-3 text-sm text-[#665746]`}>
                    Delivery cue: speak as if the builder will hear this directly. High-signal responses are usually 20-45 seconds.
                  </p>
                </article>
                <article className="rounded-2xl border border-[#cfbea4] bg-[#f8efdf] p-4">
                  <p className="text-sm font-semibold">Response quality targets</p>
                  <ul className={`font-body mt-2 space-y-2 text-sm text-[#665746]`}>
                    <li className="rounded-lg border border-[#cfbea4] bg-[#fff7ee] px-2 py-1.5">1 concrete example</li>
                    <li className="rounded-lg border border-[#cfbea4] bg-[#fff7ee] px-2 py-1.5">1 friction moment</li>
                    <li className="rounded-lg border border-[#cfbea4] bg-[#fff7ee] px-2 py-1.5">1 clear suggestion</li>
                  </ul>
                </article>
              </div>
            </section>

            <section className={`overflow-hidden rounded-3xl border border-[#cfbea4] bg-[#fff7ee] lg:hidden ${mobileSectionClass(4)}`}>
              <div className="border-b border-[#cfbea4] bg-[#f6ead8] px-5 py-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a6146]">Release desk</p>
              </div>
              <div className="p-5">
                <p className="font-body text-sm leading-6 text-[#665746]">{releaseDeskCopy}</p>
                {draftMessage ? (
                  <p className="font-body mt-4 rounded-2xl border border-[#cfbea4] bg-[#fff8f0] px-4 py-3 text-sm text-[#665746]">{draftMessage}</p>
                ) : null}
                <div className="mt-4 rounded-2xl border border-[#cfbea4] bg-[#fffdf8] p-4">
                  <p className="text-sm font-semibold">Before you publish</p>
                  <ul className="mt-3 space-y-2">
                    {readinessItems.map((item) => (
                      <li key={item.label} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className={`size-4 ${item.ok ? "text-[#2d5a17]" : "text-[#8c7f70]"}`} aria-hidden="true" />
                        <span className={item.ok ? "text-[#2d5a17]" : "text-[#665746]"}>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="font-body mt-4 text-sm leading-6 text-[#665746]">
                    Current draft: {questions.length} {questions.length === 1 ? "prompt" : "prompts"} at {averageQuestionQuality}% average quality.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Button variant="outline" className="border-[#cfbea4] bg-[#fff7ee]" onClick={() => setMobileStep(3)}>
                    Back
                  </Button>
                  <Button
                    className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]"
                    onClick={async () => {
                      if (!readyChecks.hasTitle || !readyChecks.hasPrompt) {
                        setDraftMessage("Add a title and at least one prompt before publishing.")
                        return
                      }

                      const allQuestionScores = questions.map((q) => evaluateQuestionQuality(q).score)
                      const lowQualityQuestions = allQuestionScores.filter((score) => score < minimumQualityThreshold)

                      if (lowQualityQuestions.length > 0) {
                        setDraftMessage(
                          `Improve prompt quality first. ${lowQualityQuestions.length} prompt(s) below ${minimumQualityThreshold}% threshold. Use the quality coach to reach 80%+.`,
                        )
                        return
                      }

                      setIsPublishing(true)
                      try {
                        const surveyId = await saveSurvey("published")
                        recordSurveyPublished({ surveyId, title })
                        trackEvent("survey_published", {
                          survey_id: surveyId,
                          question_count: questions.length,
                        })
                        setPublishedSurveyId(surveyId)
                        setDraftMessage("Survey published and visible in Survey Stack.")
                      } catch (error) {
                        setDraftMessage(error instanceof Error ? error.message : "Failed to publish survey.")
                      } finally {
                        setIsPublishing(false)
                      }
                    }}
                    disabled={isPublishing}
                  >
                    <Rocket className="mr-2 size-4" aria-hidden="true" />
                    {isPublishing ? "Publishing..." : "Publish survey"}
                  </Button>
                </div>
                <div className="mt-3 grid gap-2 lg:hidden">
                  <Button variant="outline" className="border-[#cfbea4] bg-[#fff7ee]" onClick={() => void saveDraft()} disabled={isSavingDraft}>
                    {isSavingDraft ? "Saving..." : "Save draft"}
                  </Button>
                  <Button variant="outline" className="border-[#cfbea4] bg-[#fff7ee]" onClick={startNewDraft}>
                    New draft
                  </Button>
                </div>
              </div>
            </section>
          </div>

            <aside className="af-accent-card af-fade-up af-delay-2 hidden h-fit rounded-3xl border border-[#cfbea4] p-4 lg:sticky lg:top-6 lg:block">
            <h2 className="text-xl font-semibold text-balance">Release desk</h2>
            <p className="font-body mt-1 text-sm leading-6 text-[#665746]">{releaseDeskCopy}</p>
            {draftMessage ? (
              <p className="font-body mt-4 rounded-2xl border border-[#cfbea4] bg-[#fff8f0] px-4 py-3 text-sm text-[#665746]">{draftMessage}</p>
            ) : null}

            <div className="mt-4 rounded-2xl border border-[#cfbea4] bg-[#fff7ee] p-4">
              <p className="text-sm font-semibold">Before you publish</p>
              <ul className="mt-3 space-y-2">
                {readinessItems.map((item) => (
                  <li key={item.label} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className={`size-4 ${item.ok ? "text-[#2d5a17]" : "text-[#8c7f70]"}`} aria-hidden="true" />
                    <span className={item.ok ? "text-[#2d5a17]" : "text-[#665746]"}>{item.label}</span>
                  </li>
                ))}
              </ul>
              <p className="font-body mt-4 text-sm leading-6 text-[#665746]">
                Current draft: {questions.length} {questions.length === 1 ? "prompt" : "prompts"} at {averageQuestionQuality}% average quality.
              </p>
            </div>

            <div className="mt-4 grid gap-2">
              <Button
                className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]"
                onClick={async () => {
                  if (!readyChecks.hasTitle || !readyChecks.hasPrompt) {
                        setDraftMessage("Add a title and at least one prompt before publishing.")
                    return
                  }

                  // Quality gate validation
                  const allQuestionScores = questions.map(q => evaluateQuestionQuality(q).score)
                  const lowQualityQuestions = allQuestionScores.filter(score => score < minimumQualityThreshold)
                  
                  if (lowQualityQuestions.length > 0) {
                    setDraftMessage(
                      `Improve prompt quality first. ${lowQualityQuestions.length} prompt(s) below ${minimumQualityThreshold}% threshold. Use the quality coach to reach 80%+.`,
                    )
                    return
                  }

                  setIsPublishing(true)
                  try {
                    const surveyId = await saveSurvey("published")
                    recordSurveyPublished({ surveyId, title })
                    trackEvent("survey_published", {
                      survey_id: surveyId,
                      question_count: questions.length,
                    })
                    setPublishedSurveyId(surveyId)
                    setDraftMessage("Survey published and visible in Survey Stack.")
                  } catch (error) {
                    setDraftMessage(error instanceof Error ? error.message : "Failed to publish survey.")
                  } finally {
                    setIsPublishing(false)
                  }
                }}
                disabled={isPublishing}
              >
                <Rocket className="mr-2 size-4" aria-hidden="true" />
                {isPublishing ? "Publishing..." : "Publish survey"}
              </Button>
            </div>

            {draftSurveyId ? (
              <div className="mt-4 rounded-2xl border border-[#cfbea4] bg-[#fff7ee] p-3">
                <p className="text-sm font-semibold">Draft link</p>
                <p className={`font-body mt-1 text-xs text-[#665746]`}>
                  Share to reopen this exact draft later.
                </p>
                <Button
                  variant="outline"
                  className="mt-2 w-full border-[#cfbea4] bg-[#fff7ee]"
                  onClick={async () => {
                    try {
                      const draftLink = `${window.location.origin}/admin/questionnaires/v1?surveyId=${encodeURIComponent(draftSurveyId)}`
                      await navigator.clipboard.writeText(draftLink)
                      setDraftMessage("Draft link copied.")
                    } catch {
                      setDraftMessage("Could not copy draft link. Copy it from the browser address bar.")
                    }
                  }}
                >
                  <Copy className="mr-2 size-4" aria-hidden="true" />
                  Copy draft link
                </Button>
              </div>
            ) : null}

            {publishedSurveyId ? (
              <div className="mt-4 rounded-2xl border border-[#cfbea4] bg-[#fff7ee] p-3">
                <p className="text-sm font-semibold">Share and embed</p>
                <p className={`font-body mt-1 text-xs text-[#665746]`}>
                  Copy a direct link or embed code.
                </p>
                <div className="mt-2 grid gap-2">
                  <Button
                    variant="outline"
                    className="w-full border-[#cfbea4] bg-[#fff7ee]"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(surveyLink)
                        trackEvent("share_link_copied", { share_link: surveyLink, share_type: "survey" })
                        setDraftMessage("Survey link copied.")
                      } catch {
                        setDraftMessage("Could not copy survey link. Copy it from the address bar.")
                      }
                    }}
                  >
                    <Copy className="mr-2 size-4" aria-hidden="true" />
                    Copy survey link
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-[#cfbea4] bg-[#fff7ee]"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(embedLink)
                        trackEvent("share_link_copied", { share_link: embedLink, share_type: "embed" })
                        setDraftMessage("Embed link copied.")
                      } catch {
                        setDraftMessage("Could not copy embed link. Please try again.")
                      }
                    }}
                  >
                    <Copy className="mr-2 size-4" aria-hidden="true" />
                    Copy embed link
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-[#cfbea4] bg-[#fff7ee]"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(iframeSnippet)
                        setDraftMessage("Iframe embed code copied.")
                      } catch {
                        setDraftMessage("Could not copy iframe code. Please try again.")
                      }
                    }}
                  >
                    <Copy className="mr-2 size-4" aria-hidden="true" />
                    Copy iframe code
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-[#cfbea4] bg-[#fff7ee]"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(scriptSnippet)
                        setDraftMessage("Script embed code copied.")
                      } catch {
                        setDraftMessage("Could not copy script code. Please try again.")
                      }
                    }}
                  >
                    <Copy className="mr-2 size-4" aria-hidden="true" />
                    Copy script code
                  </Button>
                </div>
              </div>
            ) : null}

            <div className={`font-body mt-4 rounded-2xl border border-[#cfbea4] bg-[#fff7ee] p-3 text-xs text-[#665746]`}>
              <p className="inline-flex items-center gap-1 font-semibold">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Editorial cue
              </p>
              <p className="mt-1">Strong prompts ask for one lived moment, one friction point, and one clear suggestion.</p>
            </div>
          </aside>
        </section>
      </div>
      <AdminMobileNav />
    </main>
  )
}

