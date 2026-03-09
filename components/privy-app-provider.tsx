"use client"

import type React from "react"
import { PrivyProvider } from "@privy-io/react-auth"

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID

export function PrivyAppProvider({ children }: { children: React.ReactNode }) {
  if (!PRIVY_APP_ID) return <>{children}</>

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#b85e2d",
        },
        loginMethods: ["google"],
      }}
    >
      {children}
    </PrivyProvider>
  )
}

