import { prisma } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  formatDate,
  getDepartmentColor,
  prettifyEnum,
  calculateScheduleRag,
  getRagColor,
} from "@/lib/utils"
import { TrackerFilters } from "@/components/tracker/tracker-filters"
import { TrackerStatusCell } from "@/components/tracker/tracker-status-cell"

async function getTrackerData(searchParams: Record<string, string | undefined>) {
  const where: Record<string, unknown> = {
    project: { projectStatus: { not: "OPPORTUNITY" } },
  }

  if (searchParams.department && searchParams.department !== "ALL") {
    where.currentDepartment = searchParams.department
  }
  if (searchParams.productionStage && searchParams.productionStage !== "ALL") {
    where.productionStatus = searchParams.productionStage
  }
  if (searchParams.search) {
    where.OR = [
      { description: { contains: searchParams.search, mode: "insensitive" } },
      { partCode: { contains: searchParams.search, mode: "insensitive" } },
      { additionalDetails: { contains: searchParams.search, mode: "insensitive" } },
      { productJobNumber: { contains: searchParams.search, mode: "insensitive" } },
      { project: { name: { contains: searchParams.search, mode: "insensitive" } } },
      { project: { projectNumber: { contains: searchParams.search, mode: "insensitive" } } },
    ]
  }
  if (searchParams.designer && searchParams.designer !== "ALL") {
    where.allocatedDesignerId = searchParams.designer
  }
  if (searchParams.coordinator && searchParams.coordinator !== "ALL") {
    where.coordinatorId = searchParams.coordinator
  }

  const [products, users, departmentCounts] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [
        { currentDepartment: "asc" },
        { requiredCompletionDate: "asc" },
      ],
      take: 200,
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
            customer: { select: { name: true } },
          },
        },
        designer: { select: { id: true, name: true } },
        coordinator: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.groupBy({
      by: ["currentDepartment"],
      _count: { id: true },
    }),
  ])

  return { products, users, departmentCounts }
}

export async function TrackerView({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>
}) {
  const { products, users, departmentCounts } = await getTrackerData(searchParams)

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {products.length >= 200 ? "Showing first 200 products" : `${products.length} products`} across all projects
        {products.length >= 200 && " — use filters to narrow results"}
      </p>

      {/* Department summary pills */}
      <div className="flex flex-wrap gap-2">
        {departmentCounts.map((dc) => (
          <div
            key={dc.currentDepartment}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5"
          >
            <Badge variant="secondary" className={getDepartmentColor(dc.currentDepartment)}>
              {prettifyEnum(dc.currentDepartment)}
            </Badge>
            <span className="text-sm font-semibold text-gray-700">{dc._count.id}</span>
          </div>
        ))}
      </div>

      <TrackerFilters users={users} />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="sticky left-0 bg-gray-50/95 px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Project
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">Job No.</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">Part</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">Details</th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase text-gray-500">Qty</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">Department</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">Production</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">Designer</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">Coordinator</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">Design Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">Install Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">Due</th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase text-gray-500">RAG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => {
                  const scheduleRag = calculateScheduleRag(product.requiredCompletionDate)
                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="sticky left-0 bg-white px-3 py-2.5">
                        <Link
                          href={`/projects/${product.project.id}`}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <span className="font-mono text-xs font-medium">
                            {product.project.projectNumber}
                          </span>
                          <span className="ml-1.5 text-xs text-gray-500">{product.project.name}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                        {product.productJobNumber || "—"}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs font-medium text-gray-700">
                        {product.partCode}
                      </td>
                      <td className="px-3 py-2.5 text-gray-900">{product.description}</td>
                      <td className="px-3 py-2.5 text-gray-500 max-w-[180px] truncate text-xs">
                        {product.additionalDetails || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono">{product.quantity}</td>
                      <td className="px-3 py-2.5">
                        <TrackerStatusCell
                          productId={product.id}
                          type="department"
                          currentValue={product.currentDepartment}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        {product.productionStatus ? (
                          <TrackerStatusCell
                            productId={product.id}
                            type="production"
                            currentValue={product.productionStatus}
                          />
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{product.designer?.name || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">
                        {product.coordinator?.name || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{product.designStatus || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{product.installStatus || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">
                        {formatDate(product.requiredCompletionDate)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className={`mx-auto h-3 w-3 rounded-full ${getRagColor(scheduleRag)}`} />
                      </td>
                    </tr>
                  )
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={14} className="px-6 py-12 text-center text-gray-500">
                      No products found. Adjust your filters or add products to projects.
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
