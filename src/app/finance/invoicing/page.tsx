import { prisma } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ArrowLeft, PoundSterling } from "lucide-react"
import { CreateInvoiceDialog } from "@/components/finance/create-invoice-dialog"

export const dynamic = 'force-dynamic'

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

function getInvoiceTypeLabel(type: string) {
  const labels: Record<string, string> = {
    APPLICATION: "Application",
    INTERIM_INVOICE: "Interim",
    FINAL_ACCOUNT: "Final Account",
    RETENTION_RELEASE: "Retention Release",
    VARIATION: "Variation",
  }
  return labels[type] || type
}

async function getData() {
  const [invoices, projects] = await Promise.all([
    prisma.salesInvoice.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: { id: true, projectNumber: true, name: true, customer: { select: { name: true } } },
        },
      },
    }),
    prisma.project.findMany({
      where: { salesStage: "ORDER", projectStatus: { not: "COMPLETE" } },
      orderBy: { projectNumber: "asc" },
      select: { id: true, projectNumber: true, name: true },
    }),
  ])
  return { invoices, projects }
}

export default async function InvoicingPage() {
  const { invoices, projects } = await getData()

  const totalApplied = invoices.reduce((sum, inv) => sum + (Number(inv.applicationAmount) || 0), 0)
  const totalCertified = invoices.reduce((sum, inv) => sum + (Number(inv.certifiedAmount) || 0), 0)
  const totalPaid = invoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0)
  const overdueCount = invoices.filter((inv) => inv.status === "OVERDUE").length
  const outstandingCount = invoices.filter((inv) => ["SUBMITTED", "CERTIFIED", "OVERDUE"].includes(inv.status)).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/finance" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Finance
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Invoicing</h1>
          <p className="text-sm text-gray-500">Applications for payment, certificates, and payment tracking</p>
        </div>
        <CreateInvoiceDialog projects={projects} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Total Invoices</p><p className="text-xl font-bold">{invoices.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Applied</p><p className="text-xl font-bold font-mono">{formatCurrency(totalApplied)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Certified</p><p className="text-xl font-bold font-mono text-green-700">{formatCurrency(totalCertified)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Paid</p><p className="text-xl font-bold font-mono text-emerald-700">{formatCurrency(totalPaid)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-gray-500">Outstanding</p><p className={`text-xl font-bold ${outstandingCount > 0 ? "text-amber-700" : "text-gray-700"}`}>{outstandingCount}{overdueCount > 0 && <span className="text-red-600 text-xs ml-1">({overdueCount} overdue)</span>}</p></CardContent></Card>
      </div>

      {/* Invoice Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Period</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Applied</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Certified</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Retention</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">CIS</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Net Payable</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Paid</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className={`hover:bg-gray-50 ${inv.status === "OVERDUE" ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-600">{inv.invoiceNumber}</td>
                    <td className="px-4 py-2.5">
                      {inv.project ? (
                        <>
                          <Link href={`/projects/${inv.project.id}`} className="text-blue-600 hover:text-blue-700 font-mono text-xs">
                            {inv.project.projectNumber}
                          </Link>
                          <div className="text-xs text-gray-500 truncate max-w-[120px]">{inv.project.name}</div>
                        </>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{inv.project?.customer?.name || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{getInvoiceTypeLabel(inv.type)}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="secondary" className={getInvoiceStatusColor(inv.status)}>{inv.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {inv.periodFrom && inv.periodTo
                        ? `${formatDate(inv.periodFrom)} – ${formatDate(inv.periodTo)}`
                        : inv.dateSubmitted ? formatDate(inv.dateSubmitted) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{inv.applicationAmount ? formatCurrency(Number(inv.applicationAmount)) : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-green-700">{inv.certifiedAmount ? formatCurrency(Number(inv.certifiedAmount)) : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-amber-700">{inv.retentionHeld ? formatCurrency(Number(inv.retentionHeld)) : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-red-600">{inv.cisDeduction ? formatCurrency(Number(inv.cisDeduction)) : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">{inv.netPayable ? formatCurrency(Number(inv.netPayable)) : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-emerald-700">{inv.paidAmount ? formatCurrency(Number(inv.paidAmount)) : "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{inv.dateDue ? formatDate(inv.dateDue) : "—"}</td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center">
                      <PoundSterling className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">No invoices yet. Create your first application for payment.</p>
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
