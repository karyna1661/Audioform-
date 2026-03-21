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
