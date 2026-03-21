import { randomUUID } from "node:crypto"
import { isRedisConfigured, runRedisCommand } from "@/lib/server/redis-client"

const DEFAULT_QUEUE = "audioform:jobs"

export type JobEnvelope<TPayload = unknown> = {
  id: string
  type: string
  payload: TPayload
  createdAt: string
}

export type EmailJobPayload = {
  to: string[]
  subject: string
  html?: string
  text?: string
}

export type TranscriptionJobPayload = {
  questionId: string
  mimeType: string
  fileName: string
  audioBase64: string
}

export type AnalyticsJobPayload = {
  eventName: string
  userId?: string | null
  surveyId?: string | null
  responseId?: string | null
  eventData?: Record<string, unknown>
}

export type NotificationDigestJobPayload = {
  userId: string
  digestType: "daily" | "weekly"
}

export function isBackgroundJobsEnabled(): boolean {
  return isRedisConfigured() && process.env.ENABLE_BACKGROUND_JOBS === "true"
}

export async function enqueueJob<TPayload>(type: string, payload: TPayload, queueName = DEFAULT_QUEUE): Promise<JobEnvelope<TPayload>> {
  const envelope: JobEnvelope<TPayload> = {
    id: randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString(),
  }

  await runRedisCommand(["RPUSH", queueName, JSON.stringify(envelope)])
  return envelope
}

export async function enqueueEmailJob(payload: EmailJobPayload): Promise<JobEnvelope<EmailJobPayload>> {
  return enqueueJob("email.send", payload)
}

export async function enqueueTranscriptionJob(payload: TranscriptionJobPayload): Promise<JobEnvelope<TranscriptionJobPayload>> {
  return enqueueJob("transcription.process", payload)
}

export async function enqueueAnalyticsJob(payload: AnalyticsJobPayload): Promise<JobEnvelope<AnalyticsJobPayload>> {
  return enqueueJob("analytics.record", payload)
}

export async function enqueueNotificationDigestJob(
  payload: NotificationDigestJobPayload,
): Promise<JobEnvelope<NotificationDigestJobPayload>> {
  return enqueueJob("notification.digest", payload)
}

export async function setJobResult(jobId: string, value: unknown, ttlSeconds = 3600): Promise<void> {
  await runRedisCommand(["SETEX", `audioform:job-result:${jobId}`, String(ttlSeconds), JSON.stringify(value)])
}

export async function getJobResult(jobId: string): Promise<unknown | null> {
  const result = await runRedisCommand(["GET", `audioform:job-result:${jobId}`])
  return typeof result === "string" ? JSON.parse(result) : null
}
