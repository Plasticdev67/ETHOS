import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowRight, Factory } from "lucide-react"

type ProductionData = {
  totalInProduction: number
  stages: { stage: string; count: number }[]
  bottleneck: string | null
}

const stageColors: Record<string, string> = {
  AWAITING: "bg-gray-100 text-gray-700",
  CUTTING: "bg-sky-100 text-sky-800",
  FABRICATION: "bg-blue-100 text-blue-800",
  FITTING: "bg-indigo-100 text-indigo-800",
  SHOTBLASTING: "bg-orange-100 text-orange-800",
  PAINTING: "bg-purple-100 text-purple-800",
  PACKING: "bg-emerald-100 text-emerald-800",
  DISPATCHED: "bg-green-100 text-green-800",
  STORAGE: "bg-amber-100 text-amber-800",
  REWORK: "bg-red-100 text-red-800",
  SUB_CONTRACT: "bg-cyan-100 text-cyan-800",
  COMPLETED: "bg-green-100 text-green-800",
}

function prettifyStage(stage: string): string {
  return stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("N A", "N/A")
    .replace("Sub Contract", "Sub-Contract")
}

export function DepartmentProduction({ data }: { data: ProductionData }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 text-orange-600" />
            <CardTitle className="text-base font-semibold">Production</CardTitle>
          </div>
          <Link href="/production" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            View Production <ArrowRight className="ml-0.5 inline h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Total */}
        <div className="rounded-lg bg-orange-50 p-2.5">
          <div className="text-[10px] font-medium text-orange-600 uppercase">In Production</div>
          <div className="text-lg font-semibold text-gray-900">{data.totalInProduction} products</div>
        </div>

        {/* Stage pills */}
        {data.stages.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.stages
              .filter((s) => s.stage !== "COMPLETED" && s.stage !== "N_A")
              .map((stage) => (
                <Badge
                  key={stage.stage}
                  variant="secondary"
                  className={`text-[10px] px-2 py-0.5 ${stageColors[stage.stage] || "bg-gray-100 text-gray-700"} ${
                    data.bottleneck === stage.stage ? "ring-1 ring-orange-400" : ""
                  }`}
                >
                  {prettifyStage(stage.stage)}: {stage.count}
                </Badge>
              ))}
          </div>
        )}

        {/* Bottleneck */}
        {data.bottleneck && (
          <div className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50/50 px-2.5 py-1.5">
            <span className="text-[10px] font-medium text-orange-700">Bottleneck:</span>
            <span className="text-xs font-semibold text-orange-800">{prettifyStage(data.bottleneck)}</span>
          </div>
        )}

        {data.totalInProduction === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">No products in production</p>
        )}
      </CardContent>
    </Card>
  )
}
