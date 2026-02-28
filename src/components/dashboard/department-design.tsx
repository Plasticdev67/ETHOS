import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight, PenTool } from "lucide-react"

type DesignData = {
  activeCards: number
  totalCards: number
  overdueCount: number
  topOverdue: {
    id: string
    projectNumber: string
    productDescription: string
    daysOverdue: number
  }[]
}

export function DepartmentDesign({ data }: { data: DesignData }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenTool className="h-4 w-4 text-violet-600" />
            <CardTitle className="text-base font-semibold">Design</CardTitle>
          </div>
          <Link href="/design" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            View Board <ArrowRight className="ml-0.5 inline h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Active / Total */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-violet-50 p-2.5">
            <div className="text-[10px] font-medium text-violet-600 uppercase">In Progress</div>
            <div className="text-lg font-semibold text-gray-900">
              {data.activeCards} <span className="text-sm font-normal text-gray-400">/ {data.totalCards}</span>
            </div>
          </div>
          <div className={`rounded-lg p-2.5 ${data.overdueCount > 0 ? "bg-red-50" : "bg-green-50"}`}>
            <div className={`text-[10px] font-medium uppercase ${data.overdueCount > 0 ? "text-red-600" : "text-green-600"}`}>
              Overdue
            </div>
            <div className={`text-lg font-semibold ${data.overdueCount > 0 ? "text-red-700" : "text-green-700"}`}>
              {data.overdueCount}
            </div>
          </div>
        </div>

        {/* Top overdue items */}
        {data.topOverdue.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-medium text-gray-400 uppercase">Most Overdue</div>
            {data.topOverdue.map((item) => (
              <Link key={item.id} href={`/design`}>
                <div className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/50 px-2.5 py-1.5 cursor-pointer hover:shadow-sm transition-shadow">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-gray-900 truncate">{item.productDescription}</div>
                    <div className="text-[10px] text-gray-500">{item.projectNumber}</div>
                  </div>
                  <div className="text-xs font-semibold text-red-600 ml-2 shrink-0">{item.daysOverdue}d</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {data.totalCards === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">No design cards active</p>
        )}
      </CardContent>
    </Card>
  )
}
