import { sendEmail } from "@/lib/server/email-sender"
import { enqueueEmailJob, type EmailJobPayload, isEmailJobsEnabled } from "@/lib/server/job-queue"

export async function sendOrQueueEmail(payload: EmailJobPayload): Promise<
  | { mode: "queued"; jobId: string }
  | { mode: "inline"; messageId: string; previewUrl: string | null }
> {
  if (isEmailJobsEnabled()) {
    const job = await enqueueEmailJob(payload)
    return { mode: "queued", jobId: job.id }
  }

  const sent = await sendEmail(payload)
  return { mode: "inline", messageId: sent.messageId, previewUrl: sent.previewUrl }
}
