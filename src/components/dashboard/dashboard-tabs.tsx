"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Target,
  PenTool,
  Factory,
  HardHat,
} from "lucide-react"

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, href: "/" },
  { id: "sales", label: "Sales", icon: Target, href: "/?tab=sales" },
  { id: "design", label: "Design", icon: PenTool, href: "/?tab=design" },
  { id: "production", label: "Production", icon: Factory, href: "/?tab=production" },
  { id: "installation", label: "Installation", icon: HardHat, href: "/?tab=installation" },
]

export function DashboardTabs({ activeTab = "overview" }: { activeTab?: string }) {
  return (
    <div className="flex items-center gap-1 border-b border-border -mt-2 mb-4">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab

        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              isActive
                ? "border-[#e95445] text-[#e95445]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <tab.icon className={cn("h-4 w-4", isActive ? "text-[#e95445]" : "text-gray-400")} />
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
