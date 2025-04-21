"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, FileQuestion, Users, BarChart3, Settings, HelpCircle, Mail, Mic } from "lucide-react"

export function AdminSidebar() {
  const pathname = usePathname()

  const routes = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/admin/dashboard",
      active: pathname === "/admin/dashboard",
    },
    {
      label: "Questionnaires",
      icon: FileQuestion,
      href: "/admin/questionnaires",
      active: pathname === "/admin/questionnaires",
    },
    {
      label: "Responses",
      icon: Mic,
      href: "/admin/responses",
      active: pathname === "/admin/responses",
    },
    {
      label: "Participants",
      icon: Users,
      href: "/admin/participants",
      active: pathname === "/admin/participants",
    },
    {
      label: "Analytics",
      icon: BarChart3,
      href: "/admin/analytics",
      active: pathname === "/admin/analytics",
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
    <div className="w-64 border-r bg-white h-screen flex flex-col">
      <div className="p-4 border-b">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <Mic className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">AudioForm</span>
        </Link>
      </div>

      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              route.active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <route.icon className={cn("h-5 w-5", route.active ? "text-primary-foreground" : "text-muted-foreground")} />
            {route.label}
          </Link>
        ))}
      </div>

      <div className="p-4 border-t mt-auto">
        <Link
          href="/admin/help"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          Help & Support
        </Link>
      </div>
    </div>
  )
}
