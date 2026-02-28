"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, prettifyEnum, getProjectStatusColor, getSalesStageColor } from "@/lib/utils"
import Link from "next/link"

type PipelineData = {
  totalPipeline: number
  orderValue: number
  conversionRate: number
  avgMargin: number
  quoteStats: { total: number; accepted: number; declined: number; draft: number; submitted: number; revised: number }
  totalQuoteValue: number
  pipelineByStage: Record<string, { count: number; value: number }>
  pipelineByWorkStream: Record<string, { count: number; value: number }>
  ncrStats: { total: number; open: number; minor: number; major: number; critical: number; totalCost: number }
  profitableProjects: {
    id: string
    projectNumber: string
    name: string
    projectStatus: string
    customer: string
    contract: number
    cost: number
    profit: number
    margin: number
  }[]
  recentQuotes: {
    id: string
    quoteNumber: string
    status: string
    customer: string
    sell: number
    margin: number
  }[]
}

export function PipelineFinancials({ data }: { data: PipelineData }) {
  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-500 uppercase">Total Pipeline</div>
            <div className="text-xl font-mono font-semibold text-gray-900">{formatCurrency(data.totalPipeline)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-500 uppercase">Confirmed Orders</div>
            <div className="text-xl font-mono font-semibold text-green-700">{formatCurrency(data.orderValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-500 uppercase">Quote Conversion</div>
            <div className="text-xl font-mono font-semibold text-blue-700">{data.conversionRate.toFixed(0)}%</div>
            <div className="text-[10px] text-gray-400">{data.quoteStats.accepted} won / {data.quoteStats.accepted + data.quoteStats.declined} decided</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-500 uppercase">Avg Quote Margin</div>
            <div className={`text-xl font-mono font-semibold ${data.avgMargin >= 25 ? "text-green-700" : data.avgMargin >= 0 ? "text-amber-600" : "text-red-600"}`}>
              {data.avgMargin.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline by Sales Stage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pipeline by Sales Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.pipelineByStage).map(([stage, d]) => {
                const pct = data.totalPipeline > 0 ? (d.value / data.totalPipeline) * 100 : 0
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={getSalesStageColor(stage)}>
                          {prettifyEnum(stage)}
                        </Badge>
                        <span className="text-xs text-gray-400">{d.count} projects</span>
                      </div>
                      <span className="font-mono text-sm font-medium text-gray-900">{formatCurrency(d.value)}</span>
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
              {Object.entries(data.pipelineByWorkStream)
                .sort((a, b) => b[1].value - a[1].value)
                .map(([ws, d]) => (
                  <div key={ws} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">{prettifyEnum(ws)}</span>
                      <span className="text-xs text-gray-400">({d.count})</span>
                    </div>
                    <span className="font-mono text-sm font-medium text-gray-900">{formatCurrency(d.value)}</span>
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
                { label: "Draft", count: data.quoteStats.draft, color: "bg-gray-300", textColor: "text-gray-700" },
                { label: "Submitted", count: data.quoteStats.submitted, color: "bg-blue-400", textColor: "text-blue-700" },
                { label: "Accepted", count: data.quoteStats.accepted, color: "bg-green-500", textColor: "text-green-700" },
                { label: "Declined", count: data.quoteStats.declined, color: "bg-red-400", textColor: "text-red-700" },
                { label: "Revised", count: data.quoteStats.revised, color: "bg-amber-400", textColor: "text-amber-700" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-700 w-24">{item.label}</span>
                  <div className="flex-1 h-6 bg-gray-50 rounded relative">
                    <div
                      className={`h-6 rounded ${item.color} opacity-20`}
                      style={{ width: `${data.quoteStats.total > 0 ? (item.count / data.quoteStats.total) * 100 : 0}%` }}
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
              <div className="text-lg font-mono font-semibold text-gray-900">{formatCurrency(data.totalQuoteValue)}</div>
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
                <div className="text-2xl font-semibold text-gray-900">{data.ncrStats.total}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Open</div>
                <div className={`text-2xl font-semibold ${data.ncrStats.open > 0 ? "text-red-600" : "text-gray-900"}`}>{data.ncrStats.open}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Total Cost Impact</div>
                <div className={`text-lg font-mono font-semibold ${data.ncrStats.totalCost > 0 ? "text-red-600" : "text-gray-900"}`}>
                  {formatCurrency(data.ncrStats.totalCost)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="text-xs text-gray-500">Minor: {data.ncrStats.minor}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                <span className="text-xs text-gray-500">Major: {data.ncrStats.major}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-600" />
                <span className="text-xs text-gray-500">Critical: {data.ncrStats.critical}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Profitability Table */}
      {data.profitableProjects.length > 0 && (
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
                  {data.profitableProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <Link href={`/projects/${p.id}`} className="font-mono text-xs font-medium text-blue-600 hover:text-blue-700">
                          {p.projectNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-gray-900">{p.name}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{p.customer}</td>
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

      {/* Recent Quotes */}
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
                {data.recentQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/quotes/${q.id}`} className="font-mono text-xs font-medium text-blue-600 hover:text-blue-700">
                        {q.quoteNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{q.customer}</td>
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
                    <td className="px-4 py-2.5 text-right font-mono text-sm">{formatCurrency(q.sell)}</td>
                    <td className={`px-4 py-2.5 text-right font-mono text-sm font-medium ${q.margin >= 25 ? "text-green-700" : q.margin >= 0 ? "text-amber-600" : "text-red-600"}`}>
                      {q.margin ? `${q.margin.toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
