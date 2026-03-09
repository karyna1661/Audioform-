import { notFound } from "next/navigation"
import { LocalContentScheduler } from "@/components/local-content-scheduler"

export default function LocalContentSchedulerPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  return <LocalContentScheduler />
}

