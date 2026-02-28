"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate, prettifyEnum, cn } from "@/lib/utils"
import { HardHat, AlertTriangle, Clock, PoundSterling, Calendar, Layers } from "lucide-react"
import Link from "next/link"

type InstallationTabData = {
  activeInstalls: number
  completingThisMonth: number
  overdueInstalls: number
  estInvoiceValue: number
  completingThisMonthList: {
    projectId: string
    projectNumber: string
    name: string
    customer: string
    targetCompletion: string | null
    contractValue: number
    daysRemaining: number
  }[]
  activeInstallList: {
    projectId: string
    projectNumber: string
    name: string
    customer: string
    status: string
    projectManager: string
    priority: string | null
    targetCompletion: string | null
  }[]
  upcomingInstalls: {
    projectId: string
    projectNumber: string
    name: string
    customer: string
    targetCompletion: string | null
    daysUntil: number
  }[]
  overdueList: {
    projectId: string
    projectNumber: string
    name: string
    customer: string
    targetCompletion: string | null
    daysOverdue: number
  }[]
  byWorkstream: { workstream: string; count: number }[]
  durationByWorkstream: { workstream: string; avgDays: number; count: number }[]
}

export function TabInstallation({ data }: { data: InstallationTabData }) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Active Installs</p>
            <p className="text-2xl font-semibold text-gray-900">{data.activeInstalls}</p>
            <p className="text-xs text-gray-400 mt-1">Projects in installation</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Completing This Month</p>
            <p className="text-2xl font-semibold text-emerald-700">{data.completingThisMonth}</p>
            <p className="text-xs text-gray-400 mt-1">For invoicing</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Overdue</p>
            <p className={cn("text-2xl font-semibold", data.overdueInstalls > 0 ? "text-red-600" : "text-gray-900")}>{data.overdueInstalls}</p>
            <p className="text-xs text-gray-400 mt-1">Past target date</p>
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

      {/* Row 1: Completing This Month + Active Installations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Completing This Month */}
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Target</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.completingThisMonthList.map((item) => (
                  <tr key={item.projectId} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/projects/${item.projectId}`} className="font-mono text-xs text-blue-600 hover:text-blue-700">
                        {item.projectNumber}
                      </Link>
                      <div className="text-xs text-gray-500 truncate max-w-[150px]">{item.name}</div>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{item.customer}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={cn("text-xs font-medium",
                        item.daysRemaining < 0 ? "text-red-600" : item.daysRemaining < 7 ? "text-amber-600" : "text-gray-500"
                      )}>
                        {item.targetCompletion ? new Date(item.targetCompletion).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                      </span>
                      <div className="text-[10px] text-gray-400">
                        {item.daysRemaining < 0 ? `${Math.abs(item.daysRemaining)}d overdue` : `${item.daysRemaining}d left`}
                      </div>
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

        {/* Active Installations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <HardHat className="h-4 w-4 text-blue-500" />
              Active Installations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Project</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">PM</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.activeInstallList.map((item) => (
                  <tr key={item.projectId} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/projects/${item.projectId}`} className="font-mono text-xs text-blue-600 hover:text-blue-700">
                        {item.projectNumber}
                      </Link>
                      <div className="text-xs text-gray-500 truncate max-w-[150px]">{item.name}</div>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{item.customer}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{item.projectManager || "—"}</td>
                    <td className="px-4 py-2 text-right text-xs text-gray-500">
                      {item.targetCompletion ? formatDate(item.targetCompletion) : "—"}
                    </td>
                  </tr>
                ))}
                {data.activeInstallList.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No active installations</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Upcoming + Overdue */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Upcoming Installs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Upcoming Installs (Next 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Project</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Starts In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.upcomingInstalls.map((item) => (
                  <tr key={item.projectId} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/projects/${item.projectId}`} className="font-mono text-xs text-blue-600">
                        {item.projectNumber}
                      </Link>
                      <div className="text-xs text-gray-500 truncate max-w-[150px]">{item.name}</div>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{item.customer}</td>
                    <td className="px-4 py-2 text-right">
                      <Badge variant="secondary" className={cn("text-[10px]",
                        item.daysUntil <= 7 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {item.daysUntil}d
                      </Badge>
                    </td>
                  </tr>
                ))}
                {data.upcomingInstalls.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No upcoming installs</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Overdue Installations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Overdue Installations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Project</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.overdueList.map((item) => (
                  <tr key={item.projectId} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/projects/${item.projectId}`} className="font-mono text-xs text-blue-600">
                        {item.projectNumber}
                      </Link>
                      <div className="text-xs text-gray-500 truncate max-w-[150px]">{item.name}</div>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{item.customer}</td>
                    <td className="px-4 py-2 text-center">
                      <Badge variant="secondary" className="bg-red-100 text-red-700 text-[10px]">{item.daysOverdue}d</Badge>
                    </td>
                  </tr>
                ))}
                {data.overdueList.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-green-600">No overdue installs</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: By Workstream + Duration Tracking */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              Installs by Workstream
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
                    <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {data.byWorkstream.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No install data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              Install Duration by Workstream
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Workstream</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Avg Days</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.durationByWorkstream.map((ws) => (
                  <tr key={ws.workstream} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700">{ws.workstream}</td>
                    <td className="px-4 py-2 text-center font-mono text-gray-600">{ws.avgDays.toFixed(1)}</td>
                    <td className="px-4 py-2 text-center text-gray-500">{ws.count}</td>
                  </tr>
                ))}
                {data.durationByWorkstream.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No duration data</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
