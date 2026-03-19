import { NotificationConfig } from "@/lib/server/notification-store"

type DigestFrequency = "immediate" | "hourly" | "daily" | "weekly"

type PendingNotification = {
  surveyId: string
  surveyTitle: string
  responseCount: number
  lastSentAt: string | null
}

/**
 * Determine if we should send notification immediately or batch for digest
 */
export function shouldSendImmediateNotification(config: NotificationConfig): boolean {
  // If no digest preference, send immediate
  if (!config.dailySummary && !config.weeklySummary) {
    return true
  }
  
  // User prefers digests, don't send immediate
  return false
}

/**
 * Get user's preferred digest frequency
 */
export function getDigestFrequency(config: NotificationConfig): DigestFrequency {
  if (config.weeklySummary) return "weekly"
  if (config.dailySummary) return "daily"
  return "immediate"
}

/**
 * Check if it's time to send digest based on frequency and last sent time
 */
export function shouldSendDigest(
  frequency: DigestFrequency,
  lastSentAt: string | null,
  now: Date = new Date()
): boolean {
  if (!lastSentAt) return true
  
  const lastSent = new Date(lastSentAt)
  const hoursSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60)
  
  switch (frequency) {
    case "immediate":
      return true // Already handled by shouldSendImmediateNotification
    case "hourly":
      return hoursSinceLastSent >= 1
    case "daily":
      return hoursSinceLastSent >= 24
    case "weekly":
      return hoursSinceLastSent >= 24 * 7
    default:
      return true
  }
}

/**
 * Format digest email subject with summary stats
 */
export function formatDigestSubject(
  frequency: DigestFrequency,
  responseCount: number,
  surveyCount: number
): string {
  const frequencyLabel = frequency === "daily" ? "Daily" : frequency === "weekly" ? "Weekly" : "Hourly"
  return `${frequencyLabel} Signal Digest: ${responseCount} new responses across ${surveyCount} surveys`
}

/**
 * Format digest email body with list of surveys and response counts
 */
export function formatDigestBody(
  frequency: DigestFrequency,
  surveys: PendingNotification[]
): string {
  const totalResponses = surveys.reduce((sum, s) => sum + s.responseCount, 0)
  const dateRange = getDateRangeLabel(frequency)
  
  let body = `Your ${frequency.toLowerCase()} signal digest is ready.\n\n`
  body += `Total Responses: ${totalResponses}\n`
  body += `Surveys with Activity: ${surveys.length}\n\n`
  body += `${dateRange}\n\n`
  body += "─".repeat(40) + "\n\n"
  
  surveys.forEach((survey, index) => {
    body += `${index + 1}. ${survey.surveyTitle}\n`
    body += `   Responses: ${survey.responseCount}\n`
    body += `   Last Response: ${survey.lastSentAt ? new Date(survey.lastSentAt).toLocaleDateString() : "Unknown"}\n\n`
  })
  
  body += "\n" + "─".repeat(40) + "\n\n"
  body += "Visit your dashboard to listen to all responses."
  
  return body
}

/**
 * Get human-readable date range label for digest
 */
function getDateRangeLabel(frequency: DigestFrequency): string {
  const now = new Date()
  let startDate: Date
  
  switch (frequency) {
    case "hourly":
      startDate = new Date(now.getTime() - 60 * 60 * 1000)
      return `Last hour: ${startDate.toLocaleTimeString()} - ${now.toLocaleTimeString()}`
    case "daily":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      return `Last 24 hours: ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()} - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
    case "weekly":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return `Last 7 days: ${startDate.toLocaleDateString()} - ${now.toLocaleDateString()}`
    default:
      return ""
  }
}

/**
 * Group pending notifications by user and digest schedule
 */
export function groupNotificationsForDigest(
  notifications: Array<{
    userId: string
    surveyId: string
    surveyTitle: string
    responseCount: number
    lastSentAt: string | null
  }>
): Map<string, PendingNotification[]> {
  const grouped = new Map<string, PendingNotification[]>()
  
  notifications.forEach((notification) => {
    const existing = grouped.get(notification.userId) || []
    existing.push({
      surveyId: notification.surveyId,
      surveyTitle: notification.surveyTitle,
      responseCount: notification.responseCount,
      lastSentAt: notification.lastSentAt,
    })
    grouped.set(notification.userId, existing)
  })
  
  return grouped
}
