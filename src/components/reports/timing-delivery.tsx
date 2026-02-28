"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

type TimingData = {
  avgDesignDays: number | null
  avgProductionDays: number | null
  avgInstallDays: number | null
  avgLeadTimeDays: number | null
  designHoursAccuracy: number | null
  productionHoursAccuracy: number | null
  overallOnTimePercent: number | null
  monthlyOnTime: { month: string; percent: number; total: number }[]
  overdueProjects: {
    id: string
    projectNumber: string
    name: string
    targetCompletion: Date
    daysOverdue: number
  }[]
}

export function TimingDelivery({ data }: { data: TimingData }) {
  return (
    <div className="space-y-6">
      {/* Stage cycle times */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-[10px] text-gray-500 uppercase">Avg Design</div>
            <div className="text-2xl font-semibold text-gray-900">
              {data.avgDesignDays !== null ? `${data.avgDesignDays.toFixed(0)}d` : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-[10px] text-gray-500 uppercase">Avg Production</div>
            <div className="text-2xl font-semibold text-gray-900">
              {data.avgProductionDays !== null ? `${data.avgProductionDays.toFixed(0)}d` : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-[10px] text-gray-500 uppercase">Avg Install</div>
            <div className="text-2xl font-semibold text-gray-900">
              {data.avgInstallDays !== null ? `${data.avgInstallDays.toFixed(0)}d` : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-[10px] text-gray-500 uppercase">Avg Lead Time</div>
            <div className="text-2xl font-semibold text-gray-900">
              {data.avgLeadTimeDays !== null ? `${data.avgLeadTimeDays.toFixed(0)}d` : "—"}
            </div>
            <div className="text-[9px] text-gray-400">Order → Complete</div>
          </CardContent>
        </Card>
      </div>

      {/* Estimated vs Actual Hours + Overall On-time */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-[10px] text-gray-500 uppercase">On-time Delivery</div>
            <div className={`text-3xl font-bold ${
              data.overallOnTimePercent === null ? "text-gray-400" :
              data.overallOnTimePercent >= 80 ? "text-emerald-700" :
              data.overallOnTimePercent >= 60 ? "text-amber-700" : "text-red-600"
            }`}>
              {data.overallOnTimePercent !== null ? `${data.overallOnTimePercent.toFixed(0)}%` : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-[10px] text-gray-500 uppercase">Design Hours Accuracy</div>
            <div className={`text-3xl font-bold ${
              data.designHoursAccuracy === null ? "text-gray-400" :
              Math.abs(data.designHoursAccuracy - 1) <= 0.15 ? "text-emerald-700" :
              Math.abs(data.designHoursAccuracy - 1) <= 0.3 ? "text-amber-700" : "text-red-600"
            }`}>
              {data.designHoursAccuracy !== null ? `${(data.designHoursAccuracy * 100).toFixed(0)}%` : "—"}
            </div>
            <div className="text-[9px] text-gray-400">actual / estimated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-[10px] text-gray-500 uppercase">Production Hours Accuracy</div>
            <div className={`text-3xl font-bold ${
              data.productionHoursAccuracy === null ? "text-gray-400" :
              Math.abs(data.productionHoursAccuracy - 1) <= 0.15 ? "text-emerald-700" :
              Math.abs(data.productionHoursAccuracy - 1) <= 0.3 ? "text-amber-700" : "text-red-600"
            }`}>
              {data.productionHoursAccuracy !== null ? `${(data.productionHoursAccuracy * 100).toFixed(0)}%` : "—"}
            </div>
            <div className="text-[9px] text-gray-400">actual / estimated</div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly on-time trend */}
      {data.monthlyOnTime.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">On-time Delivery — Last 6 Months</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {data.monthlyOnTime.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px] font-medium text-gray-700">{m.percent.toFixed(0)}%</div>
                  <div className="w-full rounded-t" style={{ height: `${Math.max(m.percent, 5)}%` }}>
                    <div className={`w-full h-full rounded-t ${
                      m.percent >= 80 ? "bg-emerald-400" : m.percent >= 60 ? "bg-amber-400" : "bg-red-400"
                    }`} />
                  </div>
                  <div className="text-[9px] text-gray-400">{m.month}</div>
                  <div className="text-[8px] text-gray-300">{m.total} proj</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue projects */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Currently Overdue Projects</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.overdueProjects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Project</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Target</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Days Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.overdueProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <Link href={`/projects/${p.id}`} className="font-mono text-xs font-medium text-blue-600 hover:text-blue-700">
                          {p.projectNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-gray-900">{p.name}</td>
                      <td className="px-4 py-2.5 text-center text-xs text-gray-500">{formatDate(p.targetCompletion)}</td>
                      <td className="px-4 py-2.5 text-center font-mono font-semibold text-red-600">{p.daysOverdue}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-400">No overdue projects</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
