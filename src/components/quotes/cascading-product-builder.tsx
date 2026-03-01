"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { SpecOptionsForm } from "./spec-options-form"
import { BomPreview } from "./bom-preview"
import { calculateSellPrice, checkMarginFloor } from "@/lib/quote-calculations"
import type { CatalogueFamily, CatalogueType, CatalogueSpecField, ComputedBomLine, SpecSelections } from "@/lib/catalogue-types"
import { cn } from "@/lib/utils"
import { Wrench, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react"

type BuilderState = {
  step: number
  familyId: string
  typeId: string
  variantId: string
  specSelections: SpecSelections
  width: string
  height: string
  quantity: string
  marginPercent: string
  includesRd: boolean
  rdCostAmount: string
  isOptional: boolean
  bomPreview: ComputedBomLine[] | null
  computedCost: number
}

const STEPS = [
  "Family",
  "Type",
  "Variant",
  "Specs",
  "Dimensions",
  "BOM Preview",
  "Margin",
  "Review",
]

const initialState: BuilderState = {
  step: 0,
  familyId: "",
  typeId: "",
  variantId: "",
  specSelections: {},
  width: "",
  height: "",
  quantity: "1",
  marginPercent: "30",
  includesRd: false,
  rdCostAmount: "0",
  isOptional: false,
  bomPreview: null,
  computedCost: 0,
}

function formatCurrency(val: number) {
  return `£${val.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function CascadingProductBuilder({
  quoteId,
  onLineAdded,
}: {
  quoteId: string
  onLineAdded?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<BuilderState>(initialState)
  const [families, setFamilies] = useState<CatalogueFamily[]>([])
  const [typeDetail, setTypeDetail] = useState<(CatalogueType & { specFields: CatalogueSpecField[] }) | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [marginOverride, setMarginOverride] = useState(false)

  // Load families on open
  useEffect(() => {
    if (open && families.length === 0) {
      fetch("/api/catalogue/families")
        .then((r) => r.json())
        .then(setFamilies)
    }
  }, [open, families.length])

  // Load type detail when type is selected
  useEffect(() => {
    if (state.typeId) {
      setLoading(true)
      fetch(`/api/catalogue/types/${state.typeId}`)
        .then((r) => r.json())
        .then((data) => {
          setTypeDetail(data)
          // Pre-fill spec defaults
          const defaults: SpecSelections = {}
          for (const field of data.specFields || []) {
            const defaultChoice = field.choices?.find((c: { isDefault: boolean }) => c.isDefault)
            if (defaultChoice) defaults[field.code] = defaultChoice.value
          }
          setState((s) => ({ ...s, specSelections: { ...defaults, ...s.specSelections } }))
        })
        .finally(() => setLoading(false))
    }
  }, [state.typeId])

  // Pre-fill dimensions from variant defaults
  useEffect(() => {
    if (state.variantId && typeDetail) {
      const variant = typeDetail.variants?.find((v: { id: string }) => v.id === state.variantId)
      if (variant) {
        setState((s) => ({
          ...s,
          width: s.width || String(variant.defaultWidth || ""),
          height: s.height || String(variant.defaultHeight || ""),
        }))
      }
    }
  }, [state.variantId, typeDetail])

  function reset() {
    setState(initialState)
    setTypeDetail(null)
    setMarginOverride(false)
  }

  function handleClose() {
    setOpen(false)
    reset()
  }

  // Fetch BOM preview
  async function fetchBomPreview() {
    setLoading(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/lines/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: state.variantId,
          specSelections: state.specSelections,
          width: state.width ? parseInt(state.width) : null,
          height: state.height ? parseInt(state.height) : null,
        }),
      })
      const data = await res.json()
      setState((s) => ({
        ...s,
        bomPreview: data.computedBom,
        computedCost: data.computedCost,
      }))
    } finally {
      setLoading(false)
    }
  }

  // Submit the configured line
  async function handleSubmit() {
    setSaving(true)
    const qty = parseInt(state.quantity) || 1
    const mg = parseFloat(state.marginPercent) || 0

    const variant = typeDetail?.variants?.find((v: { id: string }) => v.id === state.variantId)
    const family = families.find((f) => f.id === state.familyId)
    const type = family?.types?.find((t) => t.id === state.typeId)

    const description = [
      family?.name,
      type?.name,
      variant?.name,
      state.width && state.height ? `${state.width}×${state.height}mm` : null,
    ]
      .filter(Boolean)
      .join(" — ")

    try {
      await fetch(`/api/quotes/${quoteId}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          dimensions: state.width && state.height ? `${state.width}x${state.height}` : null,
          quantity: qty,
          units: "nr",
          unitCost: state.computedCost,
          marginPercent: mg,
          isOptional: state.isOptional,
          marginOverride,
          specConfig: {
            variantId: state.variantId,
            width: state.width ? parseInt(state.width) : null,
            height: state.height ? parseInt(state.height) : null,
            specSelections: state.specSelections,
            computedBom: state.bomPreview,
            computedCost: state.computedCost,
            includesRd: state.includesRd,
            rdCostAmount: state.includesRd ? parseFloat(state.rdCostAmount) || 0 : 0,
          },
        }),
      })
      handleClose()
      if (onLineAdded) onLineAdded()
    } finally {
      setSaving(false)
    }
  }

  // Navigation
  function canNext(): boolean {
    switch (state.step) {
      case 0: return !!state.familyId
      case 1: return !!state.typeId
      case 2: return !!state.variantId
      case 3: return true // specs are optional
      case 4: return true // dimensions pre-filled
      case 5: return !!state.bomPreview
      case 6: {
        const mg = parseFloat(state.marginPercent) || 0
        return mg > 0 || marginOverride
      }
      default: return true
    }
  }

  function goNext() {
    if (state.step === 4) {
      // Moving to BOM Preview — fetch it
      fetchBomPreview()
    }
    setState((s) => ({ ...s, step: Math.min(s.step + 1, STEPS.length - 1) }))
  }

  function goBack() {
    setState((s) => ({ ...s, step: Math.max(s.step - 1, 0) }))
  }

  function goToStep(step: number) {
    if (step < state.step) {
      setState((s) => ({ ...s, step }))
    }
  }

  // Current selections for display
  const selectedFamily = families.find((f) => f.id === state.familyId)
  const selectedType = selectedFamily?.types?.find((t: { id: string }) => t.id === state.typeId)
  const selectedVariant = typeDetail?.variants?.find((v: { id: string }) => v.id === state.variantId)

  // Margin calculation
  const qty = parseInt(state.quantity) || 1
  const costTotal = state.computedCost * qty
  const mg = parseFloat(state.marginPercent) || 0
  const sellPrice = calculateSellPrice(costTotal, mg)
  const profit = sellPrice - costTotal
  const marginCheck = checkMarginFloor(mg)

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          <Wrench className="mr-1.5 h-4 w-4" />
          Configure Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-indigo-600" />
            Configure Product
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => goToStep(i)}
              disabled={i >= state.step}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap",
                i === state.step
                  ? "bg-indigo-100 text-indigo-700"
                  : i < state.step
                  ? "bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer"
                  : "bg-gray-100 text-gray-400"
              )}
            >
              {i < state.step ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className="flex items-center justify-center h-4 w-4 rounded-full bg-current/10 text-[10px]">
                  {i + 1}
                </span>
              )}
              {label}
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {/* Step 0: Family */}
          {state.step === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Select a product family:</p>
              <div className="grid grid-cols-3 gap-3">
                {families.map((family) => (
                  <button
                    key={family.id}
                    onClick={() => setState((s) => ({ ...s, familyId: family.id, typeId: "", variantId: "" }))}
                    className={cn(
                      "rounded-lg border-2 p-4 text-left transition-all hover:shadow-md",
                      state.familyId === family.id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-border hover:border-gray-300"
                    )}
                  >
                    <div className="text-sm font-semibold text-gray-900">{family.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {family.types.length} type{family.types.length !== 1 ? "s" : ""}
                    </div>
                    <Badge variant="secondary" className="mt-2 text-[10px]">{family.code}</Badge>
                  </button>
                ))}
              </div>
              {families.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-400">
                  No product families found. Seed the catalogue first.
                </div>
              )}
            </div>
          )}

          {/* Step 1: Type */}
          {state.step === 1 && selectedFamily && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Select a type within <span className="font-medium text-gray-700">{selectedFamily.name}</span>:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {selectedFamily.types.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setState((s) => ({ ...s, typeId: type.id, variantId: "", specSelections: {} }))}
                    className={cn(
                      "rounded-lg border-2 p-4 text-left transition-all hover:shadow-md",
                      state.typeId === type.id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-border hover:border-gray-300"
                    )}
                  >
                    <div className="text-sm font-semibold text-gray-900">{type.name}</div>
                    <Badge variant="secondary" className="mt-2 text-[10px]">{type.code}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Variant */}
          {state.step === 2 && typeDetail && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Select a variant of <span className="font-medium text-gray-700">{typeDetail.name}</span>:
              </p>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(typeDetail.variants || []).map((variant: { id: string; name: string; code: string; defaultWidth: number | null; defaultHeight: number | null }) => (
                    <button
                      key={variant.id}
                      onClick={() => setState((s) => ({ ...s, variantId: variant.id, width: "", height: "" }))}
                      className={cn(
                        "rounded-lg border-2 p-4 text-left transition-all hover:shadow-md",
                        state.variantId === variant.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-border hover:border-gray-300"
                      )}
                    >
                      <div className="text-sm font-semibold text-gray-900">{variant.name}</div>
                      {variant.defaultWidth && variant.defaultHeight && (
                        <div className="text-xs text-gray-500 mt-1">
                          {variant.defaultWidth}mm × {variant.defaultHeight}mm
                        </div>
                      )}
                      <Badge variant="secondary" className="mt-2 text-[10px]">{variant.code}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Specs */}
          {state.step === 3 && typeDetail && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Configure specifications for <span className="font-medium text-gray-700">{selectedVariant?.name}</span>:
              </p>
              <SpecOptionsForm
                specFields={(typeDetail.specFields || []).map((f: CatalogueSpecField) => ({
                  ...f,
                  choices: f.choices.map((c) => ({
                    ...c,
                    costModifier: Number(c.costModifier ?? 0),
                    costMultiplier: Number(c.costMultiplier ?? 1),
                  })),
                }))}
                selections={state.specSelections}
                onChange={(selections) => setState((s) => ({ ...s, specSelections: selections }))}
              />
            </div>
          )}

          {/* Step 4: Dimensions */}
          {state.step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Confirm or adjust dimensions for <span className="font-medium text-gray-700">{selectedVariant?.name}</span>:
              </p>
              <div className="flex items-end gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Width (mm)</Label>
                  <input
                    type="number"
                    value={state.width}
                    onChange={(e) => setState((s) => ({ ...s, width: e.target.value }))}
                    className="w-32 rounded border border-border px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={String(selectedVariant?.defaultWidth || "")}
                  />
                </div>
                <span className="pb-2 text-gray-400">×</span>
                <div className="space-y-1.5">
                  <Label className="text-xs">Height (mm)</Label>
                  <input
                    type="number"
                    value={state.height}
                    onChange={(e) => setState((s) => ({ ...s, height: e.target.value }))}
                    className="w-32 rounded border border-border px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={String(selectedVariant?.defaultHeight || "")}
                  />
                </div>
              </div>
              {selectedVariant?.defaultWidth && selectedVariant?.defaultHeight && (
                <p className="text-xs text-gray-400">
                  Default: {selectedVariant.defaultWidth}mm × {selectedVariant.defaultHeight}mm. Costs scale proportionally.
                </p>
              )}
            </div>
          )}

          {/* Step 5: BOM Preview */}
          {state.step === 5 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Computed Bill of Materials:</p>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-400">Computing BOM...</span>
                </div>
              ) : state.bomPreview ? (
                <BomPreview items={state.bomPreview} totalCost={state.computedCost} />
              ) : (
                <div className="py-8 text-center text-sm text-gray-400">
                  No BOM data available. Go back and try again.
                </div>
              )}
            </div>
          )}

          {/* Step 6: Margin */}
          {state.step === 6 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Set quantity, margin and R&D options:</p>

              <div className="flex items-end gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity</Label>
                  <input
                    type="number"
                    min="1"
                    value={state.quantity}
                    onChange={(e) => setState((s) => ({ ...s, quantity: e.target.value }))}
                    className="w-24 rounded border border-border px-2.5 py-1.5 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Margin %</Label>
                  <input
                    type="number"
                    value={state.marginPercent}
                    onChange={(e) => {
                      setState((s) => ({ ...s, marginPercent: e.target.value }))
                      setMarginOverride(false)
                    }}
                    className={cn(
                      "w-24 rounded border px-2.5 py-1.5 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
                      marginCheck.belowFloor ? "border-amber-400 bg-amber-50" : "border-border"
                    )}
                    placeholder="30"
                  />
                </div>
                <div className="flex items-center gap-2 pb-1.5">
                  <input
                    type="checkbox"
                    id="builderIsOptional"
                    checked={state.isOptional}
                    onChange={(e) => setState((s) => ({ ...s, isOptional: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="builderIsOptional" className="text-xs whitespace-nowrap">Optional Extra</Label>
                </div>
              </div>

              {/* Margin floor warning */}
              {marginCheck.belowFloor && (
                <div className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                  <span className="text-amber-800">
                    Margin {mg}% is below {marginCheck.floor}% minimum.
                  </span>
                  {!marginOverride ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto text-xs border-amber-300 text-amber-700"
                      onClick={() => setMarginOverride(true)}
                    >
                      Override
                    </Button>
                  ) : (
                    <span className="ml-auto text-xs font-medium text-amber-600">Overridden</span>
                  )}
                </div>
              )}

              {/* R&D */}
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includesRd"
                    checked={state.includesRd}
                    onChange={(e) => setState((s) => ({ ...s, includesRd: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="includesRd" className="text-xs font-medium">
                    Includes R&D Cost
                  </Label>
                </div>
                {state.includesRd && (
                  <div className="flex items-end gap-3 pl-6">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-gray-500">R&D Cost Amount</Label>
                      <input
                        type="number"
                        value={state.rdCostAmount}
                        onChange={(e) => setState((s) => ({ ...s, rdCostAmount: e.target.value }))}
                        className="w-28 rounded border border-border px-2.5 py-1.5 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 pb-2">
                      This amount is embedded in cost but not shown to client on PDF.
                    </p>
                  </div>
                )}
              </div>

              {/* Live totals */}
              <div className="rounded-lg bg-gray-50 p-3 flex items-center gap-6 text-sm">
                <div>
                  <span className="text-xs text-gray-500">Unit Cost</span>
                  <div className="font-mono font-medium">{formatCurrency(state.computedCost)}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Cost Total ({qty}×)</span>
                  <div className="font-mono font-medium">{formatCurrency(costTotal)}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Sell Price</span>
                  <div className="font-mono font-semibold text-blue-700">{formatCurrency(sellPrice)}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Profit</span>
                  <div className={cn("font-mono font-medium", profit >= 0 ? "text-green-700" : "text-red-600")}>
                    {formatCurrency(profit)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Review */}
          {state.step === 7 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Review your configured product:</p>
              <div className="rounded-lg border border-border divide-y divide-border">
                <div className="flex justify-between px-4 py-2">
                  <span className="text-xs text-gray-500">Family</span>
                  <span className="text-sm font-medium">{selectedFamily?.name}</span>
                </div>
                <div className="flex justify-between px-4 py-2">
                  <span className="text-xs text-gray-500">Type</span>
                  <span className="text-sm font-medium">{selectedType?.name}</span>
                </div>
                <div className="flex justify-between px-4 py-2">
                  <span className="text-xs text-gray-500">Variant</span>
                  <span className="text-sm font-medium">{selectedVariant?.name}</span>
                </div>
                <div className="flex justify-between px-4 py-2">
                  <span className="text-xs text-gray-500">Dimensions</span>
                  <span className="text-sm font-mono">{state.width || "—"}mm × {state.height || "—"}mm</span>
                </div>
                {Object.entries(state.specSelections).length > 0 && (
                  <div className="px-4 py-2">
                    <span className="text-xs text-gray-500 block mb-1">Specifications</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(state.specSelections).map(([code, value]) => (
                        <Badge key={code} variant="secondary" className="text-[10px]">
                          {code}: {value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between px-4 py-2">
                  <span className="text-xs text-gray-500">Quantity</span>
                  <span className="text-sm font-mono">{qty}</span>
                </div>
                <div className="flex justify-between px-4 py-2">
                  <span className="text-xs text-gray-500">Unit Cost (BOM)</span>
                  <span className="text-sm font-mono">{formatCurrency(state.computedCost)}</span>
                </div>
                <div className="flex justify-between px-4 py-2">
                  <span className="text-xs text-gray-500">Margin</span>
                  <span className="text-sm font-mono">{mg}%</span>
                </div>
                <div className="flex justify-between px-4 py-2 bg-blue-50/50">
                  <span className="text-xs font-medium text-gray-700">Sell Price</span>
                  <span className="text-sm font-mono font-semibold text-blue-700">{formatCurrency(sellPrice)}</span>
                </div>
                {state.includesRd && (
                  <div className="flex justify-between px-4 py-2 bg-amber-50/50">
                    <span className="text-xs text-amber-700">R&D Cost (embedded)</span>
                    <span className="text-sm font-mono text-amber-700">{formatCurrency(parseFloat(state.rdCostAmount) || 0)}</span>
                  </div>
                )}
                {state.isOptional && (
                  <div className="px-4 py-2 bg-amber-50/30">
                    <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">Optional Extra</Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goBack}
            disabled={state.step === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          {state.step < STEPS.length - 1 ? (
            <Button
              size="sm"
              onClick={goNext}
              disabled={!canNext() || loading}
            >
              {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={saving || (marginCheck.belowFloor && !marginOverride)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {saving ? "Adding..." : "Add to Quote"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
