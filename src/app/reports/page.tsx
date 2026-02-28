import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, prettifyEnum, getProjectStatusColor, getSalesStageColor } from "@/lib/utils"
import Link from "next/link"

export const dynamic = 'force-dynamic'
export const revalidate = 120

async function getReportData() {
  const [
    projects,
    quotes,
    products,
    ncrs,
    recentQuotes,
  ] = await Promise.all([
    prisma.project.findMany({
      select: {
        id: true,
        projectNumber: true,
        name: true,
        projectStatus: true,
        salesStage: true,
        workStream: true,
        classification: true,
        estimatedValue: true,
        contractValue: true,
        currentCost: true,
        ncrCost: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.quote.findMany({
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        totalCost: true,
        totalSell: true,
        overallMargin: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.product.groupBy({
      by: ["currentDepartment"],
      _count: { id: true },
    }),
    prisma.nonConformanceReport.findMany({
      select: {
        severity: true,
        status: true,
        costImpact: true,
      },
    }),
    prisma.quote.findMany({
      take: 20,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        totalSell: true,
        overallMargin: true,
        customer: { select: { name: true } },
      },
    }),
  ])

  return { projects, quotes, products, ncrs, recentQuotes }
}

export default async function ReportsPage() {
  const { projects, quotes, products, ncrs, recentQuotes } = await getReportData()

  // Pipeline by sales stage
  const pipelineByStage: Record<string, { count: number; value: number }> = {}
  for (const p of projects) {
    const stage = p.salesStage
    if (!pipelineByStage[stage]) pipelineByStage[stage] = { count: 0, value: 0 }
    pipelineByStage[stage].count++
    pipelineByStage[stage].value += Number(p.contractValue || p.estimatedValue || 0)
  }

  // Pipeline by work stream
  const pipelineByWorkStream: Record<string, { count: number; value: number }> = {}
  for (const p of projects) {
    const ws = p.workStream
    if (!pipelineByWorkStream[ws]) pipelineByWorkStream[ws] = { count: 0, value: 0 }
    pipelineByWorkStream[ws].count++
    pipelineByWorkStream[ws].value += Number(p.contractValue || p.estimatedValue || 0)
  }

  // Project profitability (where we have both contract value and current cost)
  const profitableProjects = projects
    .filter((p) => Number(p.contractValue) > 0 && Number(p.currentCost) > 0)
    .map((p) => {
      const contract = Number(p.contractValue)
      const cost = Number(p.currentCost)
      const ncr = Number(p.ncrCost) || 0
      const totalCost = cost + ncr
      const profit = contract - totalCost
      const margin = contract > 0 ? ((profit / contract) * 100) : 0
      return { ...p, contract, cost: totalCost, profit, margin }
    })
    .sort((a, b) => a.margin - b.margin)

  // Quote conversion stats
  const quoteStats = {
    total: quotes.length,
    draft: quotes.filter((q) => q.status === "DRAFT").length,
    submitted: quotes.filter((q) => q.status === "SUBMITTED").length,
    accepted: quotes.filter((q) => q.status === "ACCEPTED").length,
    declined: quotes.filter((q) => q.status === "DECLINED").length,
    revised: quotes.filter((q) => q.status === "REVISED").length,
  }
  const conversionRate = quoteStats.total > 0
    ? ((quoteStats.accepted / (quoteStats.accepted + quoteStats.declined)) * 100) || 0
    : 0

  // Quote margin analysis
  const quotesWithMargin = quotes
    .filter((q) => Number(q.totalSell) > 0)
    .map((q) => ({
      ...q,
      margin: Number(q.overallMargin) || 0,
      sell: Number(q.totalSell) || 0,
      cost: Number(q.totalCost) || 0,
    }))
  const avgMargin = quotesWithMargin.length > 0
    ? quotesWithMargin.reduce((sum, q) => sum + q.margin, 0) / quotesWithMargin.length
    : 0
  const totalQuoteValue = quotesWithMargin.reduce((sum, q) => sum + q.sell, 0)

  // NCR analysis
  const ncrStats = {
    total: ncrs.length,
    open: ncrs.filter((n) => n.status === "OPEN" || n.status === "INVESTIGATING").length,
    minor: ncrs.filter((n) => n.severity === "MINOR").length,
    major: ncrs.filter((n) => n.severity === "MAJOR").length,
    critical: ncrs.filter((n) => n.severity === "CRITICAL").length,
    totalCost: ncrs.reduce((sum, n) => sum + (Number(n.costImpact) || 0), 0),
  }

  // Total pipeline value
  const totalPipeline = projects.reduce((sum, p) => sum + Number(p.contractValue || p.estimatedValue || 0), 0)
  const orderValue = projects.filter(p => p.salesStage === "ORDER").reduce((sum, p) => sum + Number(p.contractValue || p.estimatedValue || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Pipeline analysis, margins, and project financials</p>
      </div>

      {/* Top-level KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-500 uppercase">Total Pipeline</div>
            <div className="text-xl font-mono font-semibold text-gray-900">{formatCurrency(totalPipeline)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-500 uppercase">Confirmed Orders</div>
            <div className="text-xl font-mono font-semibold text-green-700">{formatCurrency(orderValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-500 uppercase">Quote Conversion</div>
            <div className="text-xl font-mono font-semibold text-blue-700">{conversionRate.toFixed(0)}%</div>
            <div className="text-[10px] text-gray-400">{quoteStats.accepted} won / {quoteStats.accepted + quoteStats.declined} decided</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-500 uppercase">Avg Quote Margin</div>
            <div className={`text-xl font-mono font-semibold ${avgMargin >= 25 ? "text-green-700" : avgMargin >= 0 ? "text-amber-600" : "text-red-600"}`}>
              {avgMargin.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline by Sales Stage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pipeline by Sales Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(pipelineByStage).map(([stage, data]) => {
                const pct = totalPipeline > 0 ? (data.value / totalPipeline) * 100 : 0
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={getSalesStageColor(stage)}>
                          {prettifyEnum(stage)}
                        </Badge>
                        <span className="text-xs text-gray-400">{data.count} projects</span>
                      </div>
                      <span className="font-mono text-sm font-medium text-gray-900">{formatCurrency(data.value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className={`h-2 rounded-full ${stage === "ORDER" ? "bg-green-500" : stage === "QUOTED" ? "bg-amber-400" : "bg-blue-400"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pipeline by Work Stream */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pipeline by Work Stream</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(pipelineByWorkStream)
                .sort((a, b) => b[1].value - a[1].value)
                .map(([ws, data]) => (
                  <div key={ws} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">{prettifyEnum(ws)}</span>
                      <span className="text-xs text-gray-400">({data.count})</span>
                    </div>
                    <span className="font-mono text-sm font-medium text-gray-900">{formatCurrency(data.value)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Quote Funnel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quote Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: "Draft", count: quoteStats.draft, color: "bg-gray-300", textColor: "text-gray-700" },
                { label: "Submitted", count: quoteStats.submitted, color: "bg-blue-400", textColor: "text-blue-700" },
                { label: "Accepted", count: quoteStats.accepted, color: "bg-green-500", textColor: "text-green-700" },
                { label: "Declined", count: quoteStats.declined, color: "bg-red-400", textColor: "text-red-700" },
                { label: "Revised", count: quoteStats.revised, color: "bg-amber-400", textColor: "text-amber-700" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-700 w-24">{item.label}</span>
                  <div className="flex-1 h-6 bg-gray-50 rounded relative">
                    <div
                      className={`h-6 rounded ${item.color} opacity-20`}
                      style={{ width: `${quoteStats.total > 0 ? (item.count / quoteStats.total) * 100 : 0}%` }}
                    />
                    <span className={`absolute inset-0 flex items-center px-2 text-xs font-semibold ${item.textColor}`}>
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <div className="text-xs text-gray-500">Total Quote Value (all time)</div>
              <div className="text-lg font-mono font-semibold text-gray-900">{formatCurrency(totalQuoteValue)}</div>
            </div>
          </CardContent>
        </Card>

        {/* NCR Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">NCR Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-500">Total NCRs</div>
                <div className="text-2xl font-semibold text-gray-900">{ncrStats.total}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Open</div>
                <div className={`text-2xl font-semibold ${ncrStats.open > 0 ? "text-red-600" : "text-gray-900"}`}>{ncrStats.open}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Total Cost Impact</div>
                <div className={`text-lg font-mono font-semibold ${ncrStats.totalCost > 0 ? "text-red-600" : "text-gray-900"}`}>
                  {formatCurrency(ncrStats.totalCost)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="text-xs text-gray-500">Minor: {ncrStats.minor}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                <span className="text-xs text-gray-500">Major: {ncrStats.major}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-600" />
                <span className="text-xs text-gray-500">Critical: {ncrStats.critical}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Profitability Table */}
      {profitableProjects.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Project Profitability</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Contract</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Cost (inc NCR)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Profit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profitableProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <Link href={`/projects/${p.id}`} className="font-mono text-xs font-medium text-blue-600 hover:text-blue-700">
                          {p.projectNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-gray-900">{p.name}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{p.customer?.name || "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className={`${getProjectStatusColor(p.projectStatus)} text-[10px]`}>
                          {prettifyEnum(p.projectStatus)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm">{formatCurrency(p.contract)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm">{formatCurrency(p.cost)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono text-sm font-medium ${p.profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {formatCurrency(p.profit)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono text-sm font-semibold ${p.margin >= 25 ? "text-green-700" : p.margin >= 0 ? "text-amber-600" : "text-red-600"}`}>
                        {p.margin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Quotes with Margins */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Quotes — Margin Analysis</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Quote</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Sell Value</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentQuotes.map((q) => {
                  const margin = Number(q.overallMargin) || 0
                  return (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <Link href={`/quotes/${q.id}`} className="font-mono text-xs font-medium text-blue-600 hover:text-blue-700">
                          {q.quoteNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{q.customer.name}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className={`text-[10px] ${
                          q.status === "ACCEPTED" ? "bg-green-100 text-green-700" :
                          q.status === "DECLINED" ? "bg-red-100 text-red-700" :
                          q.status === "SUBMITTED" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {prettifyEnum(q.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm">
                        {q.totalSell ? formatCurrency(Number(q.totalSell)) : "—"}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono text-sm font-medium ${margin >= 25 ? "text-green-700" : margin >= 0 ? "text-amber-600" : "text-red-600"}`}>
                        {margin ? `${margin.toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
