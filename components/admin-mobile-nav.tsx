"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, ClipboardList, LayoutGrid, Mic, QrCode } from "lucide-react"

const items = [
  { href: "/admin/dashboard/v4", label: "Listen", icon: LayoutGrid },
  { href: "/admin/questionnaires/v1", label: "Studio", icon: Mic },
  { href: "/admin/responses", label: "Release", icon: ClipboardList },
  { href: "/admin/share", label: "Share", icon: QrCode },
  { href: "/admin/notifications", label: "Alerts", icon: Bell },
]

export function AdminMobileNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="fixed inset-x-2 bottom-2 z-30 rounded-[1.35rem] border border-[#dbcdb8] bg-[#fff8f0]/96 p-1.5 shadow-[0_14px_34px_rgba(78,53,20,0.15)] backdrop-blur [padding-bottom:calc(env(safe-area-inset-bottom)+0.45rem)] max-[360px]:inset-x-1 max-[360px]:bottom-1 sm:hidden"
    >
      <div className="grid grid-cols-5 gap-1.5 max-[360px]:gap-1">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href === "/admin/dashboard/v4" && pathname === "/admin/dashboard")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-11 flex-col items-center justify-center rounded-[0.95rem] py-1.5 text-[11px] font-medium ${
                isActive
                  ? "border border-[#c78e6e] bg-[#f2ddcd] text-[#6e3316]"
                  : "border border-transparent bg-transparent text-[#5c5146]"
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

