import { randomUUID } from "node:crypto"
import { enqueueAnalyticsJob, isAnalyticsJobsEnabled } from "@/lib/server/job-queue"
import { logServerError, retryAsync } from "@/lib/server/observability"

export type AnalyticsEvent = {
  id: string
  eventName: string
  userId?: string | null
  surveyId?: string | null
  responseId?: string | null
  eventData: Record<string, unknown>
  timestamp: string
}

type AnalyticsEventRow = {
  id: string
  event_name: string
  user_id: string | null
  survey_id: string | null
  response_id: string | null
  event_data: Record<string, unknown>
  timestamp: string
}

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
    process.env.SUPABASE_SERVICE_ROLE ||
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

  throw new Error("Missing Supabase config for analytics store.")
}

async function supabaseRequest<T>(pathValue: string, init?: RequestInit): Promise<T> {
  const { url, key } = resolveSupabaseConfig()
  const response = await retryAsync(
    async () =>
      fetch(`${url}${pathValue}`, {
        ...init,
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
        cache: "no-store",
      }),
    {
      attempts: 3,
      timeoutMs: 8_000,
      initialDelayMs: 250,
      shouldRetry: (error) => error instanceof Error && /timed out|fetch failed/i.test(error.message),
    },
  )

  if (!response.ok) {
    const text = await response.text()
    if (response.status >= 500 || response.status === 429) {
      logServerError("server.analytics", "supabase_request_failed", new Error(`Supabase analytics request failed (${response.status})`), {
        path: pathValue,
        status: response.status,
      })
    }
    throw new Error(`Supabase analytics request failed (${response.status}): ${text.slice(0, 280)}`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function mapRow(row: AnalyticsEventRow): AnalyticsEvent {
  return {
    id: row.id,
    eventName: row.event_name,
    userId: row.user_id,
    surveyId: row.survey_id,
    responseId: row.response_id,
    eventData: row.event_data,
    timestamp: row.timestamp,
  }
}

/**
 * Record an analytics event to the database
 */
export async function recordAnalyticsEvent(input: {
  eventName: string
  userId?: string | null
  surveyId?: string | null
  responseId?: string | null
  eventData?: Record<string, unknown>
}): Promise<AnalyticsEvent> {
  const id = randomUUID()
  const timestamp = new Date().toISOString()

  const rows = await supabaseRequest<AnalyticsEventRow[]>("/rest/v1/analytics_events", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([
      {
        id,
        event_name: input.eventName,
        user_id: input.userId ?? null,
        survey_id: input.surveyId ?? null,
        response_id: input.responseId ?? null,
        event_data: input.eventData ?? {},
        timestamp,
      },
    ]),
  })

  if (!rows.length) throw new Error("Failed to persist analytics event.")
  return mapRow(rows[0])
}

export async function recordOrQueueAnalyticsEvent(input: {
  eventName: string
  userId?: string | null
  surveyId?: string | null
  responseId?: string | null
  eventData?: Record<string, unknown>
}): Promise<
  | { mode: "queued"; jobId: string }
  | { mode: "inline"; event: AnalyticsEvent }
> {
  if (isAnalyticsJobsEnabled()) {
    const job = await enqueueAnalyticsJob(input)
    return { mode: "queued", jobId: job.id }
  }

  const event = await recordAnalyticsEvent(input)
  return { mode: "inline", event }
}

/**
 * Get events for a specific user
 */
export async function getEventsByUserId(userId: string, limit = 100): Promise<AnalyticsEvent[]> {
  const rows = await supabaseRequest<AnalyticsEventRow[]>(
    `/rest/v1/analytics_events?user_id=eq.${encodeURIComponent(userId)}&order=timestamp.desc&limit=${limit}`,
  )
  return rows.map(mapRow)
}

/**
 * Get events for a specific survey
 */
export async function getEventsBySurveyId(surveyId: string, limit = 100): Promise<AnalyticsEvent[]> {
  const rows = await supabaseRequest<AnalyticsEventRow[]>(
    `/rest/v1/analytics_events?survey_id=eq.${encodeURIComponent(surveyId)}&order=timestamp.desc&limit=${limit}`,
  )
  return rows.map(mapRow)
}

/**
 * Get events by event name
 */
export async function getEventsByName(eventName: string, limit = 100): Promise<AnalyticsEvent[]> {
  const rows = await supabaseRequest<AnalyticsEventRow[]>(
    `/rest/v1/analytics_events?event_name=eq.${encodeURIComponent(eventName)}&order=timestamp.desc&limit=${limit}`,
  )
  return rows.map(mapRow)
}

/**
 * Compute aggregate metrics from events
 */
export async function computeEventMetrics(params: {
  eventName: string
  groupBy?: "userId" | "surveyId"
  timeRangeDays?: number
}): Promise<Array<{ key: string; count: number }>> {
  const { eventName, groupBy, timeRangeDays } = params
  const now = new Date()
  const startTime = timeRangeDays
    ? new Date(now.getTime() - timeRangeDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const selectField = groupBy === "userId" ? "user_id" : groupBy === "surveyId" ? "survey_id" : null

  if (!selectField) {
    // Simple count
    const params_list = [`event_name=eq.${encodeURIComponent(eventName)}`]
    if (startTime) params_list.push(`timestamp=gte.${startTime}`)

    const rows = await supabaseRequest<AnalyticsEventRow[]>(
      `/rest/v1/analytics_events?${params_list.join("&")}`,
    )
    return [{ key: "total", count: rows.length }]
  }

  // Grouped aggregation would require RPC or client-side grouping
  // For now, do client-side grouping
  const params_list = [`event_name=eq.${encodeURIComponent(eventName)}`]
  if (startTime) params_list.push(`timestamp=gte.${startTime}`)

  const rows = await supabaseRequest<AnalyticsEventRow[]>(
    `/rest/v1/analytics_events?${params_list.join("&")}`,
  )

  const grouped = new Map<string, number>()
  rows.forEach((row) => {
    const keyValue = row[groupBy === "userId" ? "user_id" : "survey_id"] ?? "unknown"
    grouped.set(keyValue, (grouped.get(keyValue) ?? 0) + 1)
  })

  return Array.from(grouped.entries()).map(([key, count]) => ({ key, count }))
}
