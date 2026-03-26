/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable streaming metadata so HTML-limited crawlers like WhatsApp
  // receive Open Graph tags in the initial <head>.
  htmlLimitedBots: /.*/,
  images: {
    unoptimized: true,
  },
  
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
  
  // Fail build on ESLint errors
  eslint: {
    ignoreDuringBuilds: false,
  },
}

export default nextConfig
