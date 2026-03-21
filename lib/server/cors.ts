import { hasTrustedOrigin, resolveExpectedOrigin } from "@/lib/server/request-guards"

type CorsOptions = {
  methods: string
  headers?: string
}

const DEFAULT_ALLOWED_HEADERS = "Content-Type, Idempotency-Key"

export function hasAllowedApiOrigin(request: Request): boolean {
  const requestOrigin = request.headers.get("origin")
  const requestReferer = request.headers.get("referer")

  if (!requestOrigin && !requestReferer) {
    return true
  }

  return hasTrustedOrigin({
    requestOrigin,
    requestReferer,
    requestUrl: request.url,
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
  })
}

export function getCorsHeaders(request: Request, options: CorsOptions): Record<string, string> {
  const requestOrigin = request.headers.get("origin")
  const expectedOrigin = resolveExpectedOrigin({
    requestUrl: request.url,
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
  })

  const allowOrigin =
    requestOrigin &&
    hasTrustedOrigin({
      requestOrigin,
      requestReferer: request.headers.get("referer"),
      requestUrl: request.url,
      configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    })
      ? requestOrigin
      : expectedOrigin

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": options.methods,
    "Access-Control-Allow-Headers": options.headers || DEFAULT_ALLOWED_HEADERS,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  }
}
