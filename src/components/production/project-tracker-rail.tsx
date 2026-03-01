"use client"

import { Siren, Flame, AlertTriangle } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { WorkshopProject } from "./workshop-view"

export function ProjectTrackerRail({
  projects,
}: {
  projects: WorkshopProject[]
  activeStage: string
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-500">
          No projects at this stage
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-0.5 flex-1 bg-gray-300" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Upper Rail: Project Trackers
        </span>
        <div className="h-0.5 flex-1 bg-gray-300" />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {projects.map((project) => (
          <ProjectTrackerCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}

function ProjectTrackerCard({ project }: { project: WorkshopProject }) {
  const ragColor =
    project.ragStatus === "GREEN"
      ? "border-l-green-500"
      : project.ragStatus === "AMBER"
        ? "border-l-amber-500"
        : project.ragStatus === "RED"
          ? "border-l-red-500"
          : "border-l-gray-300"

  return (
    <div
      className={`flex-shrink-0 w-[200px] rounded-lg border border-gray-200 bg-white p-3 border-l-4 ${ragColor}`}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <PriorityIcon priority={project.priority} isICU={project.isICUFlag} />
        <span className="text-xs font-bold text-gray-800 truncate">
          {project.projectNumber}
        </span>
      </div>

      {/* Name */}
      <div className="text-xs text-gray-600 mt-0.5 truncate">{project.name}</div>

      {/* Client */}
      <div className="text-[10px] text-gray-500 mt-1">
        {project.customer?.name || "—"}
      </div>

      {/* PM */}
      <div className="text-[10px] text-gray-500">
        PM: {project.projectManager?.name || "—"}
      </div>

      {/* Deadline */}
      {project.targetCompletion && (
        <div className="text-[10px] text-gray-500 mt-1">
          DDL: {formatDate(project.targetCompletion)}
        </div>
      )}

      {/* Product count */}
      <div className="mt-2 text-[10px] font-medium text-gray-600">
        Products at stage: {project.productCount}
      </div>
    </div>
  )
}

function PriorityIcon({
  priority,
  isICU,
}: {
  priority: string
  isICU: boolean
}) {
  if (isICU)
    return <Siren className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
  if (priority === "CRITICAL")
    return <Flame className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
  if (priority === "HIGH")
    return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
  return null
}
