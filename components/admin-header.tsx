"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, Settings, HelpCircle, LogOut } from "lucide-react"
import { PrivySignOutButton } from "@/components/privy-sign-out-button"


interface AdminHeaderProps {
  title: string
}

export function AdminHeader({ title }: AdminHeaderProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [unreadNotifications] = useState(3)
  const hasPrivy = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID)

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <header className={`flex h-16 items-center justify-between border-b border-[#dbcdb8] bg-[#f9f4ea] px-6`}>
      <h1 className="text-xl font-semibold">{title}</h1>

      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="relative border-[#dbcdb8] bg-[#f3ecdf]"
          aria-label="Notifications"
          onClick={() => router.push("/admin/notifications")}
        >
          <Bell className="h-5 w-5" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
              {unreadNotifications}
            </span>
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="border-[#dbcdb8] bg-[#f3ecdf]"
          aria-label="Settings"
          onClick={() => router.push("/admin/settings")}
        >
          <Settings className="h-5 w-5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="border-[#dbcdb8] bg-[#f3ecdf]"
          aria-label="Help"
          onClick={() => router.push("/admin/help")}
        >
          <HelpCircle className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full" aria-label="Open account menu">
              <Avatar>
                <AvatarImage src="/placeholder.svg" alt={user?.name || ""} />
                <AvatarFallback>{user?.name ? getInitials(user.name) : "U"}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {hasPrivy ? (
              <PrivySignOutButton redirectTo="/">
                {({ onClick }) => (
                  <DropdownMenuItem onClick={onClick}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                )}
              </PrivySignOutButton>
            ) : (
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

