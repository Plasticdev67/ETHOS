"use client"

import { cn } from "@/lib/utils"

type FeedData = {
  // Products designed, not yet in production
  readyForProduction: number
  // Design pipeline breakdown
  activeInDesign: number
  idleInDesign: number
  awaitingResponse: number
  queued: number
  // Timeline — projects grouped by estimated design completion
  timeline: Array<{
    projectId: string
    projectNumber: string
    projectName: string
    customerName: string | null
    productCount: number
    designEstimatedCompletion: string | null
    designCardsComplete: number
    designCardsTotal: number
  }>
}

export function ProductionFeedStrip({ data }: { data: FeedData }) {
  const totalInDesign = data.activeInDesign + data.idleInDesign + data.awaitingResponse
  const blocked = data.idleInDesign + data.awaitingResponse

  // Group timeline by period
  const now = new Date()
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const sixWeeks = new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000)

  const dueSoon = data.timeline.filter((p) => {
    if (!p.designEstimatedCompletion) return false
    const d = new Date(p.designEstimatedCompletion)
    return d <= twoWeeks
  })
  const dueMedium = data.timeline.filter((p) => {
    if (!p.designEstimatedCompletion) return false
    const d = new Date(p.designEstimatedCompletion)
    return d > twoWeeks && d <= sixWeeks
  })
  const dueLater = data.timeline.filter((p) => {
    if (!p.designEstimatedCompletion) return false
    const d = new Date(p.designEstimatedCompletion)
    return d > sixWeeks
  })
  const noEstimate = data.timeline.filter((p) => !p.designEstimatedCompletion)

  const dueSoonProducts = dueSoon.reduce((s, p) => s + p.productCount, 0)
  const dueMediumProducts = dueMedium.reduce((s, p) => s + p.productCount, 0)
  const dueLaterProducts = dueLater.reduce((s, p) => s + p.productCount, 0)
  const noEstimateProducts = noEstimate.reduce((s, p) => s + p.productCount, 0)

  // Health — red if ready < 3, amber if < 6
  const healthColor = data.readyForProduction < 3 ? "text-red-700 bg-red-50 border-red-200" :
    data.readyForProduction < 6 ? "text-amber-700 bg-amber-50 border-amber-200" :
    "text-green-700 bg-green-50 border-green-200"

  return (
    <div className="rounded-lg border border-border bg-white p-3 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span className="text-sm font-semibold text-gray-800">Production Feed</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Ready for Production */}
        <div className={cn("rounded-lg border p-3", healthColor)}>
          <div className="text-[10px] font-medium uppercase opacity-70">Ready for Factory</div>
          <div className="text-2xl font-bold">{data.readyForProduction}</div>
          <div className="text-[10px] opacity-60">products designed, awaiting handover</div>
        </div>

        {/* In Design Pipeline */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-700">
          <div className="text-[10px] font-medium uppercase opacity-70">In Design</div>
          <div className="text-2xl font-bold">{totalInDesign}</div>
          <div className="text-[10px] space-x-2">
            <span className="font-medium">{data.activeInDesign} active</span>
            {data.idleInDesign > 0 && <span className="text-amber-600">{data.idleInDesign} idle</span>}
            {data.awaitingResponse > 0 && <span className="text-orange-600">{data.awaitingResponse} waiting</span>}
          </div>
        </div>

        {/* Blocked */}
        <div className={cn(
          "rounded-lg border p-3",
          blocked > 0 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-gray-200 bg-gray-50 text-gray-500"
        )}>
          <div className="text-[10px] font-medium uppercase opacity-70">Not Progressing</div>
          <div className="text-2xl font-bold">{blocked}</div>
          <div className="text-[10px] opacity-60">
            {blocked === 0 ? "all products moving" : "idle + external waits"}
          </div>
        </div>

        {/* Queued */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-600">
          <div className="text-[10px] font-medium uppercase opacity-70">Queued</div>
          <div className="text-2xl font-bold">{data.queued}</div>
          <div className="text-[10px] opacity-60">products waiting to start design</div>
        </div>
      </div>

      {/* Timeline forecast */}
      {data.timeline.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-[10px] font-medium text-gray-500 uppercase mb-2">Design Completion Forecast</div>
          <div className="flex gap-2 text-[10px]">
            {dueSoonProducts > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {dueSoonProducts} products in 2 weeks
              </div>
            )}
            {dueMediumProducts > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {dueMediumProducts} in 2-6 weeks
              </div>
            )}
            {dueLaterProducts > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                {dueLaterProducts} in 6+ weeks
              </div>
            )}
            {noEstimateProducts > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                {noEstimateProducts} no estimate
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
