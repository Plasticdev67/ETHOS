"use client"

import { Siren, Flame, AlertTriangle } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { getCardScheduleColor, WORKSHOP_STAGES } from "@/lib/production-utils"
import type { ProductionProject } from "./production-dashboard"

export function ProductionProjectCard({
  project,
  viewMode,
  onClick,
}: {
  project: ProductionProject
  viewMode: "compact" | "full"
  onClick: () => void
}) {
  const scheduleColor = getCardScheduleColor(project.targetCompletion)
  const ncrCount = project._count?.ncrs || 0

  // Calculate stage progress
  const completedProducts = project.products.filter(
    (p) => p.productionStatus === "COMPLETED" || p.productionCompletionDate
  ).length

  if (viewMode === "compact") {
    return (
      <button
        onClick={onClick}
        className={`w-full text-left rounded-md border border-gray-200 bg-white px-2.5 py-1.5 border-l-4 ${scheduleColor} hover:shadow-sm transition-shadow`}
      >
        <div className="flex items-center gap-2">
          <PriorityIcon priority={project.priority} isICU={project.isICUFlag} />
          <span className="text-xs font-semibold text-gray-800 truncate">
            {project.projectNumber}
          </span>
          <span className="text-xs text-gray-500 truncate flex-1">
            {project.name}
          </span>
          <span className="text-[10px] text-gray-400">
            {completedProducts}/{project._count.products}
          </span>
          {project.targetCompletion && (
            <span className="text-[10px] text-gray-400">
              {formatDate(project.targetCompletion)}
            </span>
          )}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-md border border-gray-200 bg-white px-3 py-2.5 border-l-4 ${scheduleColor} hover:shadow-md transition-shadow`}
    >
      {/* Header row */}
      <div className="flex items-center gap-1.5">
        <PriorityIcon priority={project.priority} isICU={project.isICUFlag} />
        <span className="text-xs font-bold text-gray-800">
          {project.projectNumber}
        </span>
        <RagDot ragStatus={project.ragStatus} />
        {ncrCount > 0 && (
          <span className="ml-auto rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
            NCR: {ncrCount}
          </span>
        )}
      </div>

      {/* Project name */}
      <div className="mt-1 text-xs font-medium text-gray-700 truncate">
        {project.name}
      </div>

      {/* Client */}
      <div className="mt-0.5 text-[10px] text-gray-500 truncate">
        {project.customer?.name || "No client"}
      </div>

      {/* PM */}
      <div className="mt-1 text-[10px] text-gray-500">
        PM: {project.projectManager?.name || "Unassigned"}
      </div>

      {/* Products progress */}
      <div className="mt-2">
        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
          <span>
            Products: {completedProducts}/{project._count.products}
          </span>
          <StageProgressDots products={project.products} />
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{
              width: `${project._count.products > 0 ? (completedProducts / project._count.products) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Footer row */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] font-medium text-gray-600">
          {project.contractValue ? formatCurrency(Number(project.contractValue)) : "—"}
        </span>
        {project.targetCompletion && (
          <span className="text-[10px] text-gray-500">
            Due: {formatDate(project.targetCompletion)}
          </span>
        )}
      </div>

      {/* Work stream badge */}
      {project.workStream && (() => {
        const wsLabels: Record<string, string> = { UTILITIES: "Utility", BESPOKE: "Bespoke", COMMUNITY: "Community", BLAST: "Blast", REFURBISHMENT: "Refurb" }
        const wsColors: Record<string, string> = { UTILITIES: "bg-blue-100 text-blue-700", BESPOKE: "bg-purple-100 text-purple-700", COMMUNITY: "bg-green-100 text-green-700", BLAST: "bg-orange-100 text-orange-700", REFURBISHMENT: "bg-teal-100 text-teal-700" }
        const label = wsLabels[project.workStream]
        if (!label) return null
        return <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${wsColors[project.workStream] || ""}`}>{label}</span>
      })()}
    </button>
  )
}

function PriorityIcon({
  priority,
  isICU,
}: {
  priority: string
  isICU: boolean
}) {
  if (isICU) return <Siren className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
  if (priority === "CRITICAL")
    return <Flame className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
  if (priority === "HIGH")
    return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
  return null
}

function RagDot({ ragStatus }: { ragStatus: string | null }) {
  if (!ragStatus) return null
  const color =
    ragStatus === "GREEN"
      ? "bg-emerald-500"
      : ragStatus === "AMBER"
        ? "bg-amber-500"
        : "bg-red-500"
  return <span className={`ml-1 w-2 h-2 rounded-full ${color}`} />
}

function StageProgressDots({
  products,
}: {
  products: Array<{ productionStatus: string | null }>
}) {
  const stageSet = new Set(products.map((p) => p.productionStatus).filter(Boolean))
  return (
    <div className="flex gap-0.5">
      {WORKSHOP_STAGES.map((stage) => (
        <div
          key={stage}
          className={`w-1.5 h-1.5 rounded-full ${
            stageSet.has(stage) ? "bg-blue-500" : "bg-gray-200"
          }`}
          title={stage}
        />
      ))}
    </div>
  )
}
