"use client"

import { ProjectCard } from "./project-card"

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
  products: { id: string; description: string; partCode: string; productJobNumber: string | null; quantity: number }[]
  _count: { products: number }
}

const columnColors: Record<string, string> = {
  OPPORTUNITY: "border-t-gray-400",
  QUOTATION: "border-t-blue-400",
  DESIGN: "border-t-indigo-400",
  DESIGN_FREEZE: "border-t-cyan-500",
  MANUFACTURE: "border-t-amber-400",
  INSTALLATION: "border-t-green-400",
  REVIEW: "border-t-purple-400",
  COMPLETE: "border-t-emerald-500",
}

const columnLabels: Record<string, string> = {
  OPPORTUNITY: "Sales / Opportunity",
  QUOTATION: "Quotation",
  DESIGN: "Design",
  DESIGN_FREEZE: "Design Freeze Window",
  MANUFACTURE: "Production",
  INSTALLATION: "Installation",
  REVIEW: "Review",
  COMPLETE: "Complete",
}

export function KanbanColumn({
  status,
  projects,
}: {
  status: string
  projects: BoardProject[]
}) {
  const color = columnColors[status] || "border-t-gray-300"
  const label = columnLabels[status] || status

  return (
    <div className={`flex flex-col rounded-lg border border-border ${color} border-t-4 bg-gray-50/50 min-w-[260px] max-w-[300px]`}>
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <h3 className="text-xs font-semibold uppercase text-gray-700">{label}</h3>
        <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-gray-200 px-1.5 text-[10px] font-semibold text-gray-600">
          {projects.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-220px)]">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        {projects.length === 0 && (
          <div className="py-8 text-center text-xs text-gray-400">
            No projects
          </div>
        )}
      </div>
    </div>
  )
}
