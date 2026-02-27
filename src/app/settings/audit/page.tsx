"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History, Filter, Clock } from "lucide-react"
import Link from "next/link"
import { getProjectStatusColor, prettifyEnum } from "@/lib/utils"

type TimeSummary = {
  projectId: string
  projectNumber: string
  projectName: string
  customerName: string
  projectStatus: string
  designDays: number | null
  designHours: number | null
  prodDays: number | null
  prodHours: number | null
  installDays: number | null
  totalDays: number | null
}

type AuditEntry = {
  id: string
  userId: string | null
  userName: string | null
  action: string
  entity: string
  entityId: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  metadata: string | null
  createdAt: string
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [entityFilter, setEntityFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [timeSummary, setTimeSummary] = useState<TimeSummary[]>([])
  const [summaryLoading, setSummaryLoading] = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true)
      const params = new URLSearchParams()
      if (entityFilter) params.set("entity", entityFilter)
      params.set("limit", "100")
      const res = await fetch(`/api/audit?${params}`)
      if (res.ok) setLogs(await res.json())
      setLoading(false)
    }
    fetchLogs()
  }, [entityFilter])

  useEffect(() => {
    async function fetchTimeSummary() {
      const res = await fetch("/api/audit/time-summary")
      if (res.ok) setTimeSummary(await res.json())
      setSummaryLoading(false)
    }
    fetchTimeSummary()
  }, [])

  const actionColors: Record<string, string> = {
    CREATE: "bg-green-100 text-green-800",
    UPDATE: "bg-blue-100 text-blue-800",
    DELETE: "bg-red-100 text-red-800",
  }

  const entities = ["", "Project", "Quote", "Product", "Variation", "PurchaseOrder", "NCR", "Invoice"]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Audit Trail</h1>
          <p className="text-sm text-gray-500">Track who changed what, when. All system changes are logged here.</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
        >
          <option value="">All entities</option>
          {entities.filter(Boolean).map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {/* Project Time Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            Project Time Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {summaryLoading ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500">Loading...</div>
          ) : timeSummary.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500">No time data available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border bg-gray-50/50">
                    <th className="px-3 py-2.5 text-left text-xs font-medium uppercase text-gray-500">Project</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">Design (days)</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">Design (hrs)</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">Production (days)</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">Production (hrs)</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">Install (days)</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500 font-semibold">Total (days)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {timeSummary.map((s) => (
                    <tr key={s.projectId} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <Link href={`/projects/${s.projectId}`} className="text-blue-600 hover:text-blue-700 font-mono text-xs font-semibold">
                          {s.projectNumber}
                        </Link>
                        <div className="text-xs text-gray-500 truncate max-w-[160px]">{s.projectName}</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{s.customerName}</td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className={`${getProjectStatusColor(s.projectStatus)} text-[10px]`}>
                          {prettifyEnum(s.projectStatus)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{s.designDays ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{s.designHours != null ? `${s.designHours}h` : "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{s.prodDays ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{s.prodHours != null ? `${s.prodHours}h` : "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{s.installDays ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-gray-900">{s.totalDays ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-gray-400" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500">No audit entries found.</div>
          ) : (
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className={actionColors[log.action] || "bg-gray-100 text-gray-800"}>
                      {log.action}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{log.entity}</Badge>
                    <span className="text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleString("en-GB")}
                    </span>
                    {log.userName && (
                      <span className="ml-auto text-xs text-gray-500">by {log.userName}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-700">
                    {log.field ? (
                      <span>
                        Changed <strong>{log.field}</strong>
                        {log.oldValue && <span className="text-red-600 line-through mx-1">{truncate(log.oldValue)}</span>}
                        {log.newValue && <span className="text-green-700 mx-1">{truncate(log.newValue)}</span>}
                      </span>
                    ) : (
                      <span>
                        {log.action === "CREATE" && "Created "}
                        {log.action === "DELETE" && "Deleted "}
                        {log.newValue && <span className="font-medium">{truncate(log.newValue)}</span>}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">ID: {log.entityId.slice(0, 12)}...</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function truncate(s: string, max = 80) {
  return s.length > max ? s.slice(0, max) + "..." : s
}
