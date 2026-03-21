import { Socket } from "node:net"
import { connect as connectTls, TLSSocket } from "node:tls"

type RedisConnectionOptions = {
  host: string
  port: number
  password?: string
  username?: string
  tls: boolean
}

type RedisValue = string | number | null | RedisValue[]

function parseRedisUrl(): RedisConnectionOptions | null {
  const redisUrl = process.env.REDIS_URL?.trim()
  if (!redisUrl) return null

  const parsed = new URL(redisUrl)
  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    throw new Error("REDIS_URL must use redis:// or rediss://")
  }

  return {
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : parsed.protocol === "rediss:" ? 6380 : 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    tls: parsed.protocol === "rediss:",
  }
}

function createSocket(options: RedisConnectionOptions): Promise<Socket | TLSSocket> {
  return new Promise((resolve, reject) => {
    const socket = options.tls
      ? connectTls({ host: options.host, port: options.port, servername: options.host })
      : new Socket()

    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }

    const onConnect = () => {
      cleanup()
      resolve(socket)
    }

    const cleanup = () => {
      socket.off("error", onError)
      socket.off("connect", onConnect)
      socket.off("secureConnect", onConnect)
    }

    socket.once("error", onError)
    if (options.tls) {
      socket.once("secureConnect", onConnect)
    } else {
      socket.once("connect", onConnect)
      socket.connect(options.port, options.host)
    }
  })
}

function encodeCommand(parts: string[]): string {
  let output = `*${parts.length}\r\n`
  for (const part of parts) {
    output += `$${Buffer.byteLength(part)}\r\n${part}\r\n`
  }
  return output
}

function parseValue(input: string, index = 0): { value: RedisValue; nextIndex: number } {
  const prefix = input[index]
  const lineEnd = input.indexOf("\r\n", index)
  if (lineEnd === -1) {
    throw new Error("Incomplete Redis response.")
  }

  if (prefix === "+") {
    return { value: input.slice(index + 1, lineEnd), nextIndex: lineEnd + 2 }
  }

  if (prefix === ":") {
    return { value: Number.parseInt(input.slice(index + 1, lineEnd), 10), nextIndex: lineEnd + 2 }
  }

  if (prefix === "$") {
    const length = Number.parseInt(input.slice(index + 1, lineEnd), 10)
    if (length === -1) {
      return { value: null, nextIndex: lineEnd + 2 }
    }
    const start = lineEnd + 2
    const end = start + length
    return { value: input.slice(start, end), nextIndex: end + 2 }
  }

  if (prefix === "*") {
    const count = Number.parseInt(input.slice(index + 1, lineEnd), 10)
    if (count === -1) {
      return { value: null, nextIndex: lineEnd + 2 }
    }
    const values: RedisValue[] = []
    let nextIndex = lineEnd + 2
    for (let i = 0; i < count; i += 1) {
      const parsed = parseValue(input, nextIndex)
      values.push(parsed.value)
      nextIndex = parsed.nextIndex
    }
    return { value: values, nextIndex }
  }

  if (prefix === "-") {
    throw new Error(input.slice(index + 1, lineEnd))
  }

  throw new Error(`Unsupported Redis response prefix: ${prefix}`)
}

async function sendCommand(parts: string[]): Promise<RedisValue> {
  const options = parseRedisUrl()
  if (!options) {
    throw new Error("REDIS_URL is not configured.")
  }

  const socket = await createSocket(options)
  socket.setTimeout(5000)

  return await new Promise((resolve, reject) => {
    let buffer = ""
    let authenticated = false

    const cleanup = () => {
      socket.removeAllListeners("data")
      socket.removeAllListeners("error")
      socket.removeAllListeners("timeout")
      socket.removeAllListeners("close")
      socket.end()
      socket.destroy()
    }

    const fail = (error: Error) => {
      cleanup()
      reject(error)
    }

    socket.on("data", (chunk: Buffer) => {
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
        if (error instanceof Error && error.message === "Incomplete Redis response.") {
          return
        }
        fail(error instanceof Error ? error : new Error("Failed to parse Redis response."))
      }
    })

    socket.once("error", fail)
    socket.once("timeout", () => fail(new Error("Redis command timed out.")))
    socket.once("close", () => {
      if (!buffer) {
        reject(new Error("Redis connection closed before a response was received."))
      }
    })

    const authParts = options.username
      ? ["AUTH", options.username, options.password || ""]
      : options.password
        ? ["AUTH", options.password]
        : null

    if (authParts) {
      socket.write(encodeCommand(authParts))
      return
    }
    socket.write(encodeCommand(parts))
  })
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim())
}

export async function evalRedis(script: string, keys: string[], args: string[]): Promise<RedisValue> {
  const command = ["EVAL", script, String(keys.length), ...keys, ...args]
  return sendCommand(command)
}
