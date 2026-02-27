import { prisma } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  getProjectStatusColor,
  prettifyEnum,
  formatDate,
  formatCurrency,
} from "@/lib/utils"

async function getProjectsByCustomer() {
  return prisma.project.findMany({
    where: { projectStatus: { notIn: ["COMPLETE"] } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      projectNumber: true,
      name: true,
      projectStatus: true,
      salesStage: true,
      priority: true,
      estimatedValue: true,
      targetCompletion: true,
      enquiryReceived: true,
      customer: { select: { id: true, name: true } },
      coordinator: { select: { name: true } },
      projectManager: { select: { name: true } },
      _count: { select: { products: true } },
    },
  })
}

export async function ByCustomerView() {
  const projects = await getProjectsByCustomer()

  // Group by customer
  const grouped = new Map<
    string,
    { name: string; customerId: string | null; projects: typeof projects }
  >()
  const NO_CUSTOMER = "__none__"

  for (const project of projects) {
    const key = project.customer?.id || NO_CUSTOMER
    if (!grouped.has(key)) {
      grouped.set(key, {
        name: project.customer?.name || "No Customer",
        customerId: project.customer?.id || null,
        projects: [],
      })
    }
    grouped.get(key)!.projects.push(project)
  }

  // Sort groups: "No Customer" first, then alphabetical
  const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
    if (a[0] === NO_CUSTOMER) return -1
    if (b[0] === NO_CUSTOMER) return 1
    return a[1].name.localeCompare(b[1].name)
  })

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {projects.length} active projects across {grouped.size} customers
      </p>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {sortedGroups.map(([key, group]) => (
          <div
            key={key}
            className="flex flex-col rounded-lg border border-border border-t-4 border-t-blue-400 min-w-[300px] max-w-[340px] shrink-0 bg-gray-50/50"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <div className="min-w-0">
                {group.customerId ? (
                  <Link
                    href={`/customers/${group.customerId}`}
                    className="text-sm font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors"
                  >
                    {group.name}
                  </Link>
                ) : (
                  <h3 className="text-sm font-semibold text-gray-400 truncate">{group.name}</h3>
                )}
              </div>
              <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-gray-200 px-1.5 text-[10px] font-semibold text-gray-600 shrink-0 ml-2">
                {group.projects.length}
              </span>
            </div>

            {/* Project Cards */}
            <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[80px]">
              {group.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block rounded-lg border border-border bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-blue-600">
                        {project.projectNumber}
                      </div>
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {project.name}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={getProjectStatusColor(project.projectStatus) + " text-[10px] shrink-0"}
                    >
                      {prettifyEnum(project.projectStatus)}
                    </Badge>
                  </div>

                  {/* Date range */}
                  {(project.enquiryReceived || project.targetCompletion) && (
                    <div className="text-[10px] text-gray-400 mb-1.5">
                      {formatDate(project.enquiryReceived)}
                      {project.enquiryReceived && project.targetCompletion && " → "}
                      {formatDate(project.targetCompletion)}
                    </div>
                  )}

                  {/* Footer: value + team */}
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    {project.estimatedValue ? (
                      <span className="font-mono font-medium">
                        {formatCurrency(Number(project.estimatedValue))}
                      </span>
                    ) : (
                      <span>—</span>
                    )}
                    <span className="truncate ml-2">
                      {[project.coordinator?.name, project.projectManager?.name]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </span>
                  </div>
                </Link>
              ))}
              {group.projects.length === 0 && (
                <div className="py-6 text-center text-xs text-gray-400">No projects</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
