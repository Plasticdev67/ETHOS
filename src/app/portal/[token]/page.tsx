import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, getProjectStatusColor, getDepartmentColor, prettifyEnum, calculateScheduleRag, getRagColor } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function CustomerPortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const portalToken = await prisma.customerPortalToken.findUnique({
    where: { token },
    include: {
      customer: true,
      project: {
        include: {
          products: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              partCode: true,
              description: true,
              quantity: true,
              currentDepartment: true,
              requiredCompletionDate: true,
            },
          },
          coordinator: { select: { name: true } },
          projectManager: { select: { name: true } },
        },
      },
    },
  })

  if (!portalToken || !portalToken.active || new Date() > portalToken.expiresAt) {
    notFound()
  }

  // Update last used
  await prisma.customerPortalToken.update({
    where: { id: portalToken.id },
    data: { lastUsed: new Date() },
  })

  // If token is for a specific project, show that project
  // Otherwise show all projects for the customer
  let projects
  if (portalToken.project) {
    projects = [portalToken.project]
  } else {
    projects = await prisma.project.findMany({
      where: { customerId: portalToken.customerId },
      include: {
        products: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            partCode: true,
            description: true,
            quantity: true,
            currentDepartment: true,
            requiredCompletionDate: true,
          },
        },
        coordinator: { select: { name: true } },
        projectManager: { select: { name: true } },
      },
      orderBy: { projectNumber: "asc" },
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-bold text-blue-700">
              MM
            </div>
            <div>
              <h1 className="text-xl font-semibold">MM Engineered Solutions</h1>
              <p className="text-sm text-blue-200">Customer Project Portal</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Welcome, {portalToken.customer.name}</h2>
          <p className="text-sm text-gray-500">
            Below is a read-only view of your project{projects.length > 1 ? "s" : ""} with MME.
          </p>
        </div>

        {projects.map((project) => {
          const rag = calculateScheduleRag(project.targetCompletion)
          return (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      <span className="font-mono text-sm text-blue-600 mr-2">{project.projectNumber}</span>
                      {project.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={getProjectStatusColor(project.projectStatus)}>
                        {prettifyEnum(project.projectStatus)}
                      </Badge>
                      <div className={`h-3 w-3 rounded-full ${getRagColor(rag)}`} title={`Schedule: ${rag}`} />
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {project.projectManager && <div>PM: {project.projectManager.name}</div>}
                    {project.coordinator && <div>Coordinator: {project.coordinator.name}</div>}
                    {project.targetCompletion && (
                      <div>Target: {formatDate(project.targetCompletion)}</div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {project.products.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-t border-border bg-gray-50">
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Part</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                          <th className="px-4 py-2 text-center text-xs font-medium uppercase text-gray-500">Qty</th>
                          <th className="px-4 py-2 text-center text-xs font-medium uppercase text-gray-500">Stage</th>
                          <th className="px-4 py-2 text-center text-xs font-medium uppercase text-gray-500">Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {project.products.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono text-xs">{product.partCode}</td>
                            <td className="px-4 py-2 text-sm">{product.description}</td>
                            <td className="px-4 py-2 text-center text-xs">{product.quantity}</td>
                            <td className="px-4 py-2 text-center">
                              <Badge variant="secondary" className={`${getDepartmentColor(product.currentDepartment)} text-[10px]`}>
                                {prettifyEnum(product.currentDepartment)}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-center text-xs text-gray-500">
                              {product.requiredCompletionDate ? formatDate(product.requiredCompletionDate) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">No products tracked yet.</div>
                )}

                {/* Progress summary */}
                <div className="border-t border-border px-4 py-3 bg-gray-50">
                  <div className="flex flex-wrap gap-3">
                    {["PLANNING", "DESIGN", "PRODUCTION", "INSTALLATION", "REVIEW", "COMPLETE"].map((dept) => {
                      const count = project.products.filter((p) => p.currentDepartment === dept).length
                      if (count === 0) return null
                      return (
                        <div key={dept} className="flex items-center gap-1.5">
                          <Badge variant="secondary" className={`${getDepartmentColor(dept)} text-[10px]`}>
                            {prettifyEnum(dept)}
                          </Badge>
                          <span className="text-xs font-semibold text-gray-700">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {projects.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No projects found for your account.
            </CardContent>
          </Card>
        )}

        <div className="text-center text-xs text-gray-400 py-4">
          MM Engineered Solutions Ltd — Precision Steel Fabrication & Installation
          <br />
          This portal link expires on {portalToken.expiresAt.toLocaleDateString("en-GB")}
        </div>
      </div>
    </div>
  )
}
