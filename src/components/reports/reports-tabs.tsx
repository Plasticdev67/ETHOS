"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { BarChart3, Users, Clock, TrendingUp } from "lucide-react"

const tabs = [
  { id: "workstream", label: "Workstream", icon: BarChart3 },
  { id: "people", label: "People", icon: Users },
  { id: "timing", label: "Timing & Delivery", icon: Clock },
  { id: "pipeline", label: "Pipeline & Financials", icon: TrendingUp },
]

export function ReportsTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab") || "workstream"

  function switchTab(tabId: string) {
    const params = new URLSearchParams()
    if (tabId !== "workstream") {
      params.set("tab", tabId)
    }
    const qs = params.toString()
    router.push(`/reports${qs ? `?${qs}` : ""}`)
  }

  return (
    <div className="flex items-center gap-0.5 border-b border-border">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              isActive
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
