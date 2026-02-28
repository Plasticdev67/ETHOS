"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type DesignerMetrics = {
  id: string
  name: string
  cardsCompleted: number
  cardsInProgress: number
  avgCompletionDays: number | null
  hoursAccuracy: number | null
  rejectionRate: number
}

type PMMetrics = {
  id: string
  name: string
  activeProjects: number
  completedProjects: number
  onTimePercent: number | null
  avgMargin: number
  ncrCount: number
}

function marginColor(m: number) {
  if (m >= 25) return "text-emerald-700"
  if (m >= 15) return "text-amber-700"
  return "text-red-700"
}

function accuracyColor(a: number | null) {
  if (a === null) return "text-gray-400"
  if (a >= 0.85 && a <= 1.15) return "text-emerald-700"
  if (a >= 0.7 && a <= 1.3) return "text-amber-700"
  return "text-red-700"
}

export function PeoplePerformance({
  designers,
  projectManagers,
}: {
  designers: DesignerMetrics[]
  projectManagers: PMMetrics[]
}) {
  return (
    <div className="space-y-6">
      {/* Design Team */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Design Team Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Designer</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Completed</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">In Progress</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Avg Days</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Hours Accuracy</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Rejection Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {designers.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{d.name}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-gray-700">{d.cardsCompleted}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-gray-700">{d.cardsInProgress}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-gray-700">
                      {d.avgCompletionDays !== null ? `${d.avgCompletionDays.toFixed(0)}` : "—"}
                    </td>
                    <td className={`px-4 py-2.5 text-center font-mono font-medium ${accuracyColor(d.hoursAccuracy)}`}>
                      {d.hoursAccuracy !== null ? `${(d.hoursAccuracy * 100).toFixed(0)}%` : "—"}
                    </td>
                    <td className={`px-4 py-2.5 text-center font-mono font-medium ${d.rejectionRate > 20 ? "text-red-600" : d.rejectionRate > 10 ? "text-amber-600" : "text-emerald-700"}`}>
                      {d.rejectionRate.toFixed(0)}%
                    </td>
                  </tr>
                ))}
                {designers.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No design data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Project Managers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Project Manager Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">PM</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Active</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Completed</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">On-time %</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Avg Margin</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">NCRs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projectManagers.map((pm) => (
                  <tr key={pm.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{pm.name}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-gray-700">{pm.activeProjects}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-gray-700">{pm.completedProjects}</td>
                    <td className={`px-4 py-2.5 text-center font-mono font-medium ${
                      pm.onTimePercent === null ? "text-gray-400" :
                      pm.onTimePercent >= 80 ? "text-emerald-700" :
                      pm.onTimePercent >= 60 ? "text-amber-700" : "text-red-600"
                    }`}>
                      {pm.onTimePercent !== null ? `${pm.onTimePercent.toFixed(0)}%` : "—"}
                    </td>
                    <td className={`px-4 py-2.5 text-center font-mono font-medium ${marginColor(pm.avgMargin)}`}>
                      {pm.avgMargin.toFixed(1)}%
                    </td>
                    <td className={`px-4 py-2.5 text-center font-mono ${pm.ncrCount > 0 ? "text-red-600 font-medium" : "text-gray-700"}`}>
                      {pm.ncrCount}
                    </td>
                  </tr>
                ))}
                {projectManagers.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No PM data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
