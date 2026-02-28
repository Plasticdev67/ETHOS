import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowRight, TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type SalesData = {
  pipelineValue: number
  weightedForecast: number
  wonThisMonth: { count: number; value: number }
  lostThisMonth: number
  conversionRate: number
  quotesAwaiting: number
  pipelineByStage: { stage: string; value: number; count: number }[]
}

export function DepartmentSales({ data }: { data: SalesData }) {
  const totalPipelineCount = data.pipelineByStage.reduce((sum, s) => sum + s.count, 0)

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-base font-semibold">Sales Overview</CardTitle>
          </div>
          <div className="flex gap-2">
            <Link href="/crm" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              CRM <ArrowRight className="ml-0.5 inline h-3 w-3" />
            </Link>
            <Link href="/quotes" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Quotes <ArrowRight className="ml-0.5 inline h-3 w-3" />
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Pipeline & Forecast */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-blue-50 p-2.5">
            <div className="text-[10px] font-medium text-blue-600 uppercase">Pipeline</div>
            <div className="text-lg font-semibold text-gray-900">{formatCurrency(data.pipelineValue)}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2.5">
            <div className="text-[10px] font-medium text-emerald-600 uppercase">Forecast</div>
            <div className="text-lg font-semibold text-gray-900">{formatCurrency(data.weightedForecast)}</div>
          </div>
        </div>

        {/* Won / Lost / Conversion */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center rounded-lg border border-border p-2">
            <div className="text-lg font-semibold text-emerald-700">{data.wonThisMonth.count}</div>
            <div className="text-[10px] text-gray-500">Won</div>
            {data.wonThisMonth.value > 0 && (
              <div className="text-[10px] font-medium text-emerald-600">{formatCurrency(data.wonThisMonth.value)}</div>
            )}
          </div>
          <div className="text-center rounded-lg border border-border p-2">
            <div className={`text-lg font-semibold ${data.lostThisMonth > 0 ? "text-red-600" : "text-gray-900"}`}>
              {data.lostThisMonth}
            </div>
            <div className="text-[10px] text-gray-500">Lost</div>
          </div>
          <div className="text-center rounded-lg border border-border p-2">
            <div className="text-lg font-semibold text-gray-900">{data.conversionRate}%</div>
            <div className="text-[10px] text-gray-500">Win Rate</div>
          </div>
        </div>

        {/* Quotes awaiting */}
        {data.quotesAwaiting > 0 && (
          <Link href="/quotes?status=SUBMITTED">
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2 cursor-pointer hover:shadow-sm transition-shadow">
              <span className="text-xs font-medium text-amber-800">{data.quotesAwaiting} quote{data.quotesAwaiting !== 1 ? "s" : ""} awaiting response</span>
              <ArrowRight className="h-3 w-3 text-amber-600" />
            </div>
          </Link>
        )}

        {/* Mini pipeline bar */}
        {totalPipelineCount > 0 && (
          <div>
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
              {data.pipelineByStage.map((stage) => {
                const pct = (stage.count / totalPipelineCount) * 100
                if (pct === 0) return null
                const colors: Record<string, string> = {
                  "Active Lead": "bg-gray-400",
                  "Pending Approval": "bg-blue-400",
                  "Quoted": "bg-amber-400",
                  "Won": "bg-emerald-500",
                }
                return (
                  <div
                    key={stage.stage}
                    className={colors[stage.stage] || "bg-gray-300"}
                    style={{ width: `${pct}%` }}
                  />
                )
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
              {data.pipelineByStage.map((stage) => (
                <div key={stage.stage} className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-gray-100 text-gray-600">
                    {stage.stage}: {stage.count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
