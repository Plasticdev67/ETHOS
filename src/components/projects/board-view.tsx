import { prisma } from "@/lib/db"
import { KanbanBoard } from "@/components/board/kanban-board"

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
      workStream: true,
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

  const serialized = JSON.parse(JSON.stringify(projects))

  return (
    <div className="space-y-4">
      {/* Stats */}
      <p className="text-sm text-gray-500">
        {projects.length} active projects
      </p>

      <KanbanBoard initialProjects={serialized} />
    </div>
  )
}
