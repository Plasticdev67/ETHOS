"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/utils"
import { Plus, Trash2, AlertTriangle, ShieldAlert, Wrench, ChevronDown, ChevronRight } from "lucide-react"
import {
  calculateCostTotal,
  calculateSellPrice,
  calculateRdAdjustedMargin,
  checkMarginFloor,
  checkCostDeviation,
  UNIT_OPTIONS,
} from "@/lib/quote-calculations"

type CatalogueItem = {
  id: string
  partCode: string
  description: string
  guideUnitCost: string | number | null
  guideMarginPercent: string | number | null
  defaultUnits: string | null
}

type QuoteLine = {
  id: string
  description: string
  dimensions: string | null
  quantity: number
  units: string | null
  unitCost: string | number | null
  costTotal: string | number | null
  marginPercent: string | number | null
  sellPrice: string | number | null
  isOptional: boolean
  marginOverride: boolean
  sortOrder: number
  product?: { partCode: string; description: string } | null
  catalogueItem?: { partCode: string; description: string; guideUnitCost: string | number | null } | null
  spec?: {
    id: string
    variantId: string
    width: number | null
    height: number | null
    specSelections: Record<string, string>
    computedBom: { description: string; category: string; quantity: number; unitCost: number; totalCost: number }[]
    computedCost: string | number
    includesRd: boolean
    rdCostAmount: string | number
    variant: { code: string; name: string; type: { name: string; family: { name: string } } }
  } | null
}

export function QuoteLineForm({
  quoteId,
  catalogueItems,
  onLineAdded,
}: {
  quoteId: string
  catalogueItems: CatalogueItem[]
  onLineAdded?: () => void
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [description, setDescription] = useState("")
  const [dimensions, setDimensions] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [units, setUnits] = useState("")
  const [unitCost, setUnitCost] = useState("")
  const [marginPercent, setMarginPercent] = useState("30")
  const [isOptional, setIsOptional] = useState(false)
  const [catalogueItemId, setCatalogueItemId] = useState("")
  const [marginOverride, setMarginOverride] = useState(false)

  // Current catalogue item for deviation checks
  const selectedCatalogue = catalogueItemId
    ? catalogueItems.find((c) => c.id === catalogueItemId)
    : null

  function handleCatalogueSelect(id: string) {
    setCatalogueItemId(id)
    if (id) {
      const item = catalogueItems.find((c) => c.id === id)
      if (item) {
        setDescription(item.description)
        setUnitCost(String(item.guideUnitCost || ""))
        setMarginPercent(String(item.guideMarginPercent || "30"))
        setUnits(item.defaultUnits || "")
      }
    }
  }

  // Live calculations
  const uc = Number(unitCost) || 0
  const qty = Number(quantity) || 1
  const mg = Number(marginPercent) || 0

  const costTotal = calculateCostTotal(uc, qty)
  const sellPrice = calculateSellPrice(costTotal, mg)
  const profit = sellPrice - costTotal

  // Warnings
  const marginCheck = checkMarginFloor(mg)
  const costCheck = checkCostDeviation(
    uc,
    selectedCatalogue ? Number(selectedCatalogue.guideUnitCost) : null
  )

  async function handleSubmit() {
    if (!description.trim()) return

    // Block if margin below floor and not overridden
    if (marginCheck.belowFloor && !marginOverride) return

    setSaving(true)
    try {
      await fetch(`/api/quotes/${quoteId}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogueItemId: catalogueItemId || null,
          description,
          dimensions: dimensions || null,
          quantity: qty,
          units: units || null,
          unitCost: uc,
          marginPercent: mg,
          isOptional,
          marginOverride,
        }),
      })
      // Reset form
      setDescription("")
      setDimensions("")
      setQuantity("1")
      setUnits("")
      setUnitCost("")
      setMarginPercent("30")
      setIsOptional(false)
      setCatalogueItemId("")
      setMarginOverride(false)
      if (onLineAdded) onLineAdded()
      else router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    "w-full rounded border border-border px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50/30 p-4 space-y-4">
      {/* Row 1: Catalogue + Description + Dimensions */}
      <div className="flex items-end gap-3">
        <div className="w-48 space-y-1">
          <Label className="text-xs">From Catalogue</Label>
          <select
            value={catalogueItemId}
            onChange={(e) => handleCatalogueSelect(e.target.value)}
            className="w-full rounded border border-border bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Custom line item...</option>
            {catalogueItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.partCode} — {item.description}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Description *</Label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder="Line item description..."
          />
        </div>
        <div className="w-40 space-y-1">
          <Label className="text-xs">Dimensions</Label>
          <input
            value={dimensions}
            onChange={(e) => setDimensions(e.target.value)}
            className={inputClass}
            placeholder="e.g. 2400x1200"
          />
        </div>
      </div>

      {/* Row 2: Qty, Units, Unit Cost, Margin% */}
      <div className="flex items-end gap-3">
        <div className="w-20 space-y-1">
          <Label className="text-xs">Qty</Label>
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={`${inputClass} text-right`}
          />
        </div>
        <div className="w-24 space-y-1">
          <Label className="text-xs">Units</Label>
          <select
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            className="w-full rounded border border-border bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">—</option>
            {UNIT_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-28 space-y-1">
          <Label className="text-xs">Unit Cost</Label>
          <input
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            className={`${inputClass} text-right`}
            placeholder="0.00"
          />
        </div>
        <div className="w-24 space-y-1">
          <Label className="text-xs">Margin %</Label>
          <input
            value={marginPercent}
            onChange={(e) => {
              setMarginPercent(e.target.value)
              setMarginOverride(false) // Reset override when margin changes
            }}
            className={`${inputClass} text-right ${marginCheck.belowFloor ? "border-amber-400 bg-amber-50" : ""}`}
            placeholder="30"
          />
        </div>
        <div className="flex items-center gap-2 pb-1">
          <input
            type="checkbox"
            id="isOptional"
            checked={isOptional}
            onChange={(e) => setIsOptional(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="isOptional" className="text-xs whitespace-nowrap">
            Optional Extra
          </Label>
        </div>
      </div>

      {/* Warnings */}
      {(marginCheck.belowFloor || costCheck.deviates) && (
        <div className="space-y-2">
          {marginCheck.belowFloor && (
            <div className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-amber-800">
                Margin {mg}% is below the {marginCheck.floor}% minimum.
              </span>
              {!marginOverride && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => setMarginOverride(true)}
                >
                  Override
                </Button>
              )}
              {marginOverride && (
                <span className="ml-auto text-xs font-medium text-amber-600">Overridden</span>
              )}
            </div>
          )}
          {costCheck.deviates && (
            <div className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="text-blue-800">
                Unit cost is {costCheck.percentage}% {costCheck.direction} the catalogue guide ({formatCurrency(Number(selectedCatalogue?.guideUnitCost))}).
              </span>
            </div>
          )}
        </div>
      )}

      {/* Live Totals + Submit */}
      <div className="flex items-center justify-between pt-2 border-t border-blue-200">
        <div className="flex items-center gap-6 text-sm">
          <span className="text-gray-500">
            Cost Total: <span className="font-mono font-medium text-gray-900">{formatCurrency(costTotal)}</span>
          </span>
          <span className="text-gray-500">
            Sell Price: <span className="font-mono font-medium text-blue-700">{formatCurrency(sellPrice)}</span>
          </span>
          <span className="text-gray-500">
            Profit:{" "}
            <span className={`font-mono font-medium ${profit >= 0 ? "text-green-700" : "text-red-600"}`}>
              {formatCurrency(profit)}
            </span>
          </span>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={saving || !description.trim() || (marginCheck.belowFloor && !marginOverride)}
          size="sm"
        >
          <Plus className="mr-1 h-4 w-4" />
          {saving ? "Adding..." : "Add Line"}
        </Button>
      </div>
    </div>
  )
}

export function QuoteLineRow({
  line,
  quoteId,
  isDraft,
  onDelete,
}: {
  line: QuoteLine
  quoteId: string
  isDraft?: boolean
  onDelete?: () => void
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [specExpanded, setSpecExpanded] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/quotes/${quoteId}/lines/${line.id}`, { method: "DELETE" })
      if (onDelete) onDelete()
      else router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  const costTotal = Number(line.costTotal || 0)
  const sellPrice = Number(line.sellPrice || 0)
  const margin = Number(line.marginPercent || 0)
  const hasSpec = !!line.spec

  const rdCost = hasSpec ? Number(line.spec!.rdCostAmount) || 0 : 0
  const rdMargins = hasSpec && line.spec!.includesRd
    ? calculateRdAdjustedMargin(costTotal, sellPrice, rdCost)
    : null

  return (
    <>
      <tr className={`hover:bg-gray-50 transition-colors ${line.isOptional ? "bg-gray-50/50" : ""}`}>
        <td className="px-4 py-2.5 text-sm text-gray-900">
          {line.product?.partCode || line.catalogueItem?.partCode || (hasSpec ? line.spec!.variant.code : "—")}
        </td>
        <td className="px-4 py-2.5 text-sm text-gray-900">
          <div>
            {line.description}
            {line.dimensions && (
              <span className="ml-2 text-xs text-gray-400">{line.dimensions}</span>
            )}
            {hasSpec && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-200">
                <Wrench className="h-2.5 w-2.5" />
                Configured
              </span>
            )}
            {line.isOptional && (
              <span className="ml-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 uppercase">
                Optional
              </span>
            )}
            {line.marginOverride && (
              <span className="ml-1 inline-block rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 uppercase">
                Override
              </span>
            )}
          </div>
          {hasSpec && (
            <button
              onClick={() => setSpecExpanded(!specExpanded)}
              className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-indigo-600 hover:text-indigo-800"
            >
              {specExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              View Spec
            </button>
          )}
        </td>
        <td className="px-4 py-2.5 text-center font-mono text-sm">{line.quantity}</td>
        <td className="px-4 py-2.5 text-left text-xs text-gray-500">{line.units || "—"}</td>
        <td className="px-4 py-2.5 text-right font-mono text-sm text-gray-600">
          {formatCurrency(line.unitCost)}
        </td>
        <td className="px-4 py-2.5 text-right font-mono text-sm text-gray-900">
          {formatCurrency(costTotal)}
        </td>
        <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-600">
          <span className={margin < 25 ? "text-amber-600 font-medium" : ""}>
            {margin.toFixed(1)}%
          </span>
          {rdMargins && (
            <div className="text-[9px] text-indigo-500 mt-0.5" title="Apparent margin (excl R&D)">
              ({rdMargins.apparentMargin.toFixed(1)}% apparent)
            </div>
          )}
        </td>
        <td className="px-4 py-2.5 text-right font-mono text-sm text-gray-600">
          {line.quantity > 1 ? formatCurrency(sellPrice / line.quantity) : "—"}
        </td>
        <td className="px-4 py-2.5 text-right font-mono text-sm font-medium text-blue-700">
          {formatCurrency(sellPrice)}
        </td>
        {isDraft && (
          <td className="px-4 py-2.5">
            <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
            </Button>
          </td>
        )}
      </tr>
      {/* Expandable spec detail row */}
      {hasSpec && specExpanded && (
        <tr>
          <td colSpan={isDraft ? 10 : 9} className="px-4 py-2 bg-indigo-50/20">
            <div className="rounded border border-indigo-100 bg-indigo-50/30 p-2.5 space-y-2 text-[11px]">
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium">{line.spec!.variant.type.family.name}</span>
                <span className="text-gray-300">→</span>
                <span>{line.spec!.variant.type.name}</span>
                <span className="text-gray-300">→</span>
                <span className="font-mono text-indigo-600">{line.spec!.variant.code}</span>
              </div>
              {line.spec!.width && line.spec!.height && (
                <div className="text-gray-500">
                  Dimensions: <span className="font-mono">{line.spec!.width}mm × {line.spec!.height}mm</span>
                </div>
              )}
              {Object.keys(line.spec!.specSelections).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(line.spec!.specSelections).map(([code, value]) => (
                    <span key={code} className="inline-block rounded bg-white border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">
                      {code}: <span className="font-medium">{value}</span>
                    </span>
                  ))}
                </div>
              )}
              {line.spec!.computedBom && line.spec!.computedBom.length > 0 && (
                <div className="pt-1 border-t border-indigo-100">
                  <span className="text-[10px] font-medium text-gray-500 uppercase">
                    BOM ({line.spec!.computedBom.length} items) — Cost: {formatCurrency(line.spec!.computedCost)}
                  </span>
                </div>
              )}
              {line.spec!.includesRd && rdMargins && (
                <div className="pt-1 border-t border-indigo-100 flex items-center gap-3">
                  <span className="text-amber-700">R&D: {formatCurrency(rdCost)}</span>
                  <span className="text-green-700">True Margin: {rdMargins.trueMargin.toFixed(1)}%</span>
                  <span className="text-blue-700">Apparent Margin: {rdMargins.apparentMargin.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
