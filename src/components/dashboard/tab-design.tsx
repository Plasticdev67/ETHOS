"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { prettifyEnum, cn } from "@/lib/utils"
import { PenTool, Clock, AlertTriangle, Users, Layers } from "lucide-react"

type DesignTabData = {
  activeCards: number
  completedCards: number
  overdueCards: number
  avgCycleTimeDays: number
  cardsByStatus: { status: string; count: number }[]
  designerWorkload: {
    name: string
    active: number
    completed: number
    avgDays: number
    hoursAccuracy: number
  }[]
  byWorkstream: {
    workstream: string
    activeCards: number
    avgDesignDays: number
    hoursAccuracy: number
  }[]
  overdueList: {
    id: string
    projectNumber: string
    productDescription: string
    designer: string
    daysOverdue: number
    targetDate: string | null
  }[]
  handoversPending: {
    projectNumber: string
    projectName: string
    submittedAt: string
    daysWaiting: number
  }[]
}

export function TabDesign({ data }: { data: DesignTabData }) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Active Cards</p>
            <p className="text-2xl font-semibold text-gray-900">{data.activeCards}</p>
            <p className="text-xs text-gray-400 mt-1">In progress + review</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Completed</p>
            <p className="text-2xl font-semibold text-green-700">{data.completedCards}</p>
            <p className="text-xs text-gray-400 mt-1">All time</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Overdue</p>
            <p className={cn("text-2xl font-semibold", data.overdueCards > 0 ? "text-red-600" : "text-gray-900")}>{data.overdueCards}</p>
            <p className="text-xs text-gray-400 mt-1">Past target end date</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Avg Cycle Time</p>
            <p className="text-2xl font-semibold text-purple-700">{data.avgCycleTimeDays.toFixed(1)}d</p>
            <p className="text-xs text-gray-400 mt-1">Start to complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Cards by Status + Designer Workload */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Cards by Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              Cards by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.cardsByStatus.map((s) => {
              const max = Math.max(...data.cardsByStatus.map((x) => x.count), 1)
              const pct = (s.count / max) * 100
              const color = s.status === "COMPLETE" ? "bg-green-500" : s.status === "IN_PROGRESS" ? "bg-blue-500" : s.status === "REVIEW" ? "bg-amber-500" : "bg-gray-400"
              return (
                <div key={s.status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{prettifyEnum(s.status)}</span>
                    <span className="font-mono text-gray-600">{s.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className={cn("h-2 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Designer Workload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Designer Workload
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Designer</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Active</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Done</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Avg Days</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Hrs Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.designerWorkload.map((d) => (
                  <tr key={d.name} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700">{d.name}</td>
                    <td className="px-4 py-2 text-center">{d.active}</td>
                    <td className="px-4 py-2 text-center text-gray-500">{d.completed}</td>
                    <td className="px-4 py-2 text-center font-mono text-gray-600">{d.avgDays.toFixed(1)}</td>
                    <td className={cn("px-4 py-2 text-center font-mono font-medium",
                      d.hoursAccuracy > 110 ? "text-red-600" : d.hoursAccuracy < 90 ? "text-amber-600" : "text-green-600"
                    )}>
                      {d.hoursAccuracy.toFixed(0)}%
                    </td>
                  </tr>
                ))}
                {data.designerWorkload.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No designers assigned</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: By Workstream + Overdue Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* By Workstream */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PenTool className="h-4 w-4 text-emerald-500" />
              By Workstream
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Workstream</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Active</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Avg Days</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Hrs Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.byWorkstream.map((ws) => (
                  <tr key={ws.workstream} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700">{ws.workstream}</td>
                    <td className="px-4 py-2 text-center">{ws.activeCards}</td>
                    <td className="px-4 py-2 text-center font-mono text-gray-600">{ws.avgDesignDays.toFixed(1)}</td>
                    <td className={cn("px-4 py-2 text-center font-mono font-medium",
                      ws.hoursAccuracy > 110 ? "text-red-600" : ws.hoursAccuracy < 90 ? "text-amber-600" : "text-green-600"
                    )}>
                      {ws.hoursAccuracy.toFixed(0)}%
                    </td>
                  </tr>
                ))}
                {data.byWorkstream.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No workstream data</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Overdue Cards */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Overdue Design Cards
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Project</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Designer</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.overdueList.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-blue-600">{card.projectNumber}</td>
                    <td className="px-4 py-2 text-gray-700 truncate max-w-[200px]">{card.productDescription}</td>
                    <td className="px-4 py-2 text-gray-500">{card.designer || "—"}</td>
                    <td className="px-4 py-2 text-center">
                      <Badge variant="secondary" className="bg-red-100 text-red-700 text-[10px]">{card.daysOverdue}d</Badge>
                    </td>
                  </tr>
                ))}
                {data.overdueList.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-green-600">No overdue cards</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Handovers Pending */}
      {data.handoversPending.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Handovers Pending Acknowledgement ({data.handoversPending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Project</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Waiting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.handoversPending.map((h, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-blue-600">{h.projectNumber}</td>
                    <td className="px-4 py-2 text-gray-700">{h.projectName}</td>
                    <td className={cn("px-4 py-2 text-right font-medium text-xs",
                      h.daysWaiting > 3 ? "text-red-600" : "text-gray-500"
                    )}>
                      {h.daysWaiting}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
