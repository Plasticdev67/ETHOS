"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "ATP Calculator", href: "/planning" },
  { label: "Production Grid", href: "/planning/aggregated" },
  { label: "Shop Floor", href: "/planning/shopfloor" },
]

export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => {
          const isActive = tab.href === "/planning"
            ? pathname === "/planning"
            : pathname.startsWith(tab.href)

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

      {children}
    </div>
  )
}
