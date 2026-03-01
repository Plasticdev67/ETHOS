import { prisma } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { formatCurrency, formatDate, prettifyEnum } from "@/lib/utils"
import { NewQuoteDialog } from "@/components/quotes/new-quote-dialog"

export const revalidate = 60

function getQuoteStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    SUBMITTED: "bg-blue-100 text-blue-800",
    ACCEPTED: "bg-green-100 text-green-800",
    DECLINED: "bg-red-100 text-red-800",
    REVISED: "bg-amber-100 text-amber-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

async function getQuotes() {
  return prisma.quote.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { id: true, name: true } },
      project: {
        select: { id: true, projectNumber: true, name: true },
      },
      createdBy: { select: { name: true } },
      _count: { select: { quoteLines: true } },
    },
  })
}

async function getCustomers() {
  return prisma.customer.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
}

async function getProjects() {
  return prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, projectNumber: true, name: true, customerId: true },
  })
}

export default async function QuotesPage() {
  const [quotes, customers, projects] = await Promise.all([
    getQuotes(),
    getCustomers(),
    getProjects(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Quotes</h1>
          <p className="text-sm text-gray-500">{quotes.length} quotes</p>
        </div>
        <NewQuoteDialog customers={customers} projects={projects} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Quote No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Lines</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Cost</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Sell</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Margin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/quotes/${quote.id}`} className="font-mono text-sm font-medium text-blue-600 hover:text-blue-700">
                        {quote.quoteNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-900">
                      {quote.customer?.name || "—"}
                    </td>
                    <td className="px-6 py-3 text-gray-600 max-w-[200px] truncate">
                      {quote.subject || "—"}
                    </td>
                    <td className="px-6 py-3">
                      {quote.project ? (
                        <Link href={`/projects/${quote.project.id}`} className="text-gray-500 hover:text-blue-600">
                          <span className="font-mono text-xs">{quote.project.projectNumber}</span>{" "}
                          <span className="text-gray-400">{quote.project.name}</span>
                        </Link>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary" className={getQuoteStatusColor(quote.status)}>
                        {prettifyEnum(quote.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-center font-mono text-gray-600">{quote._count.quoteLines}</td>
                    <td className="px-6 py-3 text-right font-mono text-gray-600">{quote.totalCost ? formatCurrency(Number(quote.totalCost)) : "—"}</td>
                    <td className="px-6 py-3 text-right font-mono font-medium text-gray-900">{quote.totalSell ? formatCurrency(Number(quote.totalSell)) : "—"}</td>
                    <td className="px-6 py-3 text-right font-mono text-gray-600">
                      {quote.overallMargin ? `${Number(quote.overallMargin).toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">{formatDate(quote.dateCreated)}</td>
                  </tr>
                ))}
                {quotes.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                      No quotes yet. Create your first quote to get started.
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
