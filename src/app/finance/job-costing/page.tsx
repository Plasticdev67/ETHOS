import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"

export const dynamic = 'force-dynamic'
export const revalidate = 60

async function getCVRData() {
  const projects = await prisma.project.findMany({
    where: { salesStage: "ORDER" },
    include: {
      customer: { select: { name: true } },
      purchaseOrders: {
        include: {
          poLines: {
            include: { nominalCode: { select: { code: true, category: true } } },
          },
        },
      },
      plantHires: {
        include: { nominalCode: { select: { code: true, category: true } } },
      },
      subContracts: {
        include: { nominalCode: { select: { code: true, category: true } } },
      },
      costCategories: {
        include: { nominalCode: { select: { code: true, category: true } } },
      },
      salesInvoices: true,
      retentions: true,
    },
    orderBy: { projectNumber: "asc" },
  })

  return projects
}

export default async function JobCostingPage() {
  const projects = await getCVRData()

  // Build CVR rows
  const cvrRows = projects.map((p) => {
    const contractValue = Number(p.contractValue) || Number(p.estimatedValue) || 0

    // Committed = PO values + plant hire + sub-contract agreed values
    const poCommitted = p.purchaseOrders.reduce((sum, po) => sum + (Number(po.totalValue) || 0), 0)
    const plantCommitted = p.plantHires.reduce((sum, ph) => sum + (Number(ph.totalCost) || 0), 0)
    const subCommitted = p.subContracts.reduce((sum, sc) => sum + (Number(sc.agreedValue) || 0), 0)
    const totalCommitted = poCommitted + plantCommitted + subCommitted

    // Actual = what's been invoiced/received from suppliers
    const subActual = p.subContracts.reduce((sum, sc) => sum + (Number(sc.invoicedToDate) || 0), 0)
    const budgetFromCostCats = p.costCategories.reduce((sum, cc) => sum + (Number(cc.budgetAmount) || 0), 0)
    const actualFromCostCats = p.costCategories.reduce((sum, cc) => sum + (Number(cc.actualAmount) || 0), 0)
    const totalActual = actualFromCostCats > 0 ? actualFromCostCats : (Number(p.currentCost) || subActual)

    // Sales side
    const totalInvoiced = p.salesInvoices.reduce((sum, inv) => sum + (Number(inv.applicationAmount) || 0), 0)
    const totalCertified = p.salesInvoices.reduce((sum, inv) => sum + (Number(inv.certifiedAmount) || 0), 0)
    const totalPaid = p.salesInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0)
    const totalRetention = p.retentions.reduce((sum, r) => sum + (Number(r.retentionAmount) || 0), 0)

    // Forecast
    const forecastFinalCost = Math.max(totalCommitted, totalActual)
    const forecastMargin = contractValue > 0 ? ((contractValue - forecastFinalCost) / contractValue) * 100 : 0
    const variance = contractValue - forecastFinalCost

    // Cost breakdown by category
    const costByCategory: Record<string, { committed: number; actual: number }> = {}
    p.purchaseOrders.forEach((po) => {
      po.poLines.forEach((line) => {
        const cat = line.nominalCode?.category || "MATERIALS"
        if (!costByCategory[cat]) costByCategory[cat] = { committed: 0, actual: 0 }
        costByCategory[cat].committed += Number(line.totalCost) || 0
        if (line.received) costByCategory[cat].actual += Number(line.totalCost) || 0
      })
    })
    p.plantHires.forEach((ph) => {
      const cat = ph.nominalCode?.category || "PLANT_HIRE"
      if (!costByCategory[cat]) costByCategory[cat] = { committed: 0, actual: 0 }
      costByCategory[cat].committed += Number(ph.totalCost) || 0
    })
    p.subContracts.forEach((sc) => {
      const cat = sc.nominalCode?.category || "SUB_CONTRACT"
      if (!costByCategory[cat]) costByCategory[cat] = { committed: 0, actual: 0 }
      costByCategory[cat].committed += Number(sc.agreedValue) || 0
      costByCategory[cat].actual += Number(sc.invoicedToDate) || 0
    })

    return {
      id: p.id,
      projectNumber: p.projectNumber,
      name: p.name,
      customer: p.customer?.name || "—",
      contractValue,
      budget: budgetFromCostCats > 0 ? budgetFromCostCats : contractValue,
      totalCommitted,
      totalActual,
      forecastFinalCost,
      forecastMargin,
      variance,
      totalInvoiced,
      totalCertified,
      totalPaid,
      totalRetention,
      costByCategory,
      poCommitted,
      plantCommitted,
      subCommitted,
    }
  })

  // Totals
  const totals = cvrRows.reduce(
    (acc, r) => ({
      contractValue: acc.contractValue + r.contractValue,
      committed: acc.committed + r.totalCommitted,
      actual: acc.actual + r.totalActual,
      forecast: acc.forecast + r.forecastFinalCost,
      invoiced: acc.invoiced + r.totalInvoiced,
      paid: acc.paid + r.totalPaid,
      retention: acc.retention + r.totalRetention,
      variance: acc.variance + r.variance,
    }),
    { contractValue: 0, committed: 0, actual: 0, forecast: 0, invoiced: 0, paid: 0, retention: 0, variance: 0 }
  )
  const totalMargin = totals.contractValue > 0 ? ((totals.contractValue - totals.forecast) / totals.contractValue) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Finance
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Job Costing — CVR</h1>
        <p className="text-sm text-gray-500">Cost Value Reconciliation across all on-order projects</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Contract Value</p><p className="text-base font-bold font-mono">{formatCurrency(totals.contractValue)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Committed</p><p className="text-base font-bold font-mono text-amber-700">{formatCurrency(totals.committed)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Forecast Final</p><p className="text-base font-bold font-mono">{formatCurrency(totals.forecast)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Variance</p><p className={`text-base font-bold font-mono ${totals.variance >= 0 ? "text-green-700" : "text-red-600"}`}>{formatCurrency(totals.variance)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Margin</p><p className={`text-base font-bold font-mono ${totalMargin >= 20 ? "text-green-700" : totalMargin >= 0 ? "text-amber-700" : "text-red-600"}`}>{totalMargin.toFixed(1)}%</p></CardContent></Card>
      </div>

      {/* CVR Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost Value Reconciliation</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-border bg-gray-50/50">
                  <th className="px-3 py-2.5 text-left text-xs font-medium uppercase text-gray-500 sticky left-0 bg-gray-50/50">Project</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">Contract Value</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">PO Costs</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">Plant</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">Sub-Con</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500 bg-amber-50">Total Committed</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">Forecast Final</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500 bg-blue-50">Variance</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">Margin %</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">Invoiced</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cvrRows.map((row) => (
                  <tr key={row.id} className={`hover:bg-gray-50 ${row.variance < 0 ? "bg-red-50/30" : ""}`}>
                    <td className="px-3 py-2 sticky left-0 bg-white">
                      <Link href={`/projects/${row.id}`} className="text-blue-600 hover:text-blue-700 font-mono text-xs font-semibold">{row.projectNumber}</Link>
                      <div className="text-xs text-gray-500 truncate max-w-[150px]">{row.name}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{row.customer}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{formatCurrency(row.contractValue)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{formatCurrency(row.poCommitted)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{formatCurrency(row.plantCommitted)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{formatCurrency(row.subCommitted)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs font-semibold bg-amber-50/50">{formatCurrency(row.totalCommitted)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{formatCurrency(row.forecastFinalCost)}</td>
                    <td className={`px-3 py-2 text-right font-mono text-xs font-semibold bg-blue-50/50 ${row.variance >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {formatCurrency(row.variance)}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono text-xs font-semibold ${
                      row.forecastMargin >= 25 ? "text-green-700" : row.forecastMargin >= 0 ? "text-amber-700" : "text-red-600"
                    }`}>
                      {row.contractValue > 0 ? `${row.forecastMargin.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{formatCurrency(row.totalInvoiced)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-green-700">{formatCurrency(row.totalPaid)}</td>
                  </tr>
                ))}
                {cvrRows.length === 0 && (
                  <tr><td colSpan={12} className="px-3 py-8 text-center text-gray-500">No on-order projects to show.</td></tr>
                )}
              </tbody>
              {cvrRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                    <td className="px-3 py-2.5 sticky left-0 bg-gray-50 text-xs uppercase text-gray-700" colSpan={2}>Totals</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{formatCurrency(totals.contractValue)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs" colSpan={3}></td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs bg-amber-50/50">{formatCurrency(totals.committed)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{formatCurrency(totals.forecast)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono text-xs bg-blue-50/50 ${totals.variance >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {formatCurrency(totals.variance)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono text-xs ${totalMargin >= 20 ? "text-green-700" : totalMargin >= 0 ? "text-amber-700" : "text-red-600"}`}>
                      {totalMargin.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{formatCurrency(totals.invoiced)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-green-700">{formatCurrency(totals.paid)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
