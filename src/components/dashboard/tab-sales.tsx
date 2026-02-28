"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, prettifyEnum, cn } from "@/lib/utils"
import { TrendingUp, Target, PoundSterling, Percent, Clock, Send } from "lucide-react"
import Link from "next/link"

type SalesTabData = {
  pipelineValue: number
  weightedForecast: number
  winRate: number
  avgDealSize: number
  pipelineByStage: { stage: string; value: number; count: number; probability: number }[]
  topOpportunities: {
    id: string
    name: string
    companyName: string
    estimatedValue: number
    winProbability: number
    expectedCloseDate: string | null
    weightedValue: number
  }[]
  monthlyTrend: { month: string; won: number; lost: number }[]
  quotesAwaiting: {
    id: string
    name: string
    companyName: string
    quotedPrice: number
    daysSinceSent: number
  }[]
  winLossByWorkstream: { workstream: string; won: number; lost: number; winRate: number }[]
  recentActivity: { id: string; name: string; companyName: string; status: string; changedAt: string }[]
}

function getProbColor(p: number) {
  if (p >= 75) return "text-green-600"
  if (p >= 50) return "text-amber-600"
  if (p >= 25) return "text-orange-600"
  return "text-red-600"
}

export function TabSales({ data }: { data: SalesTabData }) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Pipeline Value</p>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(data.pipelineValue)}</p>
            <p className="text-xs text-gray-400 mt-1">Active opportunities</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Weighted Forecast</p>
            <p className="text-2xl font-semibold text-emerald-700">{formatCurrency(data.weightedForecast)}</p>
            <p className="text-xs text-gray-400 mt-1">Value x probability</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Win Rate (90d)</p>
            <p className="text-2xl font-semibold text-amber-700">{data.winRate}%</p>
            <p className="text-xs text-gray-400 mt-1">Won / (Won + Lost)</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Avg Deal Size</p>
            <p className="text-2xl font-semibold text-purple-700">{formatCurrency(data.avgDealSize)}</p>
            <p className="text-xs text-gray-400 mt-1">Active pipeline</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Pipeline Funnel + Top Opportunities */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pipeline Funnel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Pipeline by Stage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.pipelineByStage.map((stage) => {
              const maxValue = Math.max(...data.pipelineByStage.map((s) => s.value), 1)
              const pct = (stage.value / maxValue) * 100
              return (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{stage.stage}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{stage.count} deals</span>
                      <span className="font-mono text-gray-600">{formatCurrency(stage.value)}</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {data.pipelineByStage.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No active pipeline</p>
            )}
          </CardContent>
        </Card>

        {/* Top Opportunities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Top Opportunities (by Weighted Value)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Opportunity</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Value</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Prob</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Weighted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.topOpportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/crm/quote/${opp.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                        {opp.name}
                      </Link>
                      <div className="text-xs text-gray-400">{opp.companyName}</div>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-700">{formatCurrency(opp.estimatedValue)}</td>
                    <td className={cn("px-4 py-2 text-center font-bold text-xs", getProbColor(opp.winProbability))}>
                      {opp.winProbability}%
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-medium text-gray-900">{formatCurrency(opp.weightedValue)}</td>
                  </tr>
                ))}
                {data.topOpportunities.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No opportunities</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Monthly Trend + Quotes Awaiting */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Monthly Won/Lost Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PoundSterling className="h-4 w-4 text-amber-500" />
              Monthly Won / Lost (6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthlyTrend.length > 0 ? (
              <div className="space-y-2">
                {data.monthlyTrend.map((m) => {
                  const max = Math.max(...data.monthlyTrend.map((t) => Math.max(t.won, t.lost)), 1)
                  return (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-12 shrink-0">{m.month}</span>
                      <div className="flex-1 flex gap-1">
                        <div className="h-5 rounded bg-green-400 flex items-center justify-end px-1.5" style={{ width: `${(m.won / max) * 100}%`, minWidth: m.won > 0 ? "24px" : "0" }}>
                          {m.won > 0 && <span className="text-[9px] font-mono text-white">{formatCurrency(m.won)}</span>}
                        </div>
                        <div className="h-5 rounded bg-red-400 flex items-center justify-end px-1.5" style={{ width: `${(m.lost / max) * 100}%`, minWidth: m.lost > 0 ? "24px" : "0" }}>
                          {m.lost > 0 && <span className="text-[9px] font-mono text-white">{formatCurrency(m.lost)}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div className="flex items-center gap-4 pt-2 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-green-400" /> Won</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-red-400" /> Lost</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Quotes Awaiting Response */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-500" />
              Quotes Awaiting Response
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quote</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Value</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.quotesAwaiting.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/crm/quote/${q.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                        {q.name}
                      </Link>
                      <div className="text-xs text-gray-400">{q.companyName}</div>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-700">{formatCurrency(q.quotedPrice)}</td>
                    <td className={cn("px-4 py-2 text-right text-xs font-medium",
                      q.daysSinceSent > 14 ? "text-red-600" : q.daysSinceSent > 7 ? "text-amber-600" : "text-gray-500"
                    )}>
                      {q.daysSinceSent}d
                    </td>
                  </tr>
                ))}
                {data.quotesAwaiting.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No quotes awaiting</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Win/Loss by Workstream + Recent Activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Win/Loss by Workstream */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Percent className="h-4 w-4 text-purple-500" />
              Win Rate by Workstream
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Workstream</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Won</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Lost</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.winLossByWorkstream.map((ws) => (
                  <tr key={ws.workstream} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700">{ws.workstream}</td>
                    <td className="px-4 py-2 text-center text-green-600 font-medium">{ws.won}</td>
                    <td className="px-4 py-2 text-center text-red-600 font-medium">{ws.lost}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={cn("font-bold text-xs", getProbColor(ws.winRate))}>{ws.winRate}%</span>
                    </td>
                  </tr>
                ))}
                {data.winLossByWorkstream.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No conversion data</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentActivity.map((a) => (
                <div key={a.id + a.changedAt} className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-[9px] shrink-0">{prettifyEnum(a.status)}</Badge>
                  <div className="flex-1 min-w-0">
                    <Link href={`/crm/quote/${a.id}`} className="text-sm text-blue-600 hover:text-blue-700 truncate block">
                      {a.name}
                    </Link>
                    <span className="text-xs text-gray-400">{a.companyName}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">{a.changedAt}</span>
                </div>
              ))}
              {data.recentActivity.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
