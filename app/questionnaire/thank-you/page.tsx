"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react"
import { trackEvent } from "@/lib/analytics"


export default function ThankYouPage() {
  const searchParams = useSearchParams()
  const surveyId = searchParams.get("surveyId")
  const backToSurveyHref = surveyId ? `/questionnaire/v1?surveyId=${encodeURIComponent(surveyId)}` : "/questionnaire/v1"
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim()

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
    <main className={`min-h-dvh bg-[#f3ecdf] p-4 sm:p-6`}>
      <section className="mx-auto max-w-3xl rounded-[1.5rem] border border-[#dbcdb8] bg-[#f9f4ea] p-5 sm:rounded-[2rem] sm:p-8">
        <div className="text-center">
          <CheckCircle2 className="mx-auto size-16 text-[#2d5a17]" aria-hidden="true" />
          <p className={`font-body mt-3 text-sm text-[#5c5146] text-pretty`}>Response sent</p>
          <h1 className="mt-1 text-3xl font-semibold text-balance sm:text-4xl">Curious what your own users would say?</h1>
          <p className={`font-body mx-auto mt-3 max-w-2xl text-[#5c5146] text-pretty`}>
            Create your own voice survey in under a minute and collect the kind of feedback people actually explain out loud.
          </p>
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-[#dbcdb8] bg-[#fff6ed] p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-[#dbcdb8] bg-[#f3ecdf]">
              <Sparkles className="size-4 text-[#8a431f]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#261c14]">Powered by Audioform</p>
              <p className="font-body mt-2 text-sm leading-6 text-[#5c5146] text-pretty">
                Ask one sharp question, collect voice answers in under a minute, and hear what people mean instead of guessing from short text replies.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/signup" onClick={() => handleFollowUpAction("create_survey")}>
            <Button className="w-full bg-[#b85e2d] text-[#fff6ed] hover:bg-[#a05227] sm:w-auto">
              Create your own survey
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Button>
          </Link>
          <Link href={backToSurveyHref} onClick={() => handleFollowUpAction("answer_another")}>
            <Button variant="outline" className="w-full border-[#dbcdb8] bg-[#f3ecdf] sm:w-auto">
              Answer another prompt
            </Button>
          </Link>
          <Link href="/" onClick={() => handleFollowUpAction("return_home")}>
            <Button variant="outline" className="w-full border-[#dbcdb8] bg-[#f3ecdf] sm:w-auto">
              Return home
            </Button>
          </Link>
        </div>

        <p className={`font-body mt-6 text-center text-sm text-[#5c5146] text-pretty`}>
          {supportEmail ? (
            <>
              Questions? Contact{" "}
              <a className="font-semibold underline" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>
              .
            </>
          ) : (
            "Questions? Contact the creator using the same channel where you received this survey link."
          )}
        </p>
      </section>
    </main>
  )
}

