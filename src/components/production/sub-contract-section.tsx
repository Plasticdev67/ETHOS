"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { ProductionProject } from "./production-dashboard"

export function SubContractSection({
  projects,
}: {
  projects: ProductionProject[]
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        Sub-Contract Projects
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
          {projects.length}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex-shrink-0 w-[240px] rounded-md border border-gray-200 bg-white p-3"
              >
                <div className="text-xs font-bold text-gray-800">
                  {project.projectNumber}
                </div>
                <div className="text-xs text-gray-600 mt-0.5 truncate">
                  {project.name}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  {project.customer?.name || "—"}
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className="text-gray-500">
                    {project.contractValue
                      ? formatCurrency(Number(project.contractValue))
                      : "—"}
                  </span>
                  {project.targetCompletion && (
                    <span className="text-gray-500">
                      Due: {formatDate(project.targetCompletion)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
