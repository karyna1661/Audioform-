import { randomUUID } from "node:crypto"

type LogLevel = "info" | "error"

type RetryOptions = {
  attempts?: number
  timeoutMs?: number
  initialDelayMs?: number
  shouldRetry?: (error: unknown) => boolean
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    }
  }

  return { message: String(error) }
}

function writeLog(level: LogLevel, scope: string, event: string, payload?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    event,
    ...payload,
  }

  const line = JSON.stringify(entry)
  if (level === "error") {
    console.error(line)
    return
  }

  console.log(line)
}

export function logServerEvent(scope: string, event: string, payload?: Record<string, unknown>) {
  writeLog("info", scope, event, payload)
}

export function logServerError(scope: string, event: string, error: unknown, payload?: Record<string, unknown>) {
  writeLog("error", scope, event, {
    ...payload,
    error: serializeError(error),
  })
}

export function getRequestId(headers: Headers): string {
  return headers.get("x-request-id")?.trim() || randomUUID()
}

export async function withTimeout<T>(operation: () => Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle)
  }
}

export async function retryAsync<T>(operation: (attempt: number) => Promise<T>, options?: RetryOptions): Promise<T> {
  const attempts = Math.max(1, options?.attempts ?? 1)
  const initialDelayMs = Math.max(0, options?.initialDelayMs ?? 250)
  const shouldRetry = options?.shouldRetry ?? (() => false)

  let lastError: unknown = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      if (options?.timeoutMs) {
        return await withTimeout(() => operation(attempt), options.timeoutMs, `attempt ${attempt}`)
      }

      return await operation(attempt)
    } catch (error) {
      lastError = error
      if (attempt >= attempts || !shouldRetry(error)) {
        throw error
      }

      const delay = initialDelayMs * Math.pow(2, attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Retry operation failed.")
}
