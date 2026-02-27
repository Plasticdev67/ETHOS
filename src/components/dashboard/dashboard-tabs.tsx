"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "Overview", href: "/" },
  { label: "Projects", href: "/projects" },
]

export function DashboardTabs() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1 border-b border-border -mt-2 mb-4">
      {tabs.map((tab) => {
        const isActive = tab.href === "/"
          ? pathname === "/"
          : pathname === tab.href

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              isActive
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
