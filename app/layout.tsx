import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/components/theme-provider"

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://audioform-production.up.railway.app"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body" suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Audioform",
    template: "%s | Audioform",
  },
  description: "Voice surveys that let people answer with one concrete moment instead of a checkbox.",
  applicationName: "Audioform",
  openGraph: {
    siteName: "Audioform",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@audioform",
  },
}
