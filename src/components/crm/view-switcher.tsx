"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Columns3, Table2, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

const views = [
  { id: "pipeline", label: "Pipeline", icon: BarChart3 },
  { id: "board", label: "Board View by Customers", icon: Columns3 },
  { id: "table", label: "Table", icon: Table2 },
]

export function CrmViewSwitcher() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentView = searchParams.get("view") || "pipeline"

  function switchView(viewId: string) {
    const params = new URLSearchParams()
    if (viewId !== "pipeline") {
      params.set("view", viewId)
    }
    const qs = params.toString()
    router.push(`/crm${qs ? `?${qs}` : ""}`)
  }

  return (
    <div className="flex items-center gap-0.5 border-b border-border">
      {views.map((view) => {
        const isActive = currentView === view.id
        return (
          <button
            key={view.id}
            onClick={() => switchView(view.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              isActive
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <view.icon className="h-4 w-4" />
            {view.label}
          </button>
        )
      })}
    </div>
  )
}
