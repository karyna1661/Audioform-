import { notFound } from "next/navigation"
import { LocalXSignalDashboard } from "@/components/local-x-signal-dashboard"
import { getLocalXSignalSnapshot } from "@/lib/server/local-x-signal"

export default function LocalXSignalPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  const snapshot = getLocalXSignalSnapshot()
  return <LocalXSignalDashboard snapshot={snapshot} />
}

