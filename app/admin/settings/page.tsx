import Link from "next/link"
import { Bricolage_Grotesque, Lora } from "next/font/google"
import { Button } from "@/components/ui/button"
import { ArrowLeft, SlidersHorizontal } from "lucide-react"

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "700"] })
const body = Lora({ subsets: ["latin"], weight: ["400", "500", "600"] })

export default function AdminSettingsPage() {
  return (
    <main className={`${display.className} min-h-dvh bg-[#f3ecdf] p-4 sm:p-6`}>
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-[#dbcdb8] bg-[#f9f4ea] p-6">
        <p className={`${body.className} text-sm text-[#5c5146]`}>Admin</p>
        <h1 className="mt-1 text-3xl font-semibold text-balance">Settings</h1>
        <div className="mt-4 rounded-xl border border-[#dbcdb8] bg-[#fff6ed] p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-[#8a431f]" aria-hidden="true" />
            Workspace settings placeholder
          </p>
        </div>
        <Link href="/admin/dashboard/v4" className="mt-6 inline-block">
          <Button variant="outline" className="border-[#dbcdb8] bg-[#f3ecdf]">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back to dashboard
          </Button>
        </Link>
      </section>
    </main>
  )
}
