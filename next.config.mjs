import os from "node:os"

function getLocalDevOrigins() {
  const interfaces = os.networkInterfaces()
  const origins = []

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family !== "IPv4" || address.internal) continue
      origins.push(`http://${address.address}:3000`)
    }
  }

  return origins
}

const devAllowedOrigins = Array.from(
  new Set(
    [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://10.5.0.2:3000",
      ...getLocalDevOrigins(),
      process.env.NEXT_PUBLIC_APP_URL,
      ...(process.env.DEV_ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()) ?? []),
    ].filter(Boolean),
  ),
)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable streaming metadata so HTML-limited crawlers like WhatsApp
  // receive Open Graph tags in the initial <head>.
  htmlLimitedBots: /.*/,
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: devAllowedOrigins,
  
  // Run environment validation before build
  experimental: {
    // Enable better error messages for missing env vars
    optimizePackageImports: ['@privy-io/react-auth', 'better-auth'],
  },
  
  // Ensure NEXT_PUBLIC_ variables are available at build time
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    NEXT_PUBLIC_AUDIOFORM_FEEDBACK_SURVEY_ID: process.env.NEXT_PUBLIC_AUDIOFORM_FEEDBACK_SURVEY_ID,
  },
  
  // Fail build on TypeScript errors (including env var type checking)
  // skipLibCheck in tsconfig.json handles type checking in dependencies
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
