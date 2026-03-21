"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, ClipboardList, LayoutGrid, Mic } from "lucide-react"

const items = [
  { href: "/admin/dashboard/v4", label: "Inbox", icon: LayoutGrid },
  { href: "/admin/questionnaires/v1", label: "Create", icon: Mic },
  { href: "/admin/responses", label: "Queue", icon: ClipboardList },
  { href: "/admin/notifications", label: "Notify", icon: Bell },
]

export function AdminMobileNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="fixed inset-x-2 bottom-2 z-30 rounded-2xl border border-[#dbcdb8] bg-[#f9f4ea]/95 p-1.5 shadow-[0_12px_30px_rgba(78,53,20,0.15)] backdrop-blur [padding-bottom:calc(env(safe-area-inset-bottom)+0.4rem)] max-[360px]:inset-x-1 max-[360px]:bottom-1 sm:hidden"
    >
      <div className="grid grid-cols-4 gap-1.5 max-[360px]:gap-1">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href === "/admin/dashboard/v4" && pathname === "/admin/dashboard")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-10 flex-col items-center justify-center rounded-xl py-1.5 text-[11px] ${
                isActive
                  ? "border border-[#c78e6e] bg-[#f2ddcd] text-[#6e3316]"
                  : "border border-[#e2d4be] bg-[#fff6ed] text-[#5c5146]"
              }`}
            >
              <Icon className="mb-0.5 size-3.5" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

