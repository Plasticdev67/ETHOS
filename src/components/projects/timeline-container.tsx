"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { TimelineChart } from "./timeline-chart"
import { DepartmentalChart } from "./departmental-chart"
import type { TimelineProjectData } from "./timeline-view"

export function TimelineContainer({ projects }: { projects: TimelineProjectData[] }) {
  const [mode, setMode] = useState<"project" | "department">("project")

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">
            {projects.length} active projects on timeline
          </p>
          {/* Sub-toggle */}
          <div className="flex items-center rounded-lg border border-border bg-gray-50 p-0.5">
            <button
              onClick={() => setMode("project")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                mode === "project"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              By Project
            </button>
            <button
              onClick={() => setMode("department")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                mode === "department"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              By Department
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-6 h-3 rounded-sm bg-indigo-400" /> Design</span>
          <span className="flex items-center gap-1.5"><span className="w-6 h-3 rounded-sm bg-orange-400" /> Production</span>
          {mode === "department" && (
            <span className="flex items-center gap-1.5"><span className="w-6 h-3 rounded-sm bg-emerald-400" /> Installation</span>
          )}
          {mode === "project" && (
            <span className="flex items-center gap-1.5"><span className="w-6 h-3 rounded-sm bg-gray-200 border border-gray-300" /> Overall</span>
          )}
          <span className="flex items-center gap-1.5"><span className="w-px h-4 bg-red-500" /> Today</span>
        </div>
      </div>

      {mode === "project" ? (
        <TimelineChart projects={projects} />
      ) : (
        <DepartmentalChart projects={projects} />
      )}
    </div>
  )
}
