import { prisma } from "@/lib/db"
import { KanbanBoard } from "@/components/board/kanban-board"
import { Badge } from "@/components/ui/badge"
import { Siren, Flame, AlertTriangle } from "lucide-react"

async function getBoardProjects() {
  return prisma.project.findMany({
    where: {
      projectStatus: { notIn: ["COMPLETE"] },
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      projectNumber: true,
      name: true,
      projectStatus: true,
      priority: true,
      isICUFlag: true,
      classification: true,
      ragStatus: true,
      estimatedValue: true,
      contractValue: true,
      targetCompletion: true,
      customer: { select: { name: true } },
      projectManager: { select: { name: true } },
      installManager: { select: { name: true } },
      coordinator: { select: { name: true } },
      products: {
        select: {
          id: true,
          description: true,
          partCode: true,
          productJobNumber: true,
          quantity: true,
          productionStatus: true,
        },
        orderBy: { createdAt: "asc" },
        take: 4,
      },
      designCards: {
        select: { id: true, status: true },
      },
      _count: { select: { products: true, designCards: true } },
    },
  })
}

export async function BoardView() {
  const projects = await getBoardProjects()

  const icuProjects = projects.filter((p) => p.isICUFlag)
  const criticalProjects = projects.filter((p) => p.priority === "CRITICAL" && !p.isICUFlag)
  const highProjects = projects.filter((p) => p.priority === "HIGH" && !p.isICUFlag)

  const megaCount = projects.filter((p) => p.classification === "MEGA").length
  const subCount = projects.filter((p) => p.classification === "SUB_CONTRACT").length

  const serialized = JSON.parse(JSON.stringify(projects))

  return (
    <div className="space-y-4">
      {/* Stats */}
      <p className="text-sm text-gray-500">
        {projects.length} active projects
        {megaCount > 0 && (
          <>
            {" — "}
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-[10px]">
              {megaCount} Mega
            </Badge>
          </>
        )}
        {subCount > 0 && (
          <>
            {" — "}
            <Badge variant="secondary" className="bg-teal-100 text-teal-700 text-[10px]">
              {subCount} Sub-contract
            </Badge>
          </>
        )}
      </p>

      {/* ICU / Priority banner */}
      {(icuProjects.length > 0 || criticalProjects.length > 0 || highProjects.length > 0) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
          <div className="text-xs font-semibold uppercase text-red-700 mb-1">Priority Alerts</div>
          {icuProjects.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <Siren className="h-4 w-4 text-red-600" />
              <span className="font-mono text-xs font-semibold">{p.projectNumber}</span>
              <span className="text-red-800">{p.name}</span>
              <span className="text-red-500 text-xs">— ICU</span>
            </div>
          ))}
          {criticalProjects.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <Flame className="h-4 w-4 text-red-500" />
              <span className="font-mono text-xs font-semibold">{p.projectNumber}</span>
              <span className="text-red-800">{p.name}</span>
              <span className="text-red-500 text-xs">— Critical</span>
            </div>
          ))}
          {highProjects.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="font-mono text-xs font-semibold">{p.projectNumber}</span>
              <span className="text-amber-800">{p.name}</span>
              <span className="text-amber-500 text-xs">— High Priority</span>
            </div>
          ))}
        </div>
      )}

      <KanbanBoard initialProjects={serialized} />
    </div>
  )
}
