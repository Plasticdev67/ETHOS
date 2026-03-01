import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"
import { PoundSterling, TrendingUp, TrendingDown, AlertTriangle, Clock, FileText } from "lucide-react"

export const revalidate = 60

async function getFinanceData() {
  const [projects, invoices, nominalCodes] = await Promise.all([
    prisma.project.findMany({
      where: { salesStage: "ORDER" },
      select: {
        id: true, projectNumber: true, name: true, contractValue: true, estimatedValue: true, currentCost: true,
        customer: { select: { name: true } },
        purchaseOrders: { select: { totalValue: true } },
        plantHires: { select: { totalCost: true } },
        subContracts: { select: { agreedValue: true, invoicedToDate: true } },
        salesInvoices: { select: { applicationAmount: true, paidAmount: true } },
        retentions: { select: { retentionAmount: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.salesInvoice.findMany({
      where: { status: { in: ["SUBMITTED", "OVERDUE", "CERTIFIED"] } },
      include: { project: { select: { projectNumber: true, name: true, customer: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.nominalCode.findMany({
      where: { active: true },
      select: { id: true, code: true, description: true, category: true },
      orderBy: { code: "asc" },
    }),
  ])

  return { projects, invoices, nominalCodes }
}

function getInvoiceStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SUBMITTED: "bg-blue-100 text-blue-700",
    CERTIFIED: "bg-green-100 text-green-700",
    OVERDUE: "bg-red-100 text-red-700",
    PAID: "bg-emerald-100 text-emerald-700",
    DISPUTED: "bg-amber-100 text-amber-700",
  }
  return colors[status] || "bg-gray-100 text-gray-700"
}

export default async function FinanceDashboard() {
  const { projects, invoices, nominalCodes } = await getFinanceData()

  // Calculate company-wide KPIs
  let totalContractValue = 0
  let totalCostCommitted = 0
  let totalInvoiced = 0
  let totalPaid = 0
  let totalRetentionHeld = 0
  let projectsOverBudget = 0

  const projectSummaries = projects.map((p) => {
    const contractVal = Number(p.contractValue) || Number(p.estimatedValue) || 0

    // PO costs = committed
    const poCommitted = p.purchaseOrders.reduce((sum, po) => sum + (Number(po.totalValue) || 0), 0)
    const plantCost = p.plantHires.reduce((sum, ph) => sum + (Number(ph.totalCost) || 0), 0)
    const subCommitted = p.subContracts.reduce((sum, sc) => sum + (Number(sc.agreedValue) || 0), 0)
    const subActual = p.subContracts.reduce((sum, sc) => sum + (Number(sc.invoicedToDate) || 0), 0)

    const totalCommitted = poCommitted + plantCost + subCommitted
    const totalActual = Number(p.currentCost) || subActual + plantCost

    // Invoicing
    const invoiced = p.salesInvoices.reduce((sum, inv) => sum + (Number(inv.applicationAmount) || 0), 0)
    const paid = p.salesInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0)
    const retention = p.retentions.reduce((sum, r) => sum + (Number(r.retentionAmount) || 0), 0)

    const margin = contractVal > 0 ? ((contractVal - totalCommitted) / contractVal) * 100 : 0
    const isOverBudget = totalCommitted > contractVal && contractVal > 0

    totalContractValue += contractVal
    totalCostCommitted += totalCommitted
    totalInvoiced += invoiced
    totalPaid += paid
    totalRetentionHeld += retention
    if (isOverBudget) projectsOverBudget++

    return {
      id: p.id,
      projectNumber: p.projectNumber,
      name: p.name,
      customer: p.customer?.name || "—",
      contractValue: contractVal,
      committed: totalCommitted,
      actual: totalActual,
      invoiced,
      paid,
      retention,
      margin,
      isOverBudget,
    }
  })

  const totalMargin = totalContractValue > 0 ? ((totalContractValue - totalCostCommitted) / totalContractValue) * 100 : 0
  const outstandingDebtors = totalInvoiced - totalPaid

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500">Company-wide financial overview across all on-order projects</p>
        </div>
        <div className="flex gap-2">
          <Link href="/finance/nominal-codes">
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-50 px-3 py-1.5">
              Nominal Codes ({nominalCodes.length})
            </Badge>
          </Link>
          <Link href="/finance/exports">
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-50 px-3 py-1.5">
              Sage Export
            </Badge>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2"><PoundSterling className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Total Contract Value</p>
                <p className="text-lg font-bold font-mono">{formatCurrency(totalContractValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2"><TrendingDown className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Total Committed</p>
                <p className="text-lg font-bold font-mono">{formatCurrency(totalCostCommitted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${totalMargin >= 20 ? "bg-green-50" : totalMargin >= 0 ? "bg-amber-50" : "bg-red-50"}`}>
                <TrendingUp className={`h-5 w-5 ${totalMargin >= 20 ? "text-green-600" : totalMargin >= 0 ? "text-amber-600" : "text-red-600"}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Overall Margin</p>
                <p className={`text-lg font-bold font-mono ${totalMargin >= 20 ? "text-green-700" : totalMargin >= 0 ? "text-amber-700" : "text-red-600"}`}>
                  {totalMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2"><Clock className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Outstanding Debtors</p>
                <p className="text-lg font-bold font-mono">{formatCurrency(outstandingDebtors)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">On-Order Projects</p><p className="text-xl font-bold">{projects.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Total Invoiced</p><p className="text-xl font-bold font-mono">{formatCurrency(totalInvoiced)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Total Paid</p><p className="text-xl font-bold font-mono text-green-700">{formatCurrency(totalPaid)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Retention Held</p><p className="text-xl font-bold font-mono text-amber-700">{formatCurrency(totalRetentionHeld)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Nominal Codes</p><p className="text-xl font-bold">{nominalCodes.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-gray-500">Over Budget</p>
          <p className={`text-xl font-bold ${projectsOverBudget > 0 ? "text-red-600" : "text-green-700"}`}>{projectsOverBudget}</p>
        </CardContent></Card>
      </div>

      {/* Over-budget alert */}
      {projectsOverBudget > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span className="text-sm text-red-700 font-medium">
            {projectsOverBudget} project{projectsOverBudget > 1 ? "s" : ""} over budget — committed costs exceed contract value
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Project Financial Summary */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Project Financial Summary</CardTitle>
                <Link href="/finance/job-costing" className="text-xs text-blue-600 hover:text-blue-700">
                  View Full CVR →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-border bg-gray-50/50">
                      <th className="px-3 py-2.5 text-left text-xs font-medium uppercase text-gray-500">Project</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">Contract</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">Committed</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {projectSummaries.slice(0, 15).map((p) => (
                      <tr key={p.id} className={`hover:bg-gray-50 ${p.isOverBudget ? "bg-red-50/50" : ""}`}>
                        <td className="px-3 py-2">
                          <Link href={`/projects/${p.id}`} className="text-blue-600 hover:text-blue-700 font-mono text-xs font-semibold">{p.projectNumber}</Link>
                          <div className="text-xs text-gray-500 truncate max-w-[180px]">{p.name}</div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{p.customer}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{formatCurrency(p.contractValue)}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{formatCurrency(p.committed)}</td>
                        <td className={`px-3 py-2 text-right font-mono text-xs font-semibold ${
                          p.margin >= 25 ? "text-green-700" : p.margin >= 0 ? "text-amber-700" : "text-red-600"
                        }`}>
                          {p.contractValue > 0 ? `${p.margin.toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                    {projectSummaries.length === 0 && (
                      <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-500">No on-order projects.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Outstanding Invoices */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Outstanding Invoices</CardTitle>
                <Link href="/finance/invoicing" className="text-xs text-blue-600 hover:text-blue-700">
                  View All →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {invoices.map((inv) => (
                  <div key={inv.id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-semibold">{inv.invoiceNumber}</span>
                      <Badge variant="secondary" className={getInvoiceStatusColor(inv.status)}>
                        {inv.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">{inv.project?.projectNumber || "—"} — {inv.project?.customer?.name || "—"}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {inv.dateSubmitted ? formatDate(inv.dateSubmitted) : "Not submitted"}
                      </span>
                      <span className="font-mono text-sm font-medium">
                        {formatCurrency(Number(inv.applicationAmount) || 0)}
                      </span>
                    </div>
                  </div>
                ))}
                {invoices.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <FileText className="mx-auto h-6 w-6 text-gray-300 mb-1" />
                    <p className="text-sm text-gray-500">No outstanding invoices.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cost Code Summary */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Nominal Codes by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {Object.entries(
                  nominalCodes.reduce((acc, nc) => {
                    acc[nc.category] = (acc[nc.category] || 0) + 1
                    return acc
                  }, {} as Record<string, number>)
                ).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-700">{cat.replace(/_/g, " ")}</span>
                    <span className="font-mono text-sm text-gray-500">{count}</span>
                  </div>
                ))}
                {nominalCodes.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-gray-500">No nominal codes set up yet.</p>
                    <Link href="/finance/nominal-codes" className="text-xs text-blue-600 hover:text-blue-700">Set up nominal codes →</Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
