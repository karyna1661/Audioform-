import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  try {
    const response = NextResponse.next()
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("X-Content-Type-Options", "nosniff")
    return response
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
