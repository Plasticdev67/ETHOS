"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, prettifyEnum, cn } from "@/lib/utils"
import { Factory, AlertTriangle, PoundSterling, Layers, BarChart3 } from "lucide-react"
import Link from "next/link"

type ProductionTabData = {
  inProduction: number
  bottleneckStage: string | null
  completingThisMonth: number
  estInvoiceValue: number
  productsByStage: { stage: string; count: number }[]
  completingThisMonthList: {
    projectId: string
    projectNumber: string
    productDescription: string
    targetDate: string | null
    contractValue: number
  }[]
  stageThroughput: { stage: string; avgDays: number }[]
  overdueProduction: {
    projectId: string
    projectNumber: string
    productDescription: string
    daysOverdue: number
    targetDate: string | null
  }[]
  byWorkstream: { workstream: string; count: number }[]
  openNcrs: { projectNumber: string; severity: string; count: number }[]
}

const STAGE_ORDER = [
  "AWAITING", "CUTTING", "FABRICATION", "FITTING", "SHOTBLASTING",
  "PAINTING", "PACKING", "DISPATCHED", "STORAGE", "REWORK",
  "SUB_CONTRACT", "COMPLETED", "N_A"
]

function getStageColor(stage: string) {
  const colors: Record<string, string> = {
    AWAITING: "bg-gray-400",
    CUTTING: "bg-blue-500",
    FABRICATION: "bg-indigo-500",
    FITTING: "bg-purple-500",
    SHOTBLASTING: "bg-orange-500",
    PAINTING: "bg-amber-500",
    PACKING: "bg-emerald-500",
    DISPATCHED: "bg-green-500",
    COMPLETED: "bg-green-600",
    REWORK: "bg-red-500",
    STORAGE: "bg-gray-500",
    SUB_CONTRACT: "bg-teal-500",
    N_A: "bg-gray-300",
  }
  return colors[stage] || "bg-gray-400"
}

export function TabProduction({ data }: { data: ProductionTabData }) {
  const sortedStages = [...data.productsByStage].sort(
    (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
  )

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">In Production</p>
            <p className="text-2xl font-semibold text-gray-900">{data.inProduction}</p>
            <p className="text-xs text-gray-400 mt-1">Products in production</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Bottleneck Stage</p>
            <p className="text-xl font-semibold text-orange-700">{data.bottleneckStage ? prettifyEnum(data.bottleneckStage) : "None"}</p>
            <p className="text-xs text-gray-400 mt-1">Most products</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Completing This Month</p>
            <p className="text-2xl font-semibold text-emerald-700">{data.completingThisMonth}</p>
            <p className="text-xs text-gray-400 mt-1">For invoicing</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Est. Invoice Value</p>
            <p className="text-2xl font-semibold text-green-700">{formatCurrency(data.estInvoiceValue)}</p>
            <p className="text-xs text-gray-400 mt-1">Month-end forecast</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Stage Pipeline + Completing This Month */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Products by Stage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              Products by Stage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedStages.filter((s) => s.count > 0).map((s) => {
              const max = Math.max(...sortedStages.map((x) => x.count), 1)
              const pct = (s.count / max) * 100
              return (
                <div key={s.stage}>
                  <div className="flex items-center justify-between text-sm mb-0.5">
                    <span className="font-medium text-gray-700">{prettifyEnum(s.stage)}</span>
                    <span className="font-mono text-gray-600">{s.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className={cn("h-2 rounded-full transition-all", getStageColor(s.stage))} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {sortedStages.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No products in production</p>
            )}
          </CardContent>
        </Card>

        {/* Completing This Month (for invoicing) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PoundSterling className="h-4 w-4 text-emerald-500" />
              Completing This Month (Invoicing Forecast)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Project</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Target</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.completingThisMonthList.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/projects/${item.projectId}`} className="font-mono text-xs text-blue-600 hover:text-blue-700">
                        {item.projectNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-gray-700 truncate max-w-[200px]">{item.productDescription}</td>
                    <td className="px-4 py-2 text-right text-xs text-gray-500">
                      {item.targetDate ? new Date(item.targetDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-700">{formatCurrency(item.contractValue)}</td>
                  </tr>
                ))}
                {data.completingThisMonthList.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Nothing due this month</td></tr>
                )}
              </tbody>
              {data.completingThisMonthList.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-gray-50">
                    <td colSpan={3} className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total Forecast:</td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-emerald-700">{formatCurrency(data.estInvoiceValue)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Throughput + Overdue */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Stage Throughput */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              Stage Throughput (Avg Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.stageThroughput.map((s) => {
              const max = Math.max(...data.stageThroughput.map((x) => x.avgDays), 1)
              const pct = (s.avgDays / max) * 100
              return (
                <div key={s.stage}>
                  <div className="flex items-center justify-between text-sm mb-0.5">
                    <span className="font-medium text-gray-700">{prettifyEnum(s.stage)}</span>
                    <span className="font-mono text-gray-600">{s.avgDays.toFixed(1)}d</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className={cn("h-2 rounded-full transition-all", getStageColor(s.stage))} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {data.stageThroughput.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No throughput data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Overdue Production */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Overdue Production
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Project</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.overdueProduction.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/projects/${item.projectId}`} className="font-mono text-xs text-blue-600">
                        {item.projectNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-gray-700 truncate max-w-[200px]">{item.productDescription}</td>
                    <td className="px-4 py-2 text-center">
                      <Badge variant="secondary" className="bg-red-100 text-red-700 text-[10px]">{item.daysOverdue}d</Badge>
                    </td>
                  </tr>
                ))}
                {data.overdueProduction.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-green-600">No overdue items</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: By Workstream + NCRs */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* By Workstream */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Factory className="h-4 w-4 text-blue-500" />
              In Production by Workstream
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.byWorkstream.map((ws) => {
              const max = Math.max(...data.byWorkstream.map((x) => x.count), 1)
              const pct = (ws.count / max) * 100
              return (
                <div key={ws.workstream}>
                  <div className="flex items-center justify-between text-sm mb-0.5">
                    <span className="font-medium text-gray-700">{ws.workstream}</span>
                    <span className="font-mono text-gray-600">{ws.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {data.byWorkstream.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No production data</p>
            )}
          </CardContent>
        </Card>

        {/* NCRs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Open NCRs in Production
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Project</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Severity</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.openNcrs.map((ncr, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-blue-600">{ncr.projectNumber}</td>
                    <td className="px-4 py-2">
                      <Badge variant="secondary" className={cn("text-[10px]",
                        ncr.severity === "CRITICAL" ? "bg-red-100 text-red-700" :
                        ncr.severity === "MAJOR" ? "bg-orange-100 text-orange-700" :
                        "bg-yellow-100 text-yellow-700"
                      )}>{ncr.severity}</Badge>
                    </td>
                    <td className="px-4 py-2 text-center font-mono">{ncr.count}</td>
                  </tr>
                ))}
                {data.openNcrs.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-green-600">No open NCRs</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
