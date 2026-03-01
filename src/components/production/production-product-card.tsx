"use client"

import { memo } from "react"
import Link from "next/link"
import { Siren, Flame, AlertTriangle } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { getCardScheduleColor } from "@/lib/production-utils"

export type FlatProduct = {
  id: string
  partCode: string
  description: string
  quantity: number
  productionStatus: string | null
  productionTargetDate: string | null
  productionCompletionDate: string | null
  project: {
    id: string
    projectNumber: string
    name: string
    priority: string
    isICUFlag: boolean
    workStream: string
    customer: { name: string } | null
    projectManager: { name: string } | null
    targetCompletion: string | null
    ncrCount: number
  }
}

export const ProductionProductCard = memo(function ProductionProductCard({
  product,
  compact,
}: {
  product: FlatProduct
  compact?: boolean
}) {
  const scheduleColor = getCardScheduleColor(
    product.productionTargetDate || product.project.targetCompletion
  )

  if (compact) {
    return (
      <Link href={`/projects/${product.project.id}`}>
        <div
          className={`w-full text-left rounded-md border border-gray-200 bg-white px-2.5 py-1.5 border-l-4 ${scheduleColor} hover:shadow-sm transition-shadow`}
        >
          <div className="flex items-center gap-2">
            <PriorityIcon
              priority={product.project.priority}
              isICU={product.project.isICUFlag}
            />
            <span className="text-[10px] font-mono text-gray-400">
              {product.project.projectNumber}
            </span>
            <span className="text-xs text-gray-700 truncate flex-1">
              {product.description}
            </span>
            {product.quantity > 1 && (
              <span className="text-[10px] font-medium text-gray-500">
                x{product.quantity}
              </span>
            )}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/projects/${product.project.id}`}>
      <div
        className={`w-full text-left rounded-md border border-gray-200 bg-white px-3 py-2.5 border-l-4 ${scheduleColor} hover:shadow-md transition-shadow`}
      >
        {/* Header */}
        <div className="flex items-center gap-1.5">
          <PriorityIcon
            priority={product.project.priority}
            isICU={product.project.isICUFlag}
          />
          <span className="text-[10px] font-bold text-gray-800">
            {product.project.projectNumber}
          </span>
          {product.project.ncrCount > 0 && (
            <span className="ml-auto rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
              NCR: {product.project.ncrCount}
            </span>
          )}
        </div>

        {/* Product description */}
        <div className="mt-1 text-xs font-medium text-gray-700 truncate">
          {product.description}
        </div>

        {/* Part code + quantity */}
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-500">
          <span className="font-mono">{product.partCode}</span>
          {product.quantity > 1 && (
            <span className="font-medium">x{product.quantity}</span>
          )}
        </div>

        {/* Customer */}
        <div className="mt-1 text-[10px] text-gray-500 truncate">
          {product.project.customer?.name || "No client"}
        </div>

        {/* PM */}
        <div className="mt-0.5 text-[10px] text-gray-500">
          PM: {product.project.projectManager?.name || "Unassigned"}
        </div>

        {/* Footer */}
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-400">
          <span>{product.project.name}</span>
          {(product.productionTargetDate || product.project.targetCompletion) && (
            <span>
              Due:{" "}
              {formatDate(
                product.productionTargetDate || product.project.targetCompletion!
              )}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
})

function PriorityIcon({
  priority,
  isICU,
}: {
  priority: string
  isICU: boolean
}) {
  if (isICU)
    return <Siren className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
  if (priority === "CRITICAL")
    return <Flame className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
  if (priority === "HIGH")
    return (
      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
    )
  return null
}
