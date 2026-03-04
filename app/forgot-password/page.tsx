import Link from "next/link"
import { Bricolage_Grotesque, Lora } from "next/font/google"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail } from "lucide-react"

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "700"] })
const body = Lora({ subsets: ["latin"], weight: ["400", "500", "600"] })

export default function ForgotPasswordPage() {
  return (
    <main className={`${display.className} min-h-dvh bg-[#f3ecdf] p-4 sm:p-6`}>
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-[#dbcdb8] bg-[#f9f4ea] p-6 sm:p-8">
        <p className={`${body.className} text-sm text-[#5c5146]`}>Account recovery</p>
        <h1 className="mt-2 text-3xl font-semibold text-balance">Reset your password</h1>
        <p className={`${body.className} mt-3 text-[#5c5146] text-pretty`}>
          Password reset is not wired yet in this demo build. Contact support to restore access.
        </p>

        <div className="mt-6 rounded-xl border border-[#dbcdb8] bg-[#fff6ed] p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <Mail className="size-4 text-[#8a431f]" aria-hidden="true" />
            support@audioform.example.com
          </p>
        </div>

        <div className="mt-6">
          <Link href="/login">
            <Button variant="outline" className="border-[#dbcdb8] bg-[#f3ecdf]">
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              Back to login
            </Button>
          </Link>
        </div>
      </section>
    </main>
  )
}
