import { NextRequest, NextResponse } from "next/server"

function isEmbedRoute(pathname: string): boolean {
  return pathname.startsWith("/embed")
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname
  const embed = isEmbedRoute(pathname)

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https:",
    "font-src 'self' https: data:",
    embed ? "frame-ancestors *" : "frame-ancestors 'none'",
  ].join("; ")

  response.headers.set("Content-Security-Policy", csp)
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Permissions-Policy", "microphone=(self), camera=(), geolocation=()")
  if (!embed) {
    response.headers.set("X-Frame-Options", "DENY")
  }
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

