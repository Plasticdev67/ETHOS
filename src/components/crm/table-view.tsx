import { prisma } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  prettifyEnum,
  formatCurrency,
  formatDate,
  getOpportunityStatusColor,
  getLeadSourceColor,
} from "@/lib/utils"
import { CrmTableFilters } from "./table-filters"

async function getTableData(searchParams: Record<string, string | undefined>) {
  const where: Record<string, unknown> = {}

  if (searchParams.status && searchParams.status !== "ALL") {
    where.status = searchParams.status
  }
  if (searchParams.source && searchParams.source !== "ALL") {
    where.leadSource = searchParams.source
  }
  if (searchParams.search) {
    where.OR = [
      { name: { contains: searchParams.search, mode: "insensitive" } },
      { contactPerson: { contains: searchParams.search, mode: "insensitive" } },
      { prospect: { companyName: { contains: searchParams.search, mode: "insensitive" } } },
      { notes: { contains: searchParams.search, mode: "insensitive" } },
    ]
  }

  const opportunities = await prisma.opportunity.findMany({
    where,
    orderBy: [{ expectedCloseDate: "asc" }],
    include: {
      prospect: {
        select: { id: true, companyName: true },
      },
      convertedProject: {
        select: { id: true, projectNumber: true },
      },
    },
  })

  return opportunities
}

export async function CrmTableView({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>
}) {
  const opportunities = await getTableData(searchParams)

  const totalValue = opportunities.reduce(
    (sum, o) => sum + (o.estimatedValue ? parseFloat(o.estimatedValue.toString()) : 0),
    0
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {opportunities.length} opportunities
        {totalValue > 0 && <> · Total: {formatCurrency(totalValue)}</>}
      </p>

      <CrmTableFilters />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Prospect Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Opportunity Name
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                    Est. Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Contact Person
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Lead Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Expected Close
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Converted To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {opportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/crm/${opp.prospect.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {opp.prospect.companyName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">{opp.name}</div>
                      {opp.description && (
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
                          {opp.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">
                      {opp.estimatedValue
                        ? formatCurrency(parseFloat(opp.estimatedValue.toString()))
                        : "tbc"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {opp.contactPerson || "tbc"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="secondary"
                        className={
                          getLeadSourceColor(opp.leadSource) + " text-[10px] px-1.5 py-0"
                        }
                      >
                        {prettifyEnum(opp.leadSource)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {formatDate(opp.expectedCloseDate)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="secondary"
                        className={getOpportunityStatusColor(opp.status)}
                      >
                        {prettifyEnum(opp.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      {opp.convertedProject ? (
                        <Link
                          href={`/projects/${opp.convertedProject.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-mono"
                        >
                          #{opp.convertedProject.projectNumber}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[200px] truncate">
                      {opp.notes || "—"}
                    </td>
                  </tr>
                ))}
                {opportunities.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      No opportunities found. Try adjusting your filters.
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
