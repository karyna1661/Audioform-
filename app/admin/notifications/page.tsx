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


export default function NotificationsPage() {
  const { status } = useRequireAdmin()
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

  return (
    <main className={`min-h-dvh bg-[#f3ecdf] p-4 pb-28 sm:p-6 sm:pb-6`}>
      <section className="mx-auto max-w-7xl rounded-[2rem] border border-[#dbcdb8] bg-[#f9f4ea] p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dbcdb8] pb-4">
          <div>
            <p className={`font-body text-sm text-[#5c5146] text-pretty`}>Admin Communication Center</p>
            <h1 className="text-3xl font-semibold text-balance">Email Notifications</h1>
            <p className={`font-body mt-1 text-sm text-[#5c5146] text-pretty`}>
              Configure response alerts, tune message tone, and test deliverability from one place.
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
          <aside className="rounded-2xl border border-[#dbcdb8] bg-[#f3ecdf] p-4">
            <h2 className="text-xl font-semibold text-balance">Delivery Rules</h2>
            <p className={`font-body mt-1 text-xs text-[#5c5146]`}>
              Save rules first, then test with a live email before enabling team workflows.
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

          <section className="rounded-2xl border border-[#dbcdb8] bg-[#fff6ed] p-5">
            <h2 className="text-2xl font-semibold text-balance">Template Editor</h2>
            <p className={`font-body mt-1 text-sm text-[#5c5146] text-pretty`}>
              Keep one clear message style for all response alerts sent to your team.
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

          <aside className="rounded-2xl border border-[#dbcdb8] bg-[#f3ecdf] p-4">
            <h2 className="text-xl font-semibold text-balance">Test Console</h2>
            <p className={`font-body mt-1 text-sm text-[#5c5146] text-pretty`}>
              Send yourself a test alert using the current template before turning rules on.
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
                <p className={`font-body text-xs text-[#5c5146]`}>Comma-separate multiple recipients.</p>
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
      <div>
        <Label htmlFor={id} className="text-sm font-semibold">
          {title}
        </Label>
        <p className="mt-1 text-sm text-[#5c5146] text-pretty">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

