"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, FileQuestion, Settings, HelpCircle, Mail, Mic } from "lucide-react"


export function AdminSidebar() {
  const pathname = usePathname()

  const routes = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/admin/dashboard/v4",
      active: pathname === "/admin/dashboard" || pathname.startsWith("/admin/dashboard/v4"),
    },
    {
      label: "Questionnaires",
      icon: FileQuestion,
      href: "/admin/questionnaires",
      active: pathname.startsWith("/admin/questionnaires"),
    },
    {
      label: "Moderation Queue",
      icon: Mic,
      href: "/admin/responses",
      active: pathname === "/admin/responses",
    },
    {
      label: "Email Notifications",
      icon: Mail,
      href: "/admin/notifications",
      active: pathname === "/admin/notifications",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/admin/settings",
      active: pathname === "/admin/settings",
    },
  ]

  return (
    <div className={`flex h-dvh w-64 flex-col border-r border-[#dbcdb8] bg-[#f9f4ea]`}>
      <div className="border-b border-[#dbcdb8] p-4">
        <Link href="/admin/dashboard/v4" className="flex items-center gap-2">
          <Mic className="h-6 w-6 text-[#b85e2d]" />
          <span className="font-bold text-xl">AudioForm</span>
        </Link>
      </div>

      <div className={`font-body flex-1 space-y-1 overflow-y-auto px-2 py-4`}>
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              route.active
                ? "bg-[#b85e2d] text-[#fff6ed]"
                : "text-[#5c5146] hover:bg-[#efe4d3] hover:text-[#1f1b17]",
            )}
          >
            <route.icon className={cn("h-5 w-5", route.active ? "text-[#fff6ed]" : "text-[#5c5146]")} />
            {route.label}
          </Link>
        ))}
      </div>

      <div className="mt-auto border-t border-[#dbcdb8] p-4">
        <Link
          href="/admin/help"
          className={`font-body flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[#5c5146] transition-colors hover:bg-[#efe4d3] hover:text-[#1f1b17]`}
        >
          <HelpCircle className="h-5 w-5 text-[#5c5146]" />
          Help & Support
        </Link>
      </div>
    </div>
  )
}

