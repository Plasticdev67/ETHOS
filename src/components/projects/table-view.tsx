import { prisma } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  getProjectStatusColor,
  getSalesStageColor,
  prettifyEnum,
  calculateScheduleRag,
  getRagColor,
} from "@/lib/utils"
import { ProjectFilters } from "@/components/projects/project-filters"

async function getProjects(searchParams: Record<string, string | undefined>) {
  const where: Record<string, unknown> = {
    projectStatus: { not: "OPPORTUNITY" },
  }

  if (searchParams.status && searchParams.status !== "ALL") {
    where.projectStatus = searchParams.status
  }
  if (searchParams.salesStage && searchParams.salesStage !== "ALL") {
    where.salesStage = searchParams.salesStage
  }
  if (searchParams.workStream && searchParams.workStream !== "ALL") {
    where.workStream = searchParams.workStream
  }
  if (searchParams.priority && searchParams.priority !== "ALL") {
    where.priority = searchParams.priority
  }
  if (searchParams.classification && searchParams.classification !== "ALL") {
    where.classification = searchParams.classification
  }
  if (searchParams.search) {
    where.OR = [
      { name: { contains: searchParams.search, mode: "insensitive" } },
      { projectNumber: { contains: searchParams.search, mode: "insensitive" } },
      { customer: { name: { contains: searchParams.search, mode: "insensitive" } } },
    ]
  }

  return prisma.project.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { name: true } },
      coordinator: { select: { name: true } },
      _count: { select: { products: true } },
    },
  })
}

export async function TableView({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>
}) {
  const projects = await getProjects(searchParams)

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{projects.length} projects</p>

      <ProjectFilters />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Project Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Work Stream</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Coordinator</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Products</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">RAG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((project) => {
                  const scheduleRag = calculateScheduleRag(project.targetCompletion)
                  return (
                    <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-mono text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {project.projectNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-gray-500">{project.customer?.name || "—"}</td>
                      <td className="px-6 py-3">
                        <span className="text-xs text-gray-600">{prettifyEnum(project.projectType)}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs text-gray-600">{prettifyEnum(project.workStream)}</span>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant="secondary" className={getProjectStatusColor(project.projectStatus)}>
                          {prettifyEnum(project.projectStatus)}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant="secondary" className={getSalesStageColor(project.salesStage)}>
                          {prettifyEnum(project.salesStage)}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-gray-500">{project.coordinator?.name || "—"}</td>
                      <td className="px-6 py-3 text-center font-mono text-gray-600">{project._count.products}</td>
                      <td className="px-6 py-3 text-center">
                        <div className={`mx-auto h-3 w-3 rounded-full ${getRagColor(scheduleRag)}`} />
                      </td>
                    </tr>
                  )
                })}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                      No projects found. Try adjusting your filters or{" "}
                      <Link href="/projects/new" className="text-blue-600 hover:text-blue-700">
                        create a new project
                      </Link>
                      .
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
