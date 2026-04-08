"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRequireAdmin } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ExternalLink, Loader2, Mail, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { SurveyLoadingSkeleton } from "@/components/survey-loading-skeleton"
import { AdminMobileNav } from "@/components/admin-mobile-nav"
import { trackEvent } from "@/lib/analytics"
import { useIsMobile } from "@/components/ui/use-mobile"
import { PocketActionStack, PocketSection, PocketShell } from "@/components/mobile/pocket-shell"


export default function NotificationsPage() {
  const { status } = useRequireAdmin()
  const isMobile = useIsMobile()
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingRules, setIsSavingRules] = useState(false)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [emailSubject, setEmailSubject] = useState("New response received")
  const [emailBody, setEmailBody] = useState("A new response has been submitted to your questionnaire.")
  const [emailRecipients, setEmailRecipients] = useState("")

  const [notificationSettings, setNotificationSettings] = useState({
    newResponse: true,
    completedQuestionnaire: true,
    dailySummary: false,
    weeklySummary: true,
  })

  useEffect(() => {
    if (status !== "authenticated") return
    trackEvent("notification_opened")

    const loadConfig = async () => {
      try {
        const response = await fetch("/api/notifications", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        })
        if (!response.ok) throw new Error("Failed to load notification settings.")
        const json = (await response.json()) as {
          config?: {
            newResponse: boolean
            completedQuestionnaire: boolean
            dailySummary: boolean
            weeklySummary: boolean
            templateSubject: string
            templateBody: string
            recipients: string[]
          }
        }

        if (!json.config) return
        setNotificationSettings({
          newResponse: json.config.newResponse,
          completedQuestionnaire: json.config.completedQuestionnaire,
          dailySummary: json.config.dailySummary,
          weeklySummary: json.config.weeklySummary,
        })
        setEmailSubject(json.config.templateSubject)
        setEmailBody(json.config.templateBody)
        setEmailRecipients((json.config.recipients || []).join(", "))
      } catch (err: any) {
        setError(err.message || "Failed to load notification settings.")
      }
    }

    loadConfig()
  }, [status])

  if (status === "loading") {
    return <SurveyLoadingSkeleton label="Loading notifications..." />
  }

  const handleToggle = (setting: keyof typeof notificationSettings) => {
    setNotificationSettings((prev) => ({ ...prev, [setting]: !prev[setting] }))
    trackEvent("notification_rule_toggled", {
      rule_name: setting,
      enabled: !notificationSettings[setting],
    })
  }

  const handleSendTestEmail = async () => {
    setIsLoading(true)
    setSuccess(null)
    setError(null)
    setPreviewUrl(null)

    try {
      const response = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailRecipients.split(",").map((email) => email.trim()).filter(Boolean),
          subject: emailSubject,
          html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #b85e2d; margin-bottom: 24px;">${emailSubject}</h1>
            <p style="margin-bottom: 16px;">${emailBody}</p>
            <p style="margin-bottom: 16px;">This is a test email sent from AudioForm.</p>
          </div>`,
          text: `${emailSubject}\n\n${emailBody}\n\nThis is a test email sent from AudioForm.`,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to send test email")
      setSuccess("Test email sent successfully.")
      trackEvent("test_email_sent", {
        recipient_count: emailRecipients.split(",").map((email) => email.trim()).filter(Boolean).length,
      })
      if (data.previewUrl) setPreviewUrl(data.previewUrl)
    } catch (err: any) {
      setError(err.message || "Failed to send test email. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const persistConfig = async (message: string) => {
    const recipients = emailRecipients
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean)
    const response = await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        newResponse: notificationSettings.newResponse,
        completedQuestionnaire: notificationSettings.completedQuestionnaire,
        dailySummary: notificationSettings.dailySummary,
        weeklySummary: notificationSettings.weeklySummary,
        templateSubject: emailSubject,
        templateBody: emailBody,
        recipients,
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error((data as { error?: string }).error || "Failed to save notification settings.")
    }
    setSuccess(message)
  }

  if (isMobile) {
    return (
      <>
        <PocketShell
          eyebrow="Builder alerts"
          title="Email notifications"
          description="Save the rules, keep the template clear, then send one live test."
        >
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-[1.15rem] border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a6146]">Rules</p>
              <p className="mt-1 text-base font-semibold text-[var(--af-color-primary)]">4</p>
              <p className="mt-1 text-[11px] leading-4 text-[#665746]">delivery switches</p>
            </div>
            <div className="rounded-[1.15rem] border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a6146]">Template</p>
              <p className="mt-1 text-base font-semibold text-[var(--af-color-primary)]">Live</p>
              <p className="mt-1 text-[11px] leading-4 text-[#665746]">shared format</p>
            </div>
            <div className="rounded-[1.15rem] border border-[#dbcdb8] bg-[#fff8f0] px-3 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a6146]">Test</p>
              <p className="mt-1 text-base font-semibold text-[var(--af-color-primary)]">Send</p>
              <p className="mt-1 text-[11px] leading-4 text-[#665746]">before trust</p>
            </div>
          </div>

          <PocketSection title="Notification posture" description="Alerts should help you act faster, not add more noise to the creator loop." className="mb-4 bg-[#fff8f0]">
            <div className="af-mobile-rail">
              {[
                "Keep instant alerts for events that genuinely change what you do next.",
                "Use one clear template voice so every notification feels like part of the same product.",
              ].map((line) => (
                <div key={line} className="af-mobile-rail-card rounded-[1.1rem] border border-[#dbcdb8] bg-[#fffdf8] p-3.5 text-sm leading-6 text-[#5c5146]">{line}</div>
              ))}
            </div>
          </PocketSection>

          {success ? (
            <Alert className="mb-4 border-[#dbcdb8] bg-[#f9f4ea]">
              <Mail className="h-4 w-4" />
              <AlertTitle>Saved</AlertTitle>
              <AlertDescription>
                {success}
                {previewUrl ? (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-[#8a431f] hover:underline"
                  >
                    View email preview
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive" className="mb-4" aria-live="assertive">
              <Mail className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error}
                <p className="font-body mt-2 text-xs">
                  Check recipient format, then verify SMTP settings in your environment if this continues.
                </p>
              </AlertDescription>
            </Alert>
          ) : null}

          <PocketSection title="Delivery rules" description="Turn alerts on only where they help you act faster.">
            <div className="space-y-3">
              <RuleRow
                id="rule-new-response-mobile"
                title="New response"
                description="Notify when any response lands."
                checked={notificationSettings.newResponse}
                onCheckedChange={() => handleToggle("newResponse")}
              />
              <RuleRow
                id="rule-completed-mobile"
                title="Completed questionnaire"
                description="Notify when a full survey session finishes."
                checked={notificationSettings.completedQuestionnaire}
                onCheckedChange={() => handleToggle("completedQuestionnaire")}
              />
              <RuleRow
                id="rule-daily-mobile"
                title="Daily summary"
                description="Send one daily digest of activity."
                checked={notificationSettings.dailySummary}
                onCheckedChange={() => handleToggle("dailySummary")}
              />
              <RuleRow
                id="rule-weekly-mobile"
                title="Weekly summary"
                description="Send a weekly overview."
                checked={notificationSettings.weeklySummary}
                onCheckedChange={() => handleToggle("weeklySummary")}
              />
            </div>
            <Button
              className="mt-4 w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]"
              disabled={isSavingRules}
              onClick={async () => {
                setIsSavingRules(true)
                setSuccess(null)
                setError(null)
                try {
                  await persistConfig("Notification rules saved.")
                } catch (err: any) {
                  setError(err.message || "Failed to save notification rules.")
                } finally {
                  setIsSavingRules(false)
                }
              }}
            >
              {isSavingRules ? "Saving..." : "Save rules"}
            </Button>
          </PocketSection>

          <PocketSection title="Template" description="Keep one clear message style for every response alert." className="mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-subject-mobile">Subject</Label>
                <Input id="template-subject-mobile" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-body-mobile">Body</Label>
                <Textarea
                  id="template-body-mobile"
                  className="font-body min-h-[160px] text-pretty"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                />
              </div>
              <div className="rounded-xl border border-[#dbcdb8] bg-[#f9f4ea] p-3">
                <p className="text-sm font-semibold text-balance">Available variables</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">[Questionnaire Name]</Badge>
                  <Badge variant="outline">[Respondent Name]</Badge>
                  <Badge variant="outline">[Submission Date]</Badge>
                  <Badge variant="outline">[Response Count]</Badge>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full border-[#dbcdb8] bg-[#f9f4ea]"
                disabled={isSavingTemplate}
                onClick={async () => {
                  setIsSavingTemplate(true)
                  setSuccess(null)
                  setError(null)
                  try {
                    await persistConfig("Template saved.")
                    trackEvent("notification_template_saved", {
                      template_type: "response_alert",
                      recipient_count: emailRecipients.split(",").map((email) => email.trim()).filter(Boolean).length,
                    })
                  } catch (err: any) {
                    setError(err.message || "Failed to save template.")
                  } finally {
                    setIsSavingTemplate(false)
                  }
                }}
              >
                {isSavingTemplate ? "Saving..." : "Save template"}
              </Button>
            </div>
          </PocketSection>

          <PocketSection title="Test console" description="Send one test before you trust the rules." className="mt-4 bg-[#fff6ed]">
            <PocketActionStack>
              <div className="space-y-2">
                <Label htmlFor="test-recipients-mobile">Recipients</Label>
                <Input
                  id="test-recipients-mobile"
                  placeholder="name@example.com, team@example.com"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  aria-invalid={!!error}
                />
                <p className="font-body text-xs text-[#5c5146]">Use commas for multiple recipients.</p>
              </div>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isLoading || !emailRecipients.trim()}
                className={cn(
                  "inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-medium",
                  "bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227] disabled:opacity-50",
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 size-4" aria-hidden="true" />
                    Send test email
                  </>
                )}
              </button>
            </PocketActionStack>
          </PocketSection>
        </PocketShell>
        <AdminMobileNav />
      </>
    )
  }

  return (
    <main className={`af-shell min-h-dvh p-4 pb-28 sm:p-6 sm:pb-6`}>
      <section className="af-panel af-fade-up mx-auto max-w-7xl rounded-[2rem] border p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dbcdb8] pb-4">
          <div>
            <p className={`font-body text-sm text-[#5c5146] text-pretty`}>Admin notifications</p>
            <h1 className="text-3xl font-semibold text-balance">Email Notifications</h1>
            <p className={`font-body mt-1 text-sm text-[#5c5146] text-pretty`}>
              Configure alert rules, save one clear template, then send a live test.
            </p>
          </div>
          <Link href="/admin/dashboard/v4">
            <Button variant="outline" className="border-[#dbcdb8] bg-[#f3ecdf]">
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              Back to Dashboard
            </Button>
          </Link>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr_360px]">
          <aside className="af-accent-card af-fade-up af-delay-1 rounded-2xl border p-4">
            <h2 className="text-xl font-semibold text-balance">Delivery Rules</h2>
            <p className={`font-body mt-1 text-xs text-[#5c5146]`}>
              Save rules first, then run one test email.
            </p>
            <div className="mt-3 space-y-3">
              <RuleRow
                id="rule-new-response"
                title="New response"
                description="Notify when a respondent submits any response."
                checked={notificationSettings.newResponse}
                onCheckedChange={() => handleToggle("newResponse")}
              />
              <RuleRow
                id="rule-completed"
                title="Completed questionnaire"
                description="Notify when a full questionnaire session is finished."
                checked={notificationSettings.completedQuestionnaire}
                onCheckedChange={() => handleToggle("completedQuestionnaire")}
              />
              <RuleRow
                id="rule-daily"
                title="Daily summary"
                description="Receive one daily digest of response activity."
                checked={notificationSettings.dailySummary}
                onCheckedChange={() => handleToggle("dailySummary")}
              />
              <RuleRow
                id="rule-weekly"
                title="Weekly summary"
                description="Receive a weekly performance overview."
                checked={notificationSettings.weeklySummary}
                onCheckedChange={() => handleToggle("weeklySummary")}
              />
            </div>
            <Button
              className="mt-4 w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227]"
              disabled={isSavingRules}
              onClick={async () => {
                setIsSavingRules(true)
                setSuccess(null)
                setError(null)
                try {
                  await persistConfig("Notification rules saved.")
                } catch (err: any) {
                  setError(err.message || "Failed to save notification rules.")
                } finally {
                  setIsSavingRules(false)
                }
              }}
            >
              {isSavingRules ? "Saving..." : "Save rules"}
            </Button>
          </aside>

          <section className="af-accent-card af-fade-up af-delay-1 rounded-2xl border p-5">
            <h2 className="text-2xl font-semibold text-balance">Template Editor</h2>
            <p className={`font-body mt-1 text-sm text-[#5c5146] text-pretty`}>
              Keep one clear message style for all response alerts.
            </p>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-subject">Subject</Label>
                <Input id="template-subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-body">Body</Label>
                <Textarea
                  id="template-body"
                  className={`font-body min-h-[220px] text-pretty`}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                />
              </div>

              <div className="rounded-xl border border-[#dbcdb8] bg-[#f9f4ea] p-3">
                <p className="text-sm font-semibold text-balance">Available variables</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">[Questionnaire Name]</Badge>
                  <Badge variant="outline">[Respondent Name]</Badge>
                  <Badge variant="outline">[Submission Date]</Badge>
                  <Badge variant="outline">[Response Count]</Badge>
                </div>
              </div>

              <Button
                variant="outline"
                className="border-[#dbcdb8] bg-[#f9f4ea]"
                disabled={isSavingTemplate}
                onClick={async () => {
                  setIsSavingTemplate(true)
                  setSuccess(null)
                  setError(null)
                   try {
                     await persistConfig("Template saved.")
                     trackEvent("notification_template_saved", {
                       template_type: "response_alert",
                       recipient_count: emailRecipients.split(",").map((email) => email.trim()).filter(Boolean).length,
                     })
                   } catch (err: any) {
                    setError(err.message || "Failed to save template.")
                  } finally {
                    setIsSavingTemplate(false)
                  }
                }}
              >
                {isSavingTemplate ? "Saving..." : "Save template"}
              </Button>
            </div>
          </section>

          <aside className="af-accent-card af-fade-up af-delay-2 rounded-2xl border p-4">
            <h2 className="text-xl font-semibold text-balance">Test Console</h2>
            <p className={`font-body mt-1 text-sm text-[#5c5146] text-pretty`}>
              Send a test alert before enabling new rules.
            </p>

            {success && (
              <Alert className="mt-4 border-[#dbcdb8] bg-[#f9f4ea]">
                <Mail className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  {success}
                  {previewUrl && (
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-[#8a431f] hover:underline">
                      View email preview
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mt-4" aria-live="assertive">
                <Mail className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error}
                  <p className={`font-body mt-2 text-xs`}>
                    Check recipient format, then verify SMTP settings in your environment if this continues.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="test-recipients">Recipients</Label>
                <Input
                  id="test-recipients"
                  placeholder="name@example.com, team@example.com"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  aria-invalid={!!error}
                />
                <p className={`font-body text-xs text-[#5c5146]`}>Use commas for multiple recipients.</p>
              </div>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isLoading || !emailRecipients.trim()}
                className={cn(
                  "inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
                  "bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227] disabled:opacity-50",
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 size-4" aria-hidden="true" />
                    Send Test Email
                  </>
                )}
              </button>
            </div>
          </aside>
        </section>
      </section>
      <AdminMobileNav />
    </main>
  )
}

function RuleRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  title: string
  description: string
  checked: boolean
  onCheckedChange: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#dbcdb8] bg-[#f9f4ea] p-3">
      <div className="block">
        <Label htmlFor={id} className="text-sm font-semibold">
          {title}
        </Label>
        <p className="mt-1 text-sm text-[#5c5146] text-pretty">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

