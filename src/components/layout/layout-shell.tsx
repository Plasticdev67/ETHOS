"use client"

import { cn } from "@/lib/utils"
import { useLayout } from "./layout-context"
import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"
import { Header } from "./header"

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useLayout()
  const pathname = usePathname()

  // Login page and portal — no sidebar/header
  if (pathname === "/login" || pathname.startsWith("/portal")) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className={cn(
        "flex-1 min-w-0 w-full overflow-x-hidden transition-all duration-200",
        // Desktop: offset for sidebar width
        "md:pl-60",
        collapsed ? "md:pl-16" : "md:pl-60",
        // Mobile: no left padding (sidebar is overlay)
        "pl-0"
      )}>
        <Header />
        <main className="p-3 sm:p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
