#!/usr/bin/env node

import { Socket } from "node:net"
import { connect as connectTls } from "node:tls"
import nodemailer from "nodemailer"

function decodeJwtPayload(token) {
  const parts = token.split(".")
  if (parts.length < 2) return null
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4)
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"))
  } catch {
    return null
  }
}

function resolveSupabaseConfig() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ""
  const explicitUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  if (explicitUrl && key) return { url: explicitUrl.replace(/\/+$/, ""), key }
  const payload = key ? decodeJwtPayload(key) : null
  const ref = typeof payload?.ref === "string" ? payload.ref : ""
  if (ref && key) return { url: `https://${ref}.supabase.co`, key }
  throw new Error("Missing Supabase config for queue worker")
}

async function supabaseRequest(path, init = {}) {
  const { url, key } = resolveSupabaseConfig()
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`Supabase queue request failed (${response.status}): ${text.slice(0, 280)}`)
  }
  if (response.status === 204) return null
  return response.json()
}

async function setJobResult(jobId, value, ttlSeconds = 3600) {
  await runRedisCommand(["SETEX", `audioform:job-result:${jobId}`, String(ttlSeconds), JSON.stringify(value)])
}

function parseRedisUrl() {
  const redisUrl = process.env.REDIS_URL?.trim()
  if (!redisUrl) throw new Error("REDIS_URL is required for queue worker")

  const parsed = new URL(redisUrl)
  return {
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : parsed.protocol === "rediss:" ? 6380 : 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    tls: parsed.protocol === "rediss:",
  }
}

function encodeCommand(parts) {
  let output = `*${parts.length}\r\n`
  for (const part of parts) {
    output += `$${Buffer.byteLength(part)}\r\n${part}\r\n`
  }
  return output
}

function parseValue(input, index = 0) {
  const prefix = input[index]
  const lineEnd = input.indexOf("\r\n", index)
  if (lineEnd === -1) throw new Error("Incomplete Redis response.")

  if (prefix === "+") return { value: input.slice(index + 1, lineEnd), nextIndex: lineEnd + 2 }
  if (prefix === ":") return { value: Number.parseInt(input.slice(index + 1, lineEnd), 10), nextIndex: lineEnd + 2 }
  if (prefix === "$") {
    const length = Number.parseInt(input.slice(index + 1, lineEnd), 10)
    if (length === -1) return { value: null, nextIndex: lineEnd + 2 }
    const start = lineEnd + 2
    const end = start + length
    return { value: input.slice(start, end), nextIndex: end + 2 }
  }
  if (prefix === "*") {
    const count = Number.parseInt(input.slice(index + 1, lineEnd), 10)
    if (count === -1) return { value: null, nextIndex: lineEnd + 2 }
    const values = []
    let nextIndex = lineEnd + 2
    for (let i = 0; i < count; i += 1) {
      const parsed = parseValue(input, nextIndex)
      values.push(parsed.value)
      nextIndex = parsed.nextIndex
    }
    return { value: values, nextIndex }
  }
  if (prefix === "-") throw new Error(input.slice(index + 1, lineEnd))
  throw new Error(`Unsupported Redis response prefix: ${prefix}`)
}

async function runRedisCommand(parts) {
  const options = parseRedisUrl()
  const socket = options.tls
    ? connectTls({ host: options.host, port: options.port, servername: options.host })
    : new Socket()

  if (!options.tls) socket.connect(options.port, options.host)
  socket.setTimeout(10000)

  return await new Promise((resolve, reject) => {
    let buffer = ""
    let authenticated = false

    const cleanup = () => {
      socket.removeAllListeners()
      socket.end()
      socket.destroy()
    }

    const fail = (error) => {
      cleanup()
      reject(error)
    }

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8")
      try {
        const parsed = parseValue(buffer)
        const authParts = options.username
          ? ["AUTH", options.username, options.password || ""]
          : options.password
            ? ["AUTH", options.password]
            : null

        if (authParts && !authenticated) {
          authenticated = true
          buffer = buffer.slice(parsed.nextIndex)
          socket.write(encodeCommand(parts))
          return
        }

        cleanup()
        resolve(parsed.value)
      } catch (error) {
        if (error instanceof Error && error.message === "Incomplete Redis response.") return
        fail(error)
      }
    })

    socket.once("error", fail)
    socket.once("timeout", () => fail(new Error("Redis command timed out.")))

    const authParts = options.username
      ? ["AUTH", options.username, options.password || ""]
      : options.password
        ? ["AUTH", options.password]
        : null

    if (authParts) {
      socket.write(encodeCommand(authParts))
    } else {
      socket.write(encodeCommand(parts))
    }
  })
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

  throw new Error("SMTP credentials are required for queue worker")
}

async function processEmailJob(payload) {
  const transporter = await createTransporter()
  await transporter.sendMail({
    from: '"AudioForm" <notifications@audioform.example.com>',
    to: payload.to.join(", "),
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  })
}

async function processAnalyticsJob(payload) {
  await supabaseRequest("/rest/v1/analytics_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([
      {
        id: crypto.randomUUID(),
        event_name: payload.eventName,
        user_id: payload.userId ?? null,
        survey_id: payload.surveyId ?? null,
        response_id: payload.responseId ?? null,
        event_data: payload.eventData ?? {},
        timestamp: new Date().toISOString(),
      },
    ]),
  })
}

async function processNotificationDigestJob(payload) {
  console.log("[queue-worker] digest placeholder", payload)
}

async function transcribeAudioPayload(payload) {
  if (!process.env.OPENAI_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Transcription provider is not configured in production.")
    }

    return "This is a mock transcription since OPENAI_API_KEY is not configured. In a production environment, this would be the actual transcription of the audio."
  }

  const bytes = Buffer.from(payload.audioBase64, "base64")
  const file = new File([bytes], payload.fileName || "audio.webm", {
    type: payload.mimeType || "audio/webm",
  })

  const openaiForm = new FormData()
  openaiForm.append("file", file)
  openaiForm.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe")

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: openaiForm,
  })

  if (!response.ok) {
    await response.text().catch(() => "")
    throw new Error("Transcription provider request failed")
  }

  const data = await response.json()
  return data.text || ""
}

async function processNext() {
  const result = await runRedisCommand(["BLPOP", "audioform:jobs", "5"])
  if (!Array.isArray(result) || result.length < 2 || typeof result[1] !== "string") return false

  const envelope = JSON.parse(result[1])
  if (envelope.type === "email.send") {
    await processEmailJob(envelope.payload)
    console.log(`[queue-worker] processed ${envelope.type}`, { id: envelope.id })
    return true
  }

  if (envelope.type === "transcription.process") {
    const transcription = await transcribeAudioPayload(envelope.payload)
    await setJobResult(envelope.id, {
      success: true,
      transcription,
      questionId: envelope.payload.questionId,
      completedAt: new Date().toISOString(),
    })
    console.log(`[queue-worker] processed ${envelope.type}`, { id: envelope.id })
    return true
  }

  if (envelope.type === "analytics.record") {
    await processAnalyticsJob(envelope.payload)
    console.log(`[queue-worker] processed ${envelope.type}`, { id: envelope.id })
    return true
  }

  if (envelope.type === "notification.digest") {
    await processNotificationDigestJob(envelope.payload)
    console.log(`[queue-worker] processed ${envelope.type}`, { id: envelope.id })
    return true
  }

  console.warn(`[queue-worker] unknown job type`, envelope.type)
  return false
}

async function main() {
  console.log("[queue-worker] started")
  while (true) {
    try {
      await processNext()
    } catch (error) {
      console.error("[queue-worker] failed", error)
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
}

main().catch((error) => {
  console.error("[queue-worker] fatal", error)
  process.exit(1)
})
