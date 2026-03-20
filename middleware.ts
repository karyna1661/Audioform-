import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Minimum required env vars for the app to function
const MINIMUM_REQUIRED_ENV = [
  'AUTH_SESSION_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]

export function config() {
  return {
    matcher: [
      /*
       * Match all request paths except:
       * - _next/static (static files)
       * - _next/image (image optimization files)
       * - favicon.ico (favicon file)
       * - public files (public folder)
       */
      '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
  }
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip validation for static files and health checks
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/health' ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|webp)$/i)
  ) {
    return NextResponse.next()
  }

  // Validate minimum required environment variables
  const missingEnvVars = MINIMUM_REQUIRED_ENV.filter(
    (envVar) => !(process.env[envVar] ?? '').trim()
  )

  if (missingEnvVars.length > 0) {
    const isProd = process.env.NODE_ENV === 'production'
    
    // Log detailed error for debugging
    console.error('❌ CRITICAL: Missing environment variables detected:')
    missingEnvVars.forEach((envVar) => {
      console.error(`   - ${envVar}`)
    })
    
    // In production, block requests and show error page
    if (isProd) {
      console.error('\n🛑 BLOCKING REQUEST: Application cannot function without required configuration.')
      console.error('📝 Fix: Add missing environment variables to Railway deployment.\n')
      
      // For API routes, return JSON error
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          {
            error: 'Server Configuration Error',
            message: 'Missing required environment variables. Contact administrator.',
            details: process.env.NODE_ENV === 'development' ? missingEnvVars : undefined,
          },
          { status: 503 }
        )
      }
      
      // For web pages, redirect to error page
      const errorUrl = new URL('/error/configuration', request.url)
      errorUrl.searchParams.set('missing', missingEnvVars.join(','))
      return NextResponse.redirect(errorUrl)
    }
    
    // In development, just warn but continue
    console.warn('⚠️  Running with missing environment variables. Some features may not work.')
  }

  // Add security headers to all responses
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Remove Server header (information disclosure)
  response.headers.delete('Server')
  response.headers.delete('X-Powered-By')
  
  return response
}
