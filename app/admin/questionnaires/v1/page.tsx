"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bricolage_Grotesque, Lora } from "next/font/google"
import { useRequireAdmin } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle2, Copy, Plus, Rocket, Sparkles, Target, Trash2 } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import { recordSurveyPublished } from "@/lib/behavior-metrics"

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "700"] })
const body = Lora({ subsets: ["latin"], weight: ["400", "500", "600"] })

const initialQuestions = [
  "What part of this product helped you most this week?",
  "Where did you hesitate before completing your task?",
  "What would you change first to make this easier to use?",
]

const templateQuickInsert: Record<string, string[]> = {
  confusion: [
    "What felt unclear at any point, and what were you expecting instead?",
    "Where did you pause before the next step, and what caused that pause?",
  ],
  risk: [
    "What would stop you from using this in your real workflow this month?",
    "What risk would you need resolved before trusting this in production?",
  ],
  value: [
    "What result felt most valuable after trying this?",
    "What made this worth your time, or not worth continuing?",
  ],
}

const intentOptions = [
  { id: "validation", label: "Validate Direction" },
  { id: "critique", label: "Find Weak Spots" },
  { id: "confusion", label: "Find Confusion" },
  { id: "emotion", label: "Capture Emotion" },
]

const templatePackMeta: Record<string, { label: string; description: string }> = {
  confusion: {
    label: "Confusion",
    description: "Uncover hesitation, friction, and unclear moments.",
  },
  risk: {
    label: "Risk",
    description: "Expose blockers that prevent real-world adoption.",
  },
  value: {
    label: "Value",
    description: "Surface what feels useful enough to repeat.",
  },
}

function createSurveyId(title: string, creatorId: string): string {
  const creatorPrefix = creatorId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "creator"
  const titlePrefix =
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "survey"
  const timestamp = Date.now().toString(36)
  const entropy = Math.random().toString(36).slice(2, 7)
  return `${creatorPrefix}-${titlePrefix}-${timestamp}-${entropy}`
}

export default function QuestionnairesV1Page() {
  const { status, user } = useRequireAdmin()
  const [questions, setQuestions] = useState(initialQuestions)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [title, setTitle] = useState("Activation Decision Pulse")
  const [decisionFocus, setDecisionFocus] = useState("Should we simplify onboarding before adding new features?")
  const [intent, setIntent] = useState("critique")
  const [templatePack, setTemplatePack] = useState("confusion")
  const [draftSurveyId, setDraftSurveyId] = useState("")
  const [draftMessage, setDraftMessage] = useState<string | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishedSurveyId, setPublishedSurveyId] = useState<string | null>(null)

  const saveSurvey = async (nextStatus: "draft" | "published") => {
    const surveyId = draftSurveyId || createSurveyId(title, user?.id || "creator")
    if (!draftSurveyId) {
      setDraftSurveyId(surveyId)
    }
    const normalizedQuestions = questions.map((q) => q.trim()).filter((q) => q.length > 0)
    const payload = {
      id: surveyId,
      title: title.trim(),
      decisionFocus: decisionFocus.trim(),
      intent,
      templatePack,
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
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error || "Failed to save survey.")
    }

    return surveyId
  }

  useEffect(() => {
    const rawDraft = window.localStorage.getItem("audioform_survey_draft_v1")
    if (!rawDraft) return

    try {
      const parsed = JSON.parse(rawDraft) as {
        surveyId?: string
        title?: string
        decisionFocus?: string
        intent?: string
        templatePack?: string
        questions?: string[]
        savedAt?: string
      }
      if (parsed.title) setTitle(parsed.title)
      if (parsed.surveyId) setDraftSurveyId(parsed.surveyId)
      if (parsed.decisionFocus) setDecisionFocus(parsed.decisionFocus)
      if (parsed.intent) setIntent(parsed.intent)
      if (parsed.templatePack) setTemplatePack(parsed.templatePack)
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
  }, [])

  useEffect(() => {
    if (status === "loading" || draftSurveyId) return
    setDraftSurveyId(createSurveyId(title, user?.id || "creator"))
  }, [status, draftSurveyId, title, user?.id])

  if (status === "loading") return <main className="min-h-dvh bg-[#f3ecdf] p-6">Loading...</main>

  const selected = questions[selectedIndex] || ""
  const selectedPack = templatePackMeta[templatePack]
  const readyChecks = {
    hasTitle: title.trim().length > 0,
    hasDecision: decisionFocus.trim().length > 0,
    hasTwoQuestions: questions.filter((q) => q.trim().length > 0).length >= 2,
    hasDepthPrompt: questions.some((q) => q.length > 40),
  }
  const completionScore =
    (Number(readyChecks.hasTitle) +
      Number(readyChecks.hasDecision) +
      Number(readyChecks.hasTwoQuestions) +
      Number(readyChecks.hasDepthPrompt)) /
    4

  const creatorId = user?.id || ""
  const surveyLink =
    publishedSurveyId
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/questionnaire/v1?surveyId=${encodeURIComponent(
          publishedSurveyId,
        )}`
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

  return (
    <main className={`${display.className} min-h-dvh bg-[#f1e7d7] p-4 sm:p-6`}>
      <div className="mx-auto max-w-7xl rounded-[2.2rem] border border-[#cfbea4] bg-[linear-gradient(160deg,#fbf6ec_0%,#f4ead9_55%,#efe2ca_100%)] p-4 shadow-[0_20px_80px_rgba(78,53,20,0.08)] sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfbea4] pb-5">
          <div>
            <p className={`${body.className} text-sm text-[#665746] text-pretty`}>Build-in-public signal composer</p>
            <h1 className="text-3xl font-semibold text-balance sm:text-4xl">Design the feedback loop, not just the form</h1>
            <p className={`${body.className} mt-1 max-w-2xl text-sm text-[#665746] text-pretty`}>
              Define one product decision, shape prompts for depth, and launch a voice survey that gives decision-ready signal.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/questionnaires">
              <Button variant="outline" className="border-[#cfbea4] bg-[#efe3cf]">
                <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
                Back to surveys
              </Button>
            </Link>
            <Button
              className="bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]"
              onClick={async () => {
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
                    decisionFocus,
                    intent,
                    templatePack,
                    questions,
                    savedAt,
                  }),
                )
                try {
                  await saveSurvey("draft")
                  setDraftMessage(`Draft saved at ${new Date(savedAt).toLocaleString()}`)
                  trackEvent("survey_draft_saved", {
                    intent_type: intent,
                    question_count: questions.length,
                    decision_focus_present: decisionFocus.trim().length > 0,
                  })
                } catch (error) {
                  setDraftMessage(error instanceof Error ? error.message : "Failed to save draft.")
                } finally {
                  setIsSavingDraft(false)
                }
              }}
              disabled={isSavingDraft}
            >
              {isSavingDraft ? "Saving..." : "Save draft"}
            </Button>
          </div>
        </header>
        {draftMessage ? (
          <p className={`${body.className} mt-3 text-sm text-[#665746]`}>{draftMessage}</p>
        ) : null}

        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-3xl border border-[#cfbea4] bg-[#fff7ee]">
              <div className="border-b border-[#cfbea4] bg-[#f6ead8] px-5 py-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#7a6146]">Trigger: Decision Context</p>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-[1.2fr_1fr]">
                <div>
                  <label className="block text-sm font-semibold" htmlFor="survey-title">
                    Survey title
                  </label>
                  <input
                    id="survey-title"
                    className="mt-2 w-full rounded-2xl border border-[#cfbea4] bg-[#fffdf8] px-3 py-2"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />

                  <label className="mt-4 block text-sm font-semibold" htmlFor="decision-focus">
                    What product decision are you trying to make this week?
                  </label>
                  <textarea
                    id="decision-focus"
                    className={`${body.className} mt-2 min-h-28 w-full rounded-2xl border border-[#cfbea4] bg-[#fffdf8] px-3 py-2 text-sm text-pretty`}
                    value={decisionFocus}
                    onChange={(e) => setDecisionFocus(e.target.value)}
                    placeholder="Example: Should we fix onboarding friction before shipping the next feature?"
                  />
                </div>
                <div className="rounded-2xl border border-[#cfbea4] bg-[#f6ead8] p-4">
                  <p className="text-sm font-semibold">Starter prompts (builder language)</p>
                  <div className="mt-3 grid gap-2">
                    {[
                      "What user signal would change your mind about this decision?",
                      "What friction must we fix before the next release?",
                      "What would make this feel clearly better for users?",
                    ].map((reframe) => (
                      <button
                        key={reframe}
                        type="button"
                        onClick={() => setDecisionFocus(reframe)}
                        className={`${body.className} rounded-xl border border-[#cfbea4] bg-[#fff7ee] px-3 py-2 text-left text-sm text-[#665746] hover:bg-[#fffdf8]`}
                      >
                        {reframe}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-5 pb-5">
                <p className="text-sm font-semibold">Intent mode</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {intentOptions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setIntent(item.id)
                        trackEvent("decision_intent_selected", { intent_type: item.id })
                      }}
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        intent === item.id
                          ? "border-[#b85e2d] bg-[#f1ceb9] text-[#6e3316]"
                          : "border-[#cfbea4] bg-[#fffdf8] text-[#665746]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <p className={`${body.className} mt-2 text-xs text-[#665746]`}>
                  Intent mode sets the kind of truth you want to hear first. Then choose a prompt pack to shape the response depth.
                </p>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-[#cfbea4] bg-[#fff7ee]">
              <div className="border-b border-[#cfbea4] bg-[#f6ead8] px-5 py-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#7a6146]">Action: Prompt Flow</p>
              </div>
              <div className="grid gap-4 p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  {Object.entries(templatePackMeta).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setTemplatePack(key)
                        trackEvent("prompt_template_selected", { template_pack: key })
                      }}
                      className={`rounded-2xl border px-3 py-3 text-left ${
                        templatePack === key ? "border-[#b85e2d] bg-[#f1ceb9]" : "border-[#cfbea4] bg-[#fffdf8]"
                      }`}
                    >
                      <p className="text-sm font-semibold">{meta.label}</p>
                      <p className={`${body.className} mt-1 text-xs text-[#665746]`}>{meta.description}</p>
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-[#cfbea4] bg-[#fffdf8] p-4">
                  <p className="text-sm font-semibold">Question sequence (signal path)</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {questions.map((q, i) => (
                      <button
                        key={`${q}-${i}`}
                        type="button"
                        onClick={() => setSelectedIndex(i)}
                        className={`rounded-xl border px-3 py-3 text-left ${
                          i === selectedIndex
                            ? "border-[#b85e2d] bg-[#fff7ee]"
                            : "border-[#cfbea4] bg-[#f8efdf]"
                        }`}
                        aria-label={`Edit question ${i + 1}`}
                      >
                        <p className="text-xs uppercase tracking-wide text-[#7a6146]">Question {i + 1}</p>
                        <p className={`${body.className} mt-1 line-clamp-2 text-sm text-[#665746]`}>{q}</p>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setQuestions((prev) => [...prev, "New question prompt"])
                        setSelectedIndex(questions.length)
                      }}
                      className="inline-flex min-h-20 items-center justify-center gap-2 rounded-xl border border-dashed border-[#c5b296] bg-[#f8efdf] text-sm text-[#665746]"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      Add prompt
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr]">
                  <div>
                    <label className="block text-sm font-semibold" htmlFor="question-editor">
                      Edit selected prompt
                    </label>
                    <textarea
                      id="question-editor"
                      className={`${body.className} mt-2 min-h-36 w-full rounded-2xl border border-[#cfbea4] bg-[#fffdf8] px-3 py-2 text-sm text-pretty`}
                      value={selected}
                      onChange={(e) => {
                        const next = [...questions]
                        next[selectedIndex] = e.target.value
                        setQuestions(next)
                      }}
                    />
                  </div>
                  <div className="rounded-2xl border border-[#cfbea4] bg-[#f8efdf] p-3">
                    <p className="text-sm font-semibold">Depth starters</p>
                    <div className="mt-2 grid gap-2">
                      {templateQuickInsert[templatePack].map((template) => (
                        <button
                          key={template}
                          type="button"
                          onClick={() => {
                            const next = [...questions]
                            next[selectedIndex] = template
                            setQuestions(next)
                            trackEvent("prompt_template_applied", {
                              template_pack: templatePack,
                              question_index: selectedIndex + 1,
                            })
                          }}
                          className={`${body.className} rounded-xl border border-[#cfbea4] bg-[#fff7ee] px-3 py-2 text-left text-sm text-[#665746] hover:bg-[#fffdf8]`}
                        >
                          {template}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      className="mt-3 w-full border-[#cfbea4] bg-[#fff7ee]"
                      onClick={() => {
                        if (questions.length <= 1) return
                        const next = questions.filter((_, i) => i !== selectedIndex)
                        setQuestions(next)
                        setSelectedIndex(Math.max(0, selectedIndex - 1))
                      }}
                    >
                      <Trash2 className="mr-2 size-4" aria-hidden="true" />
                      Remove question
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-[#cfbea4] bg-[#fff7ee]">
              <div className="border-b border-[#cfbea4] bg-[#f6ead8] px-5 py-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#7a6146]">Reward: Responder Preview</p>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-[1.4fr_1fr]">
                <article className="rounded-2xl border border-[#cfbea4] bg-[#fffdf8] p-4">
                  <p className={`${body.className} text-xs uppercase tracking-wide text-[#7a6146]`}>How builders will hear this signal</p>
                  <h3 className="mt-2 text-xl font-semibold text-balance">
                    {selected || "Select a question to preview the respondent experience."}
                  </h3>
                  <p className={`${body.className} mt-3 text-sm text-[#665746]`}>
                    Delivery cue: speak as if the builder will hear this directly. High-signal responses are usually 20-45 seconds.
                  </p>
                </article>
                <article className="rounded-2xl border border-[#cfbea4] bg-[#f8efdf] p-4">
                  <p className="text-sm font-semibold">Response quality targets</p>
                  <ul className={`${body.className} mt-2 space-y-2 text-sm text-[#665746]`}>
                    <li className="rounded-lg border border-[#cfbea4] bg-[#fff7ee] px-2 py-1.5">1 concrete example</li>
                    <li className="rounded-lg border border-[#cfbea4] bg-[#fff7ee] px-2 py-1.5">1 friction moment</li>
                    <li className="rounded-lg border border-[#cfbea4] bg-[#fff7ee] px-2 py-1.5">1 clear suggestion</li>
                  </ul>
                </article>
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-3xl border border-[#cfbea4] bg-[#f7ecdc] p-4 lg:sticky lg:top-6">
            <h2 className="text-xl font-semibold text-balance">Launch Console</h2>
            <p className={`${body.className} mt-1 text-sm text-[#665746]`}>Release when quality is credible, not just complete.</p>

            <div className="mt-4 rounded-2xl border border-[#cfbea4] bg-[#fff7ee] p-3">
              <p className="text-sm font-semibold">Readiness index</p>
              <p className="mt-1 text-3xl font-semibold text-[#6e3316]">{Math.round(completionScore * 100)}%</p>
              <div className="mt-2 grid grid-cols-4 gap-1">
                {[0, 1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full ${
                      step < Math.round(completionScore * 4) ? "bg-[#b85e2d]" : "bg-[#dfcfb8]"
                    }`}
                  />
                ))}
              </div>
              <ul className="mt-3 space-y-2">
                {[
                  { ok: readyChecks.hasTitle, label: "Title" },
                  { ok: readyChecks.hasDecision, label: "Decision clarity" },
                  { ok: readyChecks.hasTwoQuestions, label: "Question flow" },
                  { ok: readyChecks.hasDepthPrompt, label: "Depth question" },
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className={`size-4 ${item.ok ? "text-[#2d5a17]" : "text-[#8c7f70]"}`} aria-hidden="true" />
                    <span className={item.ok ? "text-[#2d5a17]" : "text-[#665746]"}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-2xl border border-[#cfbea4] bg-[#fff7ee] p-3">
              <p className="inline-flex items-center gap-1 text-sm font-semibold">
                <Target className="size-4 text-[#b85e2d]" aria-hidden="true" />
                Outcome target
              </p>
              <p className={`${body.className} mt-1 text-sm text-[#665746]`}>
                Collect the first 5 voice takes quickly, replay the strongest clips, then decide your next product move.
              </p>
            </div>

            <div className="mt-4 grid gap-2">
              <Button
                className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]"
                onClick={async () => {
                  if (!readyChecks.hasTitle || !readyChecks.hasDecision || !readyChecks.hasTwoQuestions) {
                    setDraftMessage("Complete title, decision context, and at least two prompts before publishing.")
                    return
                  }

                  setIsPublishing(true)
                  try {
                    const surveyId = await saveSurvey("published")
                    recordSurveyPublished({ surveyId, title })
                    trackEvent("survey_published", {
                      survey_id: surveyId,
                      intent_type: intent,
                      template_pack: templatePack,
                      question_count: questions.length,
                      decision_focus_present: decisionFocus.trim().length > 0,
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

            {publishedSurveyId ? (
              <div className="mt-4 rounded-2xl border border-[#cfbea4] bg-[#fff7ee] p-3">
                <p className="text-sm font-semibold">Share and embed distribution</p>
                <p className={`${body.className} mt-1 text-xs text-[#665746]`}>
                  Copy the survey link for direct responses, or use embed/iframe for on-site collection.
                </p>
                <div className="mt-2 grid gap-2">
                  <Button
                    variant="outline"
                    className="w-full border-[#cfbea4] bg-[#fff7ee]"
                    onClick={async () => {
                      await navigator.clipboard.writeText(surveyLink)
                      trackEvent("share_link_copied", { share_link: surveyLink, share_type: "survey" })
                      setDraftMessage("Survey link copied.")
                    }}
                  >
                    <Copy className="mr-2 size-4" aria-hidden="true" />
                    Copy survey link
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-[#cfbea4] bg-[#fff7ee]"
                    onClick={async () => {
                      await navigator.clipboard.writeText(embedLink)
                      trackEvent("share_link_copied", { share_link: embedLink, share_type: "embed" })
                      setDraftMessage("Embed link copied.")
                    }}
                  >
                    <Copy className="mr-2 size-4" aria-hidden="true" />
                    Copy embed link
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-[#cfbea4] bg-[#fff7ee]"
                    onClick={async () => {
                      await navigator.clipboard.writeText(iframeSnippet)
                      setDraftMessage("Iframe embed code copied.")
                    }}
                  >
                    <Copy className="mr-2 size-4" aria-hidden="true" />
                    Copy iframe code
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-[#cfbea4] bg-[#fff7ee]"
                    onClick={async () => {
                      await navigator.clipboard.writeText(scriptSnippet)
                      setDraftMessage("Script embed code copied.")
                    }}
                  >
                    <Copy className="mr-2 size-4" aria-hidden="true" />
                    Copy script code
                  </Button>
                </div>
              </div>
            ) : null}

            <div className={`${body.className} mt-4 rounded-2xl border border-[#cfbea4] bg-[#fff7ee] p-3 text-xs text-[#665746]`}>
              <p className="inline-flex items-center gap-1 font-semibold">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Behavioral cue
              </p>
              <p className="mt-1">Strong prompts ask for lived moments, not ratings. Edit every question for depth and specificity.</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}
