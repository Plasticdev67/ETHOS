import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowRight, BarChart3 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type WorkstreamRow = {
  workStream: string
  label: string
  projectCount: number
  avgMargin: number
  onTimePercent: number | null
}

const WS_COLORS: Record<string, string> = {
  COMMUNITY: "bg-blue-100 text-blue-800",
  UTILITIES: "bg-cyan-100 text-cyan-800",
  BESPOKE: "bg-violet-100 text-violet-800",
  BLAST: "bg-orange-100 text-orange-800",
  BUND_CONTAINMENT: "bg-teal-100 text-teal-800",
  REFURBISHMENT: "bg-amber-100 text-amber-800",
}

export function DashboardWorkstreamPerformance({ data }: { data: WorkstreamRow[] }) {
  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-base font-semibold">Workstream Performance</CardTitle>
          </div>
          <Link href="/reports" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            Full Reports <ArrowRight className="ml-0.5 inline h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-gray-500">Workstream</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium uppercase text-gray-500">Projects</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium uppercase text-gray-500">Avg Margin</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium uppercase text-gray-500">On-time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((ws) => (
                <tr key={ws.workStream} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Badge variant="secondary" className={`text-[10px] ${WS_COLORS[ws.workStream] || "bg-gray-100 text-gray-700"}`}>
                      {ws.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-center font-mono text-xs text-gray-700">{ws.projectCount}</td>
                  <td className={`px-4 py-2 text-center font-mono text-xs font-medium ${
                    ws.avgMargin >= 25 ? "text-emerald-700" : ws.avgMargin >= 15 ? "text-amber-700" : "text-red-700"
                  }`}>
                    {ws.avgMargin.toFixed(1)}%
                  </td>
                  <td className={`px-4 py-2 text-center font-mono text-xs font-medium ${
                    ws.onTimePercent === null ? "text-gray-400" :
                    ws.onTimePercent >= 80 ? "text-emerald-700" :
                    ws.onTimePercent >= 60 ? "text-amber-700" : "text-red-700"
                  }`}>
                    {ws.onTimePercent !== null ? `${ws.onTimePercent.toFixed(0)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
