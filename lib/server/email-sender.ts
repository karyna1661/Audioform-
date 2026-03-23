import nodemailer from "nodemailer"
import { logServerError, retryAsync, withTimeout } from "@/lib/server/observability"

type EmailInput = {
  to: string[]
  subject: string
  html?: string
  text?: string
}

export type EmailSendResult = {
  messageId: string
  previewUrl: string | null
}

async function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number.parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SMTP credentials are required in production.")
  }

  const testAccount = await nodemailer.createTestAccount()
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  })
}

export async function sendEmail(input: EmailInput): Promise<EmailSendResult> {
  if (!input.to.length) throw new Error("At least one recipient is required.")
  if (!input.subject.trim()) throw new Error("Email subject is required.")
  if (!input.html && !input.text) throw new Error("Email body is required.")

  const transporter = await withTimeout(() => createTransporter(), 10_000, "SMTP transporter setup")

  const info = await retryAsync<Awaited<ReturnType<typeof transporter.sendMail>>>(
    async () =>
      withTimeout(
        () =>
          transporter.sendMail({
            from: '"AudioForm" <notifications@audioform.example.com>',
            to: input.to.join(", "),
            subject: input.subject,
            text: input.text,
            html: input.html,
          }),
        10_000,
        "SMTP sendMail",
      ),
    {
      attempts: 2,
      initialDelayMs: 400,
      shouldRetry: (error) =>
        error instanceof Error && /timed out|ECONNRESET|ECONNREFUSED|EPIPE|ETIMEDOUT|ESOCKET/i.test(error.message),
    },
  ).catch((error) => {
    logServerError("server.email", "send_failed", error, {
      recipientCount: input.to.length,
      subjectLength: input.subject.length,
    })
    throw error
  })

  const previewUrl =
    info.messageId && info.envelope && !process.env.SMTP_HOST
      ? nodemailer.getTestMessageUrl(info)
      : null

  return {
    messageId: info.messageId,
    previewUrl,
  }
}
