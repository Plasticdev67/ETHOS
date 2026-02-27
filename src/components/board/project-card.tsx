"use client"

import { memo } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { AlertTriangle, Flame, Package, Siren } from "lucide-react"

type BoardProduct = {
  id: string
  description: string
  partCode: string
  productJobNumber: string | null
  quantity: number
}

type BoardProject = {
  id: string
  projectNumber: string
  name: string
  projectStatus: string
  customer: { name: string } | null
  priority: string
  isICUFlag: boolean
  classification: string
  ragStatus: string | null
  estimatedValue: string | number | null
  contractValue: string | number | null
  targetCompletion: string | null
  projectManager: { name: string } | null
  installManager: { name: string } | null
  coordinator: { name: string } | null
  products: BoardProduct[]
  _count: { products: number }
}

const stageColors: Record<string, string> = {
  OPPORTUNITY: "bg-gray-100 text-gray-600",
  QUOTATION: "bg-blue-100 text-blue-700",
  DESIGN: "bg-indigo-100 text-indigo-700",
  DESIGN_FREEZE: "bg-rose-100 text-rose-700",
  MANUFACTURE: "bg-amber-100 text-amber-700",
  INSTALLATION: "bg-green-100 text-green-700",
  REVIEW: "bg-purple-100 text-purple-700",
  COMPLETE: "bg-emerald-100 text-emerald-700",
}

const stageLabels: Record<string, string> = {
  OPPORTUNITY: "Opportunity",
  QUOTATION: "Quotation",
  DESIGN: "Design",
  DESIGN_FREEZE: "Design Freeze",
  MANUFACTURE: "Production",
  INSTALLATION: "Installation",
  REVIEW: "Review",
  COMPLETE: "Complete",
}

function getRagColor(rag: string | null) {
  if (!rag) return ""
  const map: Record<string, string> = {
    GREEN: "bg-green-500",
    AMBER: "bg-amber-500",
    RED: "bg-red-500",
  }
  return map[rag] || ""
}

function getPriorityIcon(priority: string, isICU: boolean) {
  if (isICU) return <Siren className="h-3.5 w-3.5 text-red-600" />
  if (priority === "CRITICAL") return <Flame className="h-3.5 w-3.5 text-red-500" />
  if (priority === "HIGH") return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
  return null
}

function getClassBadge(classification: string) {
  if (classification === "MEGA") return <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">Mega</Badge>
  if (classification === "SUB_CONTRACT") return <Badge variant="secondary" className="bg-teal-100 text-teal-700 text-[10px] px-1.5 py-0">Sub</Badge>
  return null
}

export const ProjectCard = memo(function ProjectCard({ project }: { project: BoardProject }) {
  const value = project.contractValue || project.estimatedValue
  const priorityIcon = getPriorityIcon(project.priority, project.isICUFlag)
  const classBadge = getClassBadge(project.classification)
  const stageColor = stageColors[project.projectStatus] || "bg-gray-100 text-gray-600"
  const stageLabel = stageLabels[project.projectStatus] || project.projectStatus

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="rounded-lg border border-border bg-white p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer space-y-2">
        {/* Top row: project number + RAG + priority */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {project.ragStatus && (
              <div className={`h-2.5 w-2.5 rounded-full ${getRagColor(project.ragStatus)}`} />
            )}
            <span className="font-mono text-xs font-semibold text-gray-900">{project.projectNumber}</span>
            {priorityIcon}
            {classBadge}
          </div>
          <span className="text-[10px] text-gray-400">{project._count.products} items</span>
        </div>

        {/* Stage badge */}
        <Badge variant="secondary" className={`${stageColor} text-[10px] px-1.5 py-0 font-medium`}>
          {stageLabel}
        </Badge>

        {/* Name */}
        <div className="text-sm font-medium text-gray-800 leading-tight line-clamp-2">
          {project.name}
        </div>

        {/* Customer */}
        {project.customer && (
          <div className="text-xs text-gray-500 truncate">{project.customer.name}</div>
        )}

        {/* Project Manager */}
        {project.projectManager && (
          <div className="text-[10px] text-indigo-500 truncate">PM: {project.projectManager.name.split(" ")[0]}</div>
        )}

        {/* Products */}
        {project.products.length > 0 && (
          <div className="space-y-0.5 pt-1 border-t border-gray-100">
            {project.products.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5">
                <Package className="h-3 w-3 text-gray-400 shrink-0" />
                <span className="text-[10px] text-gray-600 truncate flex-1">
                  {p.description}
                </span>
                <span className="text-[9px] text-gray-400 shrink-0">x{p.quantity}</span>
              </div>
            ))}
            {project._count.products > project.products.length && (
              <div className="text-[9px] text-gray-400 pl-4.5">
                +{project._count.products - project.products.length} more
              </div>
            )}
          </div>
        )}

        {/* Bottom row: value */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <span className="font-mono text-xs text-gray-600">
            {value ? formatCurrency(Number(value)) : "—"}
          </span>
        </div>

        {/* Target date */}
        {project.targetCompletion && (
          <div className="text-[10px] text-gray-400">
            Target: {new Date(project.targetCompletion).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
          </div>
        )}
      </div>
    </Link>
  )
})
