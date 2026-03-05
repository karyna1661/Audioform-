import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AdminMobileNav } from "@/components/admin-mobile-nav"
import { ArrowLeft, LifeBuoy } from "lucide-react"


export default function AdminHelpPage() {
  return (
    <main className={`min-h-dvh bg-[#f3ecdf] p-4 pb-28 sm:p-6 sm:pb-6`}>
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-[#dbcdb8] bg-[#f9f4ea] p-6">
        <p className={`font-body text-sm text-[#5c5146]`}>Admin</p>
        <h1 className="mt-1 text-3xl font-semibold text-balance">Help Center</h1>
        <div className="mt-4 rounded-xl border border-[#dbcdb8] bg-[#fff6ed] p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <LifeBuoy className="size-4 text-[#8a431f]" aria-hidden="true" />
            Help resources placeholder
          </p>
          <p className={`font-body mt-2 text-sm text-[#5c5146]`}>For support, use the notification or contact channels configured in your workspace.</p>
        </div>
        <Link href="/admin/dashboard/v4" className="mt-6 inline-block">
          <Button variant="outline" className="border-[#dbcdb8] bg-[#f3ecdf]">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back to dashboard
          </Button>
        </Link>
      </section>
      <AdminMobileNav />
    </main>
  )
}

