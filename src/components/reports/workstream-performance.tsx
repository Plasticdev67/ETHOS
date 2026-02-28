"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Trophy } from "lucide-react"

type WorkstreamMetrics = {
  workStream: string
  projectCount: number
  avgMargin: number
  avgDesignDays: number | null
  avgProductionDays: number | null
  avgInstallDays: number | null
  onTimePercent: number | null
  ncrRate: number
  ncrCost: number
}

const WS_LABELS: Record<string, string> = {
  COMMUNITY: "Community",
  UTILITIES: "Utility",
  BESPOKE: "Bespoke",
  BLAST: "Blast",
  BUND_CONTAINMENT: "Bund",
  REFURBISHMENT: "Refurb",
}

const WS_COLORS: Record<string, string> = {
  COMMUNITY: "bg-blue-100 text-blue-800",
  UTILITIES: "bg-cyan-100 text-cyan-800",
  BESPOKE: "bg-violet-100 text-violet-800",
  BLAST: "bg-orange-100 text-orange-800",
  BUND_CONTAINMENT: "bg-teal-100 text-teal-800",
  REFURBISHMENT: "bg-amber-100 text-amber-800",
}

function marginColor(m: number) {
  if (m >= 25) return "text-emerald-700"
  if (m >= 15) return "text-amber-700"
  return "text-red-700"
}

function onTimeColor(p: number | null) {
  if (p === null) return "text-gray-400"
  if (p >= 80) return "text-emerald-700"
  if (p >= 60) return "text-amber-700"
  return "text-red-700"
}

export function WorkstreamPerformance({ data }: { data: WorkstreamMetrics[] }) {
  const bestMargin = data.reduce<WorkstreamMetrics | null>(
    (best, ws) => (!best || ws.avgMargin > best.avgMargin ? ws : best),
    null
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map((ws) => {
          const isBest = bestMargin?.workStream === ws.workStream && ws.projectCount > 0
          return (
            <Card key={ws.workStream} className={isBest ? "ring-2 ring-emerald-400" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className={WS_COLORS[ws.workStream] || "bg-gray-100 text-gray-700"}>
                    {WS_LABELS[ws.workStream] || ws.workStream}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    {isBest && <Trophy className="h-3.5 w-3.5 text-emerald-500" />}
                    <span className="text-xs text-gray-400">{ws.projectCount} projects</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Margin */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Avg Margin</span>
                  <span className={`text-sm font-bold ${marginColor(ws.avgMargin)}`}>
                    {ws.avgMargin.toFixed(1)}%
                  </span>
                </div>

                {/* On-time */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">On-time Delivery</span>
                  <span className={`text-sm font-bold ${onTimeColor(ws.onTimePercent)}`}>
                    {ws.onTimePercent !== null ? `${ws.onTimePercent.toFixed(0)}%` : "—"}
                  </span>
                </div>

                {/* Stage durations */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border">
                  <div className="text-center">
                    <div className="text-xs font-semibold text-gray-900">
                      {ws.avgDesignDays !== null ? `${ws.avgDesignDays.toFixed(0)}d` : "—"}
                    </div>
                    <div className="text-[9px] text-gray-400">Design</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-gray-900">
                      {ws.avgProductionDays !== null ? `${ws.avgProductionDays.toFixed(0)}d` : "—"}
                    </div>
                    <div className="text-[9px] text-gray-400">Production</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-gray-900">
                      {ws.avgInstallDays !== null ? `${ws.avgInstallDays.toFixed(0)}d` : "—"}
                    </div>
                    <div className="text-[9px] text-gray-400">Install</div>
                  </div>
                </div>

                {/* NCR */}
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-xs text-gray-500">NCR Rate / Cost</span>
                  <span className="text-xs text-gray-700">
                    {ws.ncrRate.toFixed(1)}/proj · {formatCurrency(ws.ncrCost)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
