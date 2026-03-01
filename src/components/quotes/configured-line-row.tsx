"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { ChevronDown, ChevronRight, Wrench } from "lucide-react"
import { calculateRdAdjustedMargin } from "@/lib/quote-calculations"

type QuoteLineSpec = {
  id: string
  variantId: string
  width: number | null
  height: number | null
  specSelections: Record<string, string>
  computedBom: { description: string; category: string; quantity: number; unitCost: number; totalCost: number }[]
  computedCost: string | number
  includesRd: boolean
  rdCostAmount: string | number
  variant: {
    code: string
    name: string
    type: {
      name: string
      family: { name: string }
    }
  }
}

export function ConfiguredLineBadge() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-200">
      <Wrench className="h-2.5 w-2.5" />
      Configured
    </span>
  )
}

export function ConfiguredLineDetail({
  spec,
  costTotal,
  sellPrice,
}: {
  spec: QuoteLineSpec
  costTotal: number
  sellPrice: number
}) {
  const [expanded, setExpanded] = useState(false)

  const rdCost = Number(spec.rdCostAmount) || 0
  const rdMargins = spec.includesRd
    ? calculateRdAdjustedMargin(costTotal, sellPrice, rdCost)
    : null

  return (
    <div className="mt-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-5 px-1 text-[10px] text-indigo-600 hover:text-indigo-800"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-3 w-3 mr-0.5" /> : <ChevronRight className="h-3 w-3 mr-0.5" />}
        View Spec
      </Button>

      {expanded && (
        <div className="mt-1.5 rounded border border-indigo-100 bg-indigo-50/30 p-2.5 space-y-2 text-[11px]">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="font-medium">{spec.variant.type.family.name}</span>
            <span className="text-gray-300">→</span>
            <span>{spec.variant.type.name}</span>
            <span className="text-gray-300">→</span>
            <Badge variant="secondary" className="text-[9px]">{spec.variant.code}</Badge>
          </div>

          {spec.width && spec.height && (
            <div className="text-gray-500">
              Dimensions: <span className="font-mono">{spec.width}mm × {spec.height}mm</span>
            </div>
          )}

          {Object.keys(spec.specSelections).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(spec.specSelections).map(([code, value]) => (
                <span key={code} className="inline-block rounded bg-white border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">
                  {code}: <span className="font-medium">{value}</span>
                </span>
              ))}
            </div>
          )}

          {/* BOM summary */}
          {spec.computedBom && spec.computedBom.length > 0 && (
            <div className="mt-1 pt-1 border-t border-indigo-100">
              <span className="text-[10px] font-medium text-gray-500 uppercase">BOM ({spec.computedBom.length} items)</span>
              <div className="font-mono text-gray-700 mt-0.5">
                Cost: {formatCurrency(spec.computedCost)}
              </div>
            </div>
          )}

          {/* R&D info */}
          {spec.includesRd && rdMargins && (
            <div className="pt-1 border-t border-indigo-100">
              <div className="flex items-center gap-3">
                <span className="text-amber-700">
                  R&D: {formatCurrency(rdCost)}
                </span>
                <span className="text-green-700">
                  True Margin: {rdMargins.trueMargin.toFixed(1)}%
                </span>
                <span className="text-blue-700">
                  Apparent Margin: {rdMargins.apparentMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
