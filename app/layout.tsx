import type React from "react"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { PrivyAppProvider } from "@/components/privy-app-provider"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body" suppressHydrationWarning>
        <PrivyAppProvider>
          <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} disableTransitionOnChange>
              {children}
            </ThemeProvider>
          </AuthProvider>
        </PrivyAppProvider>
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.dev'
    };
