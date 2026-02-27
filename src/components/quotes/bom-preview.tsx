"use client"

import { useState } from "react"
import type { ComputedBomLine } from "@/lib/catalogue-types"

function formatCurrency(val: number) {
  return `£${val.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatTime(minutes: number) {
  if (!minutes) return "—"
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export type RealBomComponent = {
  headerRef: string
  headerDescription?: string
  stockCode: string
  description: string
  quantity: number
  unitOfMeasure?: string
  sequenceNo: number
  scrapPercent: number
  fixedQuantity: boolean
  productGroup?: string
  materialComposition?: string
  itemSetType?: string
}

export type RealBomOperation = {
  headerRef: string
  sequenceNo: number
  operationRef: string
  operationDescription?: string
  isSubcontract: boolean
  runTimeMinutes: number
  labourDescription?: string
  labourRate: number | null
  labourMinutes: number
  setupMinutes: number
  machineRef?: string
  machineDescription?: string
}

export type BomHeaderSummary = {
  headerRef: string
  description?: string
  componentCount: number
  operationCount: number
}

export function BomPreview({
  items,
  totalCost,
  bomHeaders,
  realComponents,
  realOperations,
}: {
  items: ComputedBomLine[]
  totalCost: number
  bomHeaders?: BomHeaderSummary[]
  realComponents?: RealBomComponent[]
  realOperations?: RealBomOperation[]
}) {
  const [activeTab, setActiveTab] = useState<"cost" | "components" | "operations">("cost")
  const hasRealData = (realComponents && realComponents.length > 0) || (realOperations && realOperations.length > 0)

  // Group items by category
  const categories = [...new Set(items.map((i) => i.category))]

  // Group components by product group for better display
  const componentsByGroup = (realComponents || []).reduce((acc, comp) => {
    const group = comp.productGroup || "Other"
    if (!acc[group]) acc[group] = []
    acc[group].push(comp)
    return acc
  }, {} as Record<string, RealBomComponent[]>)

  // Total labour/run time
  const totalLabourMins = (realOperations || []).reduce((sum, op) => sum + op.labourMinutes, 0)
  const totalRunMins = (realOperations || []).reduce((sum, op) => sum + op.runTimeMinutes, 0)
  const totalSetupMins = (realOperations || []).reduce((sum, op) => sum + op.setupMinutes, 0)

  return (
    <div className="space-y-3">
      {/* Header summaries */}
      {bomHeaders && bomHeaders.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {bomHeaders.map((h) => (
            <div
              key={h.headerRef}
              className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs"
            >
              <span className="font-semibold text-indigo-700">{h.headerRef}</span>
              {h.description && (
                <span className="text-indigo-600 ml-1">— {h.description}</span>
              )}
              <span className="text-indigo-500 ml-2">
                {h.componentCount} parts · {h.operationCount} ops
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      {hasRealData && (
        <div className="flex gap-1 border-b border-border">
          <button
            onClick={() => setActiveTab("cost")}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "cost"
                ? "border-indigo-500 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Cost Summary
          </button>
          <button
            onClick={() => setActiveTab("components")}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "components"
                ? "border-indigo-500 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Components ({realComponents?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("operations")}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "operations"
                ? "border-indigo-500 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Operations ({realOperations?.length || 0})
          </button>
        </div>
      )}

      {/* Cost Summary Tab (original BOM table) */}
      {activeTab === "cost" && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Item
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Category
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                  Qty
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                  Unit Cost
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((cat) => {
                const catItems = items.filter((i) => i.category === cat)

                return catItems.map((item, idx) => (
                  <tr
                    key={`${cat}-${idx}`}
                    className={item.isAdded ? "bg-green-50/50" : ""}
                  >
                    <td className="px-3 py-1.5 text-gray-700">
                      {item.description}
                      {item.isAdded && (
                        <span className="ml-1.5 text-[10px] text-green-600 font-medium">
                          +added
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-gray-500">
                      {idx === 0 ? cat : ""}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-gray-500">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-gray-600">
                      {formatCurrency(item.unitCost)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-gray-900">
                      {formatCurrency(item.totalCost)}
                    </td>
                  </tr>
                ))
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-gray-50 font-medium">
                <td colSpan={4} className="px-3 py-2 text-right text-sm text-gray-700">
                  Total Cost
                </td>
                <td className="px-3 py-2 text-right font-mono text-sm font-semibold text-gray-900">
                  {formatCurrency(totalCost)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Components Tab */}
      {activeTab === "components" && realComponents && (
        <div className="space-y-3">
          {Object.entries(componentsByGroup)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([group, comps]) => (
              <div key={group} className="rounded-lg border border-border overflow-hidden">
                <div className="bg-gray-50 px-3 py-1.5 border-b border-border">
                  <span className="text-xs font-semibold text-gray-600 uppercase">{group}</span>
                  <span className="text-xs text-gray-400 ml-2">{comps.length} items</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/30">
                      <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase text-gray-400 w-8">#</th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase text-gray-400">Code</th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase text-gray-400">Description</th>
                      <th className="px-3 py-1.5 text-right text-[10px] font-medium uppercase text-gray-400">Qty</th>
                      <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase text-gray-400">UOM</th>
                      <th className="px-3 py-1.5 text-right text-[10px] font-medium uppercase text-gray-400">Scrap%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {comps.map((comp, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-3 py-1 text-xs font-mono text-gray-400">{comp.sequenceNo}</td>
                        <td className="px-3 py-1 text-xs font-mono text-indigo-600">{comp.stockCode}</td>
                        <td className="px-3 py-1 text-xs text-gray-700">{comp.description}</td>
                        <td className="px-3 py-1 text-right text-xs font-mono text-gray-600">
                          {comp.quantity}
                          {comp.fixedQuantity && (
                            <span className="ml-1 text-[9px] text-orange-500" title="Fixed quantity">F</span>
                          )}
                        </td>
                        <td className="px-3 py-1 text-xs text-gray-500">{comp.unitOfMeasure || "—"}</td>
                        <td className="px-3 py-1 text-right text-xs font-mono text-gray-400">
                          {comp.scrapPercent > 0 ? `${comp.scrapPercent}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          {realComponents.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-400">
              No BOM components found for this product type.
            </div>
          )}
        </div>
      )}

      {/* Operations Tab */}
      {activeTab === "operations" && realOperations && (
        <div className="space-y-3">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded border border-border bg-blue-50/50 p-2 text-center">
              <div className="text-lg font-semibold text-blue-700">{formatTime(totalRunMins)}</div>
              <div className="text-[10px] text-blue-500 uppercase font-medium">Run Time</div>
            </div>
            <div className="rounded border border-border bg-green-50/50 p-2 text-center">
              <div className="text-lg font-semibold text-green-700">{formatTime(totalLabourMins)}</div>
              <div className="text-[10px] text-green-500 uppercase font-medium">Labour</div>
            </div>
            <div className="rounded border border-border bg-orange-50/50 p-2 text-center">
              <div className="text-lg font-semibold text-orange-700">{formatTime(totalSetupMins)}</div>
              <div className="text-[10px] text-orange-500 uppercase font-medium">Setup</div>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase text-gray-400 w-8">#</th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase text-gray-400">Operation</th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase text-gray-400">Description</th>
                  <th className="px-3 py-1.5 text-right text-[10px] font-medium uppercase text-gray-400">Run</th>
                  <th className="px-3 py-1.5 text-right text-[10px] font-medium uppercase text-gray-400">Labour</th>
                  <th className="px-3 py-1.5 text-right text-[10px] font-medium uppercase text-gray-400">Setup</th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase text-gray-400">Machine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {realOperations.map((op, idx) => (
                  <tr key={idx} className={`hover:bg-gray-50/50 ${op.isSubcontract ? "bg-yellow-50/30" : ""}`}>
                    <td className="px-3 py-1 text-xs font-mono text-gray-400">{op.sequenceNo}</td>
                    <td className="px-3 py-1 text-xs font-mono text-indigo-600">
                      {op.operationRef}
                      {op.isSubcontract && (
                        <span className="ml-1 text-[9px] bg-yellow-100 text-yellow-700 px-1 rounded">SUB</span>
                      )}
                    </td>
                    <td className="px-3 py-1 text-xs text-gray-700">
                      {op.operationDescription || op.labourDescription || "—"}
                    </td>
                    <td className="px-3 py-1 text-right text-xs font-mono text-blue-600">{formatTime(op.runTimeMinutes)}</td>
                    <td className="px-3 py-1 text-right text-xs font-mono text-green-600">{formatTime(op.labourMinutes)}</td>
                    <td className="px-3 py-1 text-right text-xs font-mono text-orange-600">{formatTime(op.setupMinutes)}</td>
                    <td className="px-3 py-1 text-xs text-gray-500">{op.machineDescription || op.machineRef || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {realOperations.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-400">
              No operations found for this product type.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
