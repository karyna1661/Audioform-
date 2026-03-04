"use client"

import Link from "next/link"
import { useEffect } from "react"
import type { ReactNode } from "react"
import { Bricolage_Grotesque, Lora } from "next/font/google"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Home, Mic, MessagesSquare } from "lucide-react"
import { trackEvent } from "@/lib/analytics"

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "700"] })
const body = Lora({ subsets: ["latin"], weight: ["400", "500", "600"] })

export default function ThankYouPage() {
  useEffect(() => {
    trackEvent("respondent_thank_you_viewed")
  }, [])

  const handleFollowUpAction = (actionType: "return_home" | "answer_another" | "create_survey") => {
    trackEvent("respondent_follow_up_action", { action_type: actionType })
    if (actionType === "create_survey") {
      trackEvent("creator_conversion_cta_clicked", { source: "respondent_thank_you" })
    }
  }

  return (
    <main className={`${display.className} min-h-dvh bg-[#f3ecdf] p-4 sm:p-6`}>
      <section className="mx-auto max-w-4xl rounded-[1.5rem] border border-[#dbcdb8] bg-[#f9f4ea] p-5 sm:rounded-[2rem] sm:p-8">
        <div className="text-center">
          <CheckCircle2 className="mx-auto size-16 text-[#2d5a17]" aria-hidden="true" />
          <p className={`${body.className} mt-3 text-sm text-[#5c5146] text-pretty`}>Response Session Complete</p>
          <h1 className="mt-1 text-3xl font-semibold text-balance sm:text-4xl">You just helped shape our roadmap.</h1>
          <p className={`${body.className} mx-auto mt-3 max-w-2xl text-[#5c5146] text-pretty`}>
            Want to collect voice feedback like this on your own site?
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <InfoCard
            icon={<Mic className="size-4 text-[#8a431f]" aria-hidden="true" />}
            title="Captured"
            text="Audio responses were stored successfully and linked to this session."
          />
          <InfoCard
            icon={<MessagesSquare className="size-4 text-[#8a431f]" aria-hidden="true" />}
            title="Reviewed"
            text="The survey owner can now review responses and generate insights."
          />
          <InfoCard
            icon={<Home className="size-4 text-[#8a431f]" aria-hidden="true" />}
            title="Next"
            text="You can return home, create your own survey, or continue with another survey."
          />
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/" onClick={() => handleFollowUpAction("return_home")}>
            <Button variant="outline" className="w-full border-[#dbcdb8] bg-[#f3ecdf] sm:w-auto">
              Return Home
            </Button>
          </Link>
          <Link href="/signup" onClick={() => handleFollowUpAction("create_survey")}>
            <Button className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227] sm:w-auto">Create Your Own Survey</Button>
          </Link>
          <Link href="/questionnaire" onClick={() => handleFollowUpAction("answer_another")}>
            <Button variant="outline" className="w-full border-[#dbcdb8] bg-[#f3ecdf] sm:w-auto">
              Answer Another Survey
            </Button>
          </Link>
        </div>

        <p className={`${body.className} mt-6 text-center text-sm text-[#5c5146] text-pretty`}>
          Questions? Contact <span className="font-semibold">support@audioform.example.com</span>
        </p>
      </section>
    </main>
  )
}

function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-xl border border-[#dbcdb8] bg-[#fff6ed] p-4">
      <div className="inline-flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold text-balance">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-[#5c5146] text-pretty">{text}</p>
    </article>
  )
}
