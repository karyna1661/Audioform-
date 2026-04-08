"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Headphones, Mic, Share2 } from "lucide-react"

const items = [
  { href: "/admin/questionnaires/v1", label: "Studio", icon: Mic },
  { href: "/admin/dashboard/v4", label: "Listen", icon: Headphones },
  { href: "/admin/share", label: "Share", icon: Share2 },
]

export function AdminMobileNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="fixed inset-x-6 bottom-2 z-30 rounded-[1.15rem] border border-[#dbcdb8]/55 bg-[#fff8f0]/90 p-1 shadow-[0_12px_26px_rgba(78,53,20,0.10)] backdrop-blur-xl [padding-bottom:calc(env(safe-area-inset-bottom)+0.2rem)] max-[360px]:inset-x-4 max-[360px]:bottom-1 sm:hidden"
    >
      <div className="grid grid-cols-3 gap-1 max-[360px]:gap-0.5">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href === "/admin/dashboard/v4" && pathname === "/admin/dashboard")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-9 flex-col items-center justify-center rounded-[0.8rem] py-1 text-[9px] font-medium leading-none transition-colors ${
                isActive
                  ? "border border-[#c78e6e]/55 bg-[#f2ddcd] text-[#8a431f]"
                  : "border border-transparent bg-transparent text-[#5c5146]"
              }`}
            >
              <Icon className="mb-0.5 size-3" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

