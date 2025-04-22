"use client"

import { Badge } from "@/components/ui/badge"

import { useState } from "react"
import { useRequireAdmin } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AdminHeader } from "@/components/admin-header"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Loader2, Mail, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function NotificationsPage() {
  const { status } = useRequireAdmin()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Form state
  const [emailSubject, setEmailSubject] = useState("New response received")
  const [emailBody, setEmailBody] = useState("A new response has been submitted to your questionnaire.")
  const [emailRecipients, setEmailRecipients] = useState("")

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    newResponse: true,
    completedQuestionnaire: true,
    dailySummary: false,
    weeklySummary: true,
  })

  // Check if the user is authenticated
  if (status === "loading") {
    return <div>Loading...</div>
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
          to: emailRecipients.split(",").map((email) => email.trim()),
          subject: emailSubject,
          html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6366f1; margin-bottom: 24px;">${emailSubject}</h1>
            <p style="margin-bottom: 16px;">${emailBody}</p>
            <p style="margin-bottom: 16px;">This is a test email sent from AudioForm.</p>
            <div style="padding: 16px; background-color: #f8fafc; border-radius: 4px; margin-top: 24px;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                AudioForm - Audio-First Questionnaire Platform
              </p>
            </div>
          </div>`,
          text: `${emailSubject}\n\n${emailBody}\n\nThis is a test email sent from AudioForm.`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send test email")
      }

      setSuccess("Test email sent successfully!")

      // If there's a preview URL (for Ethereal Email), show it
      if (data.previewUrl) {
        setPreviewUrl(data.previewUrl)
      }
    } catch (err: any) {
      setError(err.message || "Failed to send test email. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleNotification = (setting: string) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting as keyof typeof prev],
    }))
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <div className="flex-1">
        <AdminHeader title="Email Notifications" />
        <main className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Email Notifications</h1>
            <p className="text-muted-foreground">Configure and manage email notifications for your questionnaires.</p>
          </div>

          <Tabs defaultValue="settings">
            <TabsList className="mb-6">
              <TabsTrigger value="settings">Notification Settings</TabsTrigger>
              <TabsTrigger value="templates">Email Templates</TabsTrigger>
              <TabsTrigger value="test">Send Test Email</TabsTrigger>
            </TabsList>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose when you want to receive email notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="new-response">New Response</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive an email when someone submits a new response
                      </p>
                    </div>
                    <Switch
                      id="new-response"
                      checked={notificationSettings.newResponse}
                      onCheckedChange={() => handleToggleNotification("newResponse")}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="completed-questionnaire">Completed Questionnaire</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive an email when a questionnaire is fully completed
                      </p>
                    </div>
                    <Switch
                      id="completed-questionnaire"
                      checked={notificationSettings.completedQuestionnaire}
                      onCheckedChange={() => handleToggleNotification("completedQuestionnaire")}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="daily-summary">Daily Summary</Label>
                      <p className="text-sm text-muted-foreground">Receive a daily summary of all responses</p>
                    </div>
                    <Switch
                      id="daily-summary"
                      checked={notificationSettings.dailySummary}
                      onCheckedChange={() => handleToggleNotification("dailySummary")}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="weekly-summary">Weekly Summary</Label>
                      <p className="text-sm text-muted-foreground">Receive a weekly summary of all responses</p>
                    </div>
                    <Switch
                      id="weekly-summary"
                      checked={notificationSettings.weeklySummary}
                      onCheckedChange={() => handleToggleNotification("weeklySummary")}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Save Settings</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="templates">
              <Card>
                <CardHeader>
                  <CardTitle>Email Templates</CardTitle>
                  <CardDescription>Customize the content of your notification emails</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="new-response">
                    <TabsList className="mb-4">
                      <TabsTrigger value="new-response">New Response</TabsTrigger>
                      <TabsTrigger value="completed">Completed Questionnaire</TabsTrigger>
                      <TabsTrigger value="summary">Summary Reports</TabsTrigger>
                    </TabsList>

                    <TabsContent value="new-response" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="subject">Email Subject</Label>
                        <Input
                          id="subject"
                          placeholder="New response received"
                          defaultValue="New response received for [Questionnaire Name]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="body">Email Body</Label>
                        <Textarea
                          id="body"
                          placeholder="Email content"
                          className="min-h-[200px]"
                          defaultValue={`Hello,

A new response has been submitted to your questionnaire "[Questionnaire Name]".

Respondent: [Respondent Name]
Date: [Submission Date]

You can listen to the audio responses and view transcripts in your dashboard.

Thanks,
AudioForm Team`}
                        />
                      </div>

                      <div className="pt-4">
                        <p className="text-sm text-muted-foreground mb-2">Available Variables:</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">[Questionnaire Name]</Badge>
                          <Badge variant="outline">[Respondent Name]</Badge>
                          <Badge variant="outline">[Submission Date]</Badge>
                          <Badge variant="outline">[Response Count]</Badge>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="completed">
                      <p className="text-muted-foreground">Completed questionnaire template content will go here.</p>
                    </TabsContent>

                    <TabsContent value="summary">
                      <p className="text-muted-foreground">Summary reports template content will go here.</p>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter>
                  <Button>Save Templates</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="test">
              <Card>
                <CardHeader>
                  <CardTitle>Send Test Email</CardTitle>
                  <CardDescription>Test your email notification setup</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {success && (
                    <Alert className="mb-4">
                      <Mail className="h-4 w-4" />
                      <AlertTitle>Success</AlertTitle>
                      <AlertDescription>
                        {success}
                        {previewUrl && (
                          <div className="mt-2">
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-primary hover:underline"
                            >
                              View email preview <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                            <p className="text-xs text-muted-foreground mt-1">
                              (Using Ethereal Email for development - emails are not actually delivered)
                            </p>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <Mail className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="recipients">Recipients (comma separated)</Label>
                    <Input
                      id="recipients"
                      placeholder="email@example.com, another@example.com"
                      value={emailRecipients}
                      onChange={(e) => setEmailRecipients(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="test-subject">Subject</Label>
                    <Input
                      id="test-subject"
                      placeholder="Email subject"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="test-body">Body</Label>
                    <Textarea
                      id="test-body"
                      placeholder="Email content"
                      className="min-h-[150px]"
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSendTestEmail} disabled={isLoading || !emailRecipients}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" /> Send Test Email
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
