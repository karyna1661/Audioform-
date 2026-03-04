type NotificationConfigRow = {
  user_id: string
  new_response: boolean | null
  completed_questionnaire: boolean | null
  daily_summary: boolean | null
  weekly_summary: boolean | null
  template_subject: string | null
  template_body: string | null
  recipients: string[] | null
  updated_at: string
}

export type NotificationConfig = {
  userId: string
  newResponse: boolean
  completedQuestionnaire: boolean
  dailySummary: boolean
  weeklySummary: boolean
  templateSubject: string
  templateBody: string
  recipients: string[]
  updatedAt: string
}

const DEFAULT_SUBJECT = "New response received"
const DEFAULT_BODY = "A new response has been submitted to your questionnaire."

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".")
  if (parts.length < 2) return null
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4)
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>
  } catch {
    return null
  }
}

function resolveSupabaseConfig(): { url: string; key: string } {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_API ||
    process.env.SUPABASE_ANON_KEY ||
    ""

  const explicitUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  if (explicitUrl && key) return { url: explicitUrl.replace(/\/+$/, ""), key }

  const projectRefFromEnv = process.env.SUPABASE_PROJECT_REF || ""
  if (projectRefFromEnv && key) {
    return { url: `https://${projectRefFromEnv}.supabase.co`, key }
  }

  const payload = key ? decodeJwtPayload(key) : null
  const ref = typeof payload?.ref === "string" ? payload.ref : ""
  if (ref && key) {
    return { url: `https://${ref}.supabase.co`, key }
  }

  throw new Error("Missing Supabase config for notification store.")
}

async function supabaseRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { url, key } = resolveSupabaseConfig()
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase notification request failed (${response.status}): ${text.slice(0, 280)}`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function mapNotificationConfig(row: NotificationConfigRow): NotificationConfig {
  return {
    userId: row.user_id,
    newResponse: row.new_response ?? true,
    completedQuestionnaire: row.completed_questionnaire ?? true,
    dailySummary: row.daily_summary ?? false,
    weeklySummary: row.weekly_summary ?? true,
    templateSubject: row.template_subject || DEFAULT_SUBJECT,
    templateBody: row.template_body || DEFAULT_BODY,
    recipients: Array.isArray(row.recipients) ? row.recipients : [],
    updatedAt: row.updated_at,
  }
}

export async function getNotificationConfigByUserId(userId: string): Promise<NotificationConfig> {
  const rows = await supabaseRequest<NotificationConfigRow[]>(
    `/rest/v1/notification_configs?user_id=eq.${encodeURIComponent(
      userId,
    )}&select=user_id,new_response,completed_questionnaire,daily_summary,weekly_summary,template_subject,template_body,recipients,updated_at&limit=1`,
  )

  if (!rows.length) {
    return {
      userId,
      newResponse: true,
      completedQuestionnaire: true,
      dailySummary: false,
      weeklySummary: true,
      templateSubject: DEFAULT_SUBJECT,
      templateBody: DEFAULT_BODY,
      recipients: [],
      updatedAt: new Date(0).toISOString(),
    }
  }
  return mapNotificationConfig(rows[0])
}

export async function upsertNotificationConfig(input: {
  userId: string
  newResponse: boolean
  completedQuestionnaire: boolean
  dailySummary: boolean
  weeklySummary: boolean
  templateSubject: string
  templateBody: string
  recipients: string[]
}): Promise<NotificationConfig> {
  const rows = await supabaseRequest<NotificationConfigRow[]>(
    "/rest/v1/notification_configs?on_conflict=user_id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([
        {
          user_id: input.userId,
          new_response: input.newResponse,
          completed_questionnaire: input.completedQuestionnaire,
          daily_summary: input.dailySummary,
          weekly_summary: input.weeklySummary,
          template_subject: input.templateSubject || DEFAULT_SUBJECT,
          template_body: input.templateBody || DEFAULT_BODY,
          recipients: input.recipients,
          updated_at: new Date().toISOString(),
        },
      ]),
    },
  )

  if (!rows.length) throw new Error("Failed to save notification config.")
  return mapNotificationConfig(rows[0])
}
