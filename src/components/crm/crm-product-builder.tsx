"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  CatalogueFamily,
  CatalogueType,
  CatalogueSpecField,
  ComputedBomLine,
  SpecSelections,
} from "@/lib/catalogue-types"
import {
  defaultSimpleConfig,
  HANDING_OPTIONS,
  SIMPLE_LOCK_OPTIONS,
  PAINT_FINISH_OPTIONS,
  FIXINGS_OPTIONS,
  COMMON_RAL_COLOURS,
} from "@/lib/product-config-types"
import type { SimpleProductConfig } from "@/lib/product-config-types"
import { cn } from "@/lib/utils"
import {
  Wrench,
  Loader2,
  AlertTriangle,
  Lightbulb,
  Plus,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────────

type CrmLineData = {
  description: string
  type: string
  quantity: number
  unitCost: string
  classification: string
  variantId?: string
  width?: number
  height?: number
  depth?: number
  leafCount?: number
  openingDirection?: string
  clearOpening?: number
  structuralOpening?: number
  estimatedWeight?: number
  specSelections?: Record<string, string>
  computedBom?: ComputedBomLine[]
  computedCost?: number
  transomeConfig?: { enabled: boolean; height: number | null }
  ventConfig?: unknown
  lockConfig?: { lockType: string }
  finishConfig?: { ralColour: string; paintFinish: string }
  featureTags?: { name: string; enabled: boolean }[]
  // Simplified fields
  handing?: string
  lock?: string
  colour?: string
  paintFinish?: string
  fixings?: string
  features?: Record<string, boolean>
  notes?: string
}

type BuilderMode = "product" | "manual"

type ProductSelection = {
  familyId: string
  typeId: string
  variantId: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(val: number) {
  return `£${val.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── RAL Colour Dropdown ────────────────────────────────────────────────────────

function RalColourSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (val: string) => void
}) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)

  const filtered = useMemo(
    () =>
      COMMON_RAL_COLOURS.filter(
        (r) =>
          !search ||
          r.code.toLowerCase().includes(search.toLowerCase()) ||
          r.name.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  )

  const selected = COMMON_RAL_COLOURS.find((r) => r.code === value)

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Colour</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex items-center gap-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "hover:bg-accent hover:text-accent-foreground text-left",
            !value && "text-muted-foreground"
          )}
        >
          {selected ? (
            <>
              <span
                className="h-4 w-4 rounded-sm border border-gray-300 shrink-0"
                style={{ backgroundColor: selected.hex }}
              />
              <span className="truncate">
                {selected.code} — {selected.name}
              </span>
            </>
          ) : (
            "Select colour..."
          )}
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-white shadow-lg">
            <div className="p-2 border-b border-border">
              <Input
                placeholder="Search RAL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs"
                autoFocus
              />
            </div>
            <div className="max-h-[200px] overflow-y-auto p-1">
              <button
                type="button"
                onClick={() => {
                  onChange("")
                  setOpen(false)
                  setSearch("")
                }}
                className="flex items-center gap-2 w-full rounded px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
              >
                Not specified
              </button>
              {filtered.map((ral) => (
                <button
                  key={ral.code}
                  type="button"
                  onClick={() => {
                    onChange(ral.code)
                    setOpen(false)
                    setSearch("")
                  }}
                  className={cn(
                    "flex items-center gap-2 w-full rounded px-2 py-1.5 text-xs text-left",
                    value === ral.code
                      ? "bg-indigo-50 text-indigo-700"
                      : "hover:bg-gray-100"
                  )}
                >
                  <span
                    className="h-4 w-4 rounded-sm border border-gray-300 shrink-0"
                    style={{ backgroundColor: ral.hex }}
                  />
                  <span className="font-mono font-medium">{ral.code.replace("RAL ", "")}</span>
                  <span className="text-gray-500 truncate">{ral.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Feature Toggle ─────────────────────────────────────────────────────────────

function FeatureToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className={cn(
      "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-all",
      checked
        ? "border-indigo-300 bg-indigo-50 shadow-sm"
        : "border-border bg-white hover:border-gray-300"
    )}>
      <Switch checked={checked} onCheckedChange={onChange} />
      <span className={cn(
        "text-sm",
        checked ? "font-medium text-indigo-700" : "text-gray-700"
      )}>
        {label}
      </span>
    </label>
  )
}

// ─── Main Export ─────────────────────────────────────────────────────────────────

export type QuoteLineEditData = {
  id: string
  variantId?: string | null
  description?: string
  type?: string
  quantity?: number
  unitCost?: string | number
  classification?: string
  width?: number | null
  height?: number | null
  openingDirection?: string | null
  lockConfig?: { lockType?: string } | null
  finishConfig?: { ralColour?: string; paintFinish?: string } | null
  featureTags?: { name: string; enabled: boolean }[] | null
  transomeConfig?: { enabled?: boolean; height?: number | null } | null
  notes?: string | null
}

export function CrmProductBuilder({
  opportunityId,
  open,
  onOpenChange,
  onLineAdded,
  onLineUpdated,
  editingLine,
  defaultClassification = "STANDARD",
}: {
  opportunityId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onLineAdded: (data: CrmLineData) => void
  onLineUpdated?: (lineId: string, data: CrmLineData) => void
  editingLine?: QuoteLineEditData | null
  defaultClassification?: "STANDARD" | "INNOVATE_TO_ORDER"
}) {
  const [mode, setMode] = useState<BuilderMode>("product")
  const [saving, setSaving] = useState(false)

  // Product selection state
  const [families, setFamilies] = useState<CatalogueFamily[]>([])
  const [typeDetail, setTypeDetail] = useState<(CatalogueType & { specFields: CatalogueSpecField[] }) | null>(null)
  const [loading, setLoading] = useState(false)
  const [product, setProduct] = useState<ProductSelection>({ familyId: "", typeId: "", variantId: "" })

  // Simplified config
  const [config, setConfig] = useState<SimpleProductConfig>({ ...defaultSimpleConfig })
  const [quantity, setQuantity] = useState("1")
  const [classification, setClassification] = useState<"STANDARD" | "INNOVATE_TO_ORDER">(defaultClassification)
  const [costOverride, setCostOverride] = useState("")

  // BOM preview state
  const [bomPreview, setBomPreview] = useState<ComputedBomLine[] | null>(null)
  const [bomTotalCost, setBomTotalCost] = useState<number | null>(null)
  const [bomLoading, setBomLoading] = useState(false)
  const [bomExpanded, setBomExpanded] = useState(true)
  const [unpricedOverrides, setUnpricedOverrides] = useState<Record<number, string>>({})
  const [costAdjustment, setCostAdjustment] = useState("")
  const [labourCost, setLabourCost] = useState<number | null>(null)
  const [labourHours, setLabourHours] = useState<number | null>(null)

  // Manual item state
  const [manualDescription, setManualDescription] = useState("")
  const [manualUnitPrice, setManualUnitPrice] = useState("")
  const [manualQuantity, setManualQuantity] = useState("1")
  const [manualNotes, setManualNotes] = useState("")

  // Load families on open
  useEffect(() => {
    if (open && families.length === 0) {
      fetch("/api/catalogue/families")
        .then((r) => r.json())
        .then(setFamilies)
    }
  }, [open])

  // Load type detail when type is selected
  useEffect(() => {
    if (product.typeId) {
      setLoading(true)
      fetch(`/api/catalogue/types/${product.typeId}`)
        .then((r) => r.json())
        .then(setTypeDetail)
        .finally(() => setLoading(false))
    }
  }, [product.typeId])

  // Pre-fill dimensions from variant defaults (skip in edit mode — dimensions come from editingLine)
  useEffect(() => {
    if (editingLine) return // Don't override edit data with defaults
    if (product.variantId && typeDetail) {
      const variant = typeDetail.variants?.find((v: { id: string }) => v.id === product.variantId)
      if (variant) {
        setConfig((prev) => ({
          ...prev,
          width: prev.width || variant.defaultWidth || null,
          height: prev.height || variant.defaultHeight || null,
        }))
      }
    }
  }, [product.variantId, typeDetail, editingLine])

  // Edit mode: pre-fill state from existing quote line
  useEffect(() => {
    if (!open || !editingLine?.variantId) return
    // Fetch variant info to get family/type IDs
    fetch(`/api/catalogue/variants/${editingLine.variantId}`)
      .then((r) => r.json())
      .then((variant) => {
        if (variant.error) return
        const typeId = variant.typeId || variant.type?.id
        const familyId = variant.type?.familyId || variant.type?.family?.id
        if (typeId && familyId) {
          setProduct({ familyId, typeId, variantId: editingLine.variantId! })
        }
      })
    // Pre-fill config from line data
    const features = editingLine.featureTags || []
    const featureMap = Object.fromEntries(features.map((f) => [f.name, f.enabled]))
    setConfig({
      width: editingLine.width || null,
      height: editingLine.height || null,
      handing: (editingLine.openingDirection as SimpleProductConfig["handing"]) || "",
      lock: editingLine.lockConfig?.lockType || "",
      colour: editingLine.finishConfig?.ralColour || "",
      paintFinish: editingLine.finishConfig?.paintFinish || "",
      fixings: "",
      pullHandles: featureMap["Pull Handles"] || false,
      doorCloser: featureMap["Door Closer"] || false,
      doorStay: featureMap["Door Stay"] || false,
      kickPlates: featureMap["Kick Plates"] || false,
      transom: featureMap["Transom"] || editingLine.transomeConfig?.enabled || false,
      transomHeight: editingLine.transomeConfig?.height || null,
      earthing: featureMap["Earthing"] || false,
      notes: editingLine.notes || "",
    })
    setQuantity(String(editingLine.quantity || 1))
    setClassification((editingLine.classification as "STANDARD" | "INNOVATE_TO_ORDER") || defaultClassification)
    if (editingLine.unitCost) {
      setCostOverride(String(editingLine.unitCost))
    }
  }, [open, editingLine, defaultClassification])

  // Auto-fetch BOM preview when variant + dimensions are ready
  const fetchBomPreview = useCallback(async () => {
    if (!product.variantId || !config.width || !config.height) {
      setBomPreview(null)
      setBomTotalCost(null)
      return
    }

    setBomLoading(true)
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: product.variantId,
          specSelections: {},
          width: config.width,
          height: config.height,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setBomPreview(data.computedBom || [])
        setBomTotalCost(data.computedCost ?? null)
        setLabourCost(data.labourCost ?? null)
        setLabourHours(data.totalLabourHours ?? null)
        // Reset manual overrides when BOM reloads
        setUnpricedOverrides({})
        setCostAdjustment("")
      }
    } catch {
      // Silently fail — BOM preview is optional
    } finally {
      setBomLoading(false)
    }
  }, [product.variantId, config.width, config.height, opportunityId])

  useEffect(() => {
    const timer = setTimeout(fetchBomPreview, 400) // debounce
    return () => clearTimeout(timer)
  }, [fetchBomPreview])

  function updateConfig(patch: Partial<SimpleProductConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }))
  }

  function reset() {
    setMode("product")
    setProduct({ familyId: "", typeId: "", variantId: "" })
    setConfig({ ...defaultSimpleConfig })
    setQuantity("1")
    setClassification(defaultClassification)
    setCostOverride("")
    setTypeDetail(null)
    setBomPreview(null)
    setBomTotalCost(null)
    setBomExpanded(true)
    setUnpricedOverrides({})
    setCostAdjustment("")
    setLabourCost(null)
    setLabourHours(null)
    setManualDescription("")
    setManualUnitPrice("")
    setManualQuantity("1")
    setManualNotes("")
  }

  function handleClose() {
    onOpenChange(false)
    reset()
  }

  // ─── Derived values ─────────────────────────────────────────────────────────

  const selectedFamily = families.find((f) => f.id === product.familyId)
  const selectedType = selectedFamily?.types?.find((t: { id: string }) => t.id === product.typeId)
  const selectedVariant = typeDetail?.variants?.find((v: { id: string }) => v.id === product.variantId)

  // Adjusted BOM total: base BOM + labour + manual prices for unpriced items + flat adjustment
  const adjustedBomTotal = useMemo(() => {
    if (bomTotalCost === null || !bomPreview) return null
    const unpricedExtra = Object.entries(unpricedOverrides).reduce((sum, [indexStr, val]) => {
      const index = parseInt(indexStr)
      const price = parseFloat(val)
      if (isNaN(price) || price <= 0 || !bomPreview[index]) return sum
      return sum + price * bomPreview[index].quantity
    }, 0)
    const adjustment = parseFloat(costAdjustment) || 0
    const labour = labourCost ?? 0
    return bomTotalCost + labour + unpricedExtra + adjustment
  }, [bomTotalCost, bomPreview, unpricedOverrides, costAdjustment, labourCost])

  const isOversized =
    (config.width && config.width > 5000) || (config.height && config.height > 4000)

  const doorLeafHeight =
    config.transom && config.transomHeight && config.height
      ? config.height - config.transomHeight
      : null

  // ─── Submit handlers ────────────────────────────────────────────────────────

  async function handleSubmitProduct() {
    setSaving(true)
    const qty = parseInt(quantity) || 1

    const description = [
      selectedFamily?.name,
      selectedType?.name,
      selectedVariant?.name,
      config.width && config.height
        ? `${config.width}×${config.height}mm`
        : null,
    ]
      .filter(Boolean)
      .join(" — ")

    const featureList = [
      config.pullHandles && "Pull Handles",
      config.doorCloser && "Door Closer",
      config.doorStay && "Door Stay",
      config.kickPlates && "Kick Plates",
      config.transom && "Transom",
      config.earthing && "Earthing",
    ].filter(Boolean)

    const lineData: CrmLineData = {
      description,
      type: "PRODUCT",
      quantity: qty,
      unitCost: costOverride || String(adjustedBomTotal ?? bomTotalCost ?? 0),
      classification,
      variantId: product.variantId || undefined,
      width: config.width || undefined,
      height: config.height || undefined,
      handing: config.handing || undefined,
      lock: config.lock || undefined,
      colour: config.colour || undefined,
      paintFinish: config.paintFinish || undefined,
      fixings: config.fixings || undefined,
      features: {
        pullHandles: config.pullHandles,
        doorCloser: config.doorCloser,
        doorStay: config.doorStay,
        kickPlates: config.kickPlates,
        transom: config.transom,
        earthing: config.earthing,
      },
      transomeConfig: config.transom
        ? { enabled: true, height: config.transomHeight }
        : undefined,
      lockConfig: config.lock ? { lockType: config.lock } : undefined,
      finishConfig: config.colour || config.paintFinish
        ? { ralColour: config.colour, paintFinish: config.paintFinish }
        : undefined,
      featureTags: featureList.map((name) => ({ name: name as string, enabled: true })),
      computedBom: bomPreview || undefined,
      computedCost: bomTotalCost ?? undefined,
      notes: config.notes || undefined,
      openingDirection: config.handing || undefined,
    }

    try {
      if (editingLine && onLineUpdated) {
        onLineUpdated(editingLine.id, lineData)
      } else {
        onLineAdded(lineData)
      }
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmitManual() {
    setSaving(true)
    const qty = parseInt(manualQuantity) || 1
    const unitPrice = parseFloat(manualUnitPrice) || 0

    try {
      onLineAdded({
        description: manualDescription,
        type: "MANUAL",
        quantity: qty,
        unitCost: String(unitPrice),
        classification: "STANDARD",
        notes: manualNotes || undefined,
      })
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  // ─── Validation ─────────────────────────────────────────────────────────────

  const canSubmitProduct = product.variantId && config.width && config.height
  const canSubmitManual = manualDescription.trim() && manualUnitPrice

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(true) }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {defaultClassification === "INNOVATE_TO_ORDER" ? (
              <>
                <Lightbulb className="h-5 w-5 text-orange-600" />
                {editingLine ? "Edit Quote Line" : "Add Quote Line"}
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5">
                  ITO
                </Badge>
              </>
            ) : (
              <>
                <Wrench className="h-5 w-5 text-indigo-600" />
                {editingLine ? "Edit Quote Line" : "Add Quote Line"}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Mode Tabs (hidden in edit mode) */}
        {!editingLine && <div className="flex gap-1 p-1 rounded-lg bg-gray-100 mb-4">
          <button
            onClick={() => setMode("product")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
              mode === "product"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Wrench className="h-4 w-4" />
            Configure Product
          </button>
          <button
            onClick={() => setMode("manual")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
              mode === "manual"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <FileText className="h-4 w-4" />
            Manual Item
          </button>
        </div>}

        {/* ─── Manual Item Mode ──────────────────────────────────────────────── */}
        {mode === "manual" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Description *</Label>
              <Input
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="e.g. Site survey, delivery charge, bespoke bracket..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Unit Price (&pound;) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualUnitPrice}
                  onChange={(e) => setManualUnitPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={manualQuantity}
                  onChange={(e) => setManualQuantity(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Additional details..."
                rows={3}
              />
            </div>

            {/* Totals */}
            {manualUnitPrice && (
              <div className="rounded-lg bg-gray-50 p-3 flex items-center gap-6 text-sm">
                <div>
                  <span className="text-xs text-gray-500">Unit Price</span>
                  <div className="font-mono font-medium">{formatCurrency(parseFloat(manualUnitPrice) || 0)}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Total ({parseInt(manualQuantity) || 1}x)</span>
                  <div className="font-mono font-semibold text-gray-900">
                    {formatCurrency((parseFloat(manualUnitPrice) || 0) * (parseInt(manualQuantity) || 1))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleSubmitManual}
                disabled={!canSubmitManual || saving}
              >
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {saving ? "Adding..." : "Add to Quote"}
              </Button>
            </div>
          </div>
        )}

        {/* ─── Product Configuration Mode ────────────────────────────────────── */}
        {mode === "product" && (
          <div className="space-y-6">
            {/* SECTION: Product Selection */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Product Selection</h3>
              {/* Family on its own row */}
              <div className="mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Family *</Label>
                  <Select
                    value={product.familyId || "none"}
                    onValueChange={(v) => {
                      const fid = v === "none" ? "" : v
                      setProduct({ familyId: fid, typeId: "", variantId: "" })
                      setTypeDetail(null)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select family..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select family...</SelectItem>
                      {families.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Type */}
              <div className="mb-3 space-y-1.5">
                <Label className="text-xs">Type *</Label>
                <Select
                  value={product.typeId || "none"}
                  onValueChange={(v) => {
                    const tid = v === "none" ? "" : v
                    setProduct((prev) => ({ ...prev, typeId: tid, variantId: "" }))
                  }}
                  disabled={!product.familyId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select type...</SelectItem>
                    {(selectedFamily?.types || []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500 shrink-0">{t.code}</span>
                          <span>{t.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedType && (
                  <div className="flex gap-1.5 mt-1">
                    <Badge variant="secondary" className="text-[10px] font-mono">{selectedType.code}</Badge>
                  </div>
                )}
              </div>

              {/* Variant */}
              <div className="space-y-1.5">
                <Label className="text-xs">Variant *</Label>
                {loading ? (
                  <div className="flex items-center justify-center h-10 rounded-md border border-input">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <Select
                    value={product.variantId || "none"}
                    onValueChange={(v) =>
                      setProduct((prev) => ({ ...prev, variantId: v === "none" ? "" : v }))
                    }
                    disabled={!product.typeId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select variant..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select variant...</SelectItem>
                      {(typeDetail?.variants || []).map((v: { id: string; name: string; code: string; sageStockCode?: string | null }) => (
                        <SelectItem key={v.id} value={v.id}>
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-xs text-gray-500 shrink-0">{v.code}</span>
                            <span>{v.name}</span>
                            {v.sageStockCode && <span className="text-[10px] text-blue-600 shrink-0">Sage</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedVariant && (
                  <div className="flex gap-1.5 mt-1">
                    <Badge variant="secondary" className="text-[10px] font-mono">{selectedVariant.code}</Badge>
                    {(selectedVariant as { sageStockCode?: string | null }).sageStockCode && (
                      <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700">Sage BOM</Badge>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* SECTION: Dimensions */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dimensions</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Width (mm) *</Label>
                  <Input
                    type="number"
                    value={config.width ?? ""}
                    onChange={(e) => updateConfig({ width: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder={selectedVariant?.defaultWidth ? String(selectedVariant.defaultWidth) : "e.g. 2400"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Height (mm) *</Label>
                  <Input
                    type="number"
                    value={config.height ?? ""}
                    onChange={(e) => updateConfig({ height: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder={selectedVariant?.defaultHeight ? String(selectedVariant.defaultHeight) : "e.g. 2100"}
                  />
                </div>
              </div>

              {isOversized && (
                <div className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 mt-3">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <div>
                    <span className="font-medium">Oversized dimensions</span> — width &gt; 5000mm or height &gt; 4000mm.
                    Please verify this is correct. Manufacturing and delivery may require special arrangements.
                  </div>
                </div>
              )}
            </section>

            {/* SECTION: Configuration */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Configuration</h3>
              <div className="grid grid-cols-3 gap-4">
                {/* Handing */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Handing</Label>
                  <Select
                    value={config.handing || "none"}
                    onValueChange={(v) => updateConfig({ handing: v === "none" ? "" : v as SimpleProductConfig["handing"] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      {HANDING_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Lock */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Lock</Label>
                  <Select
                    value={config.lock || "none"}
                    onValueChange={(v) => updateConfig({ lock: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      {SIMPLE_LOCK_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fixings */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Fixings</Label>
                  <Select
                    value={config.fixings || "none"}
                    onValueChange={(v) => updateConfig({ fixings: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      {FIXINGS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {/* Colour */}
                <RalColourSelect
                  value={config.colour}
                  onChange={(colour) => updateConfig({ colour })}
                />

                {/* Paint Finish */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Paint Finish</Label>
                  <Select
                    value={config.paintFinish || "none"}
                    onValueChange={(v) => updateConfig({ paintFinish: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      {PAINT_FINISH_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* SECTION: Features */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Features</h3>
              <div className="grid grid-cols-3 gap-2">
                <FeatureToggle
                  label="Pull Handles"
                  checked={config.pullHandles}
                  onChange={(pullHandles) => updateConfig({ pullHandles })}
                />
                <FeatureToggle
                  label="Door Closer"
                  checked={config.doorCloser}
                  onChange={(doorCloser) => updateConfig({ doorCloser })}
                />
                <FeatureToggle
                  label="Door Stay"
                  checked={config.doorStay}
                  onChange={(doorStay) => updateConfig({ doorStay })}
                />
                <FeatureToggle
                  label="Kick Plates"
                  checked={config.kickPlates}
                  onChange={(kickPlates) => updateConfig({ kickPlates })}
                />
                <FeatureToggle
                  label="Transom"
                  checked={config.transom}
                  onChange={(transom) => updateConfig({ transom, transomHeight: transom ? config.transomHeight : null })}
                />
                <FeatureToggle
                  label="Earthing"
                  checked={config.earthing}
                  onChange={(earthing) => updateConfig({ earthing })}
                />
              </div>
            </section>

            {/* SECTION: Transom Details (conditional) */}
            {config.transom && (
              <section className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-4">
                <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-3">Transom Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Transom Height (mm)</Label>
                    <Input
                      type="number"
                      value={config.transomHeight ?? ""}
                      onChange={(e) =>
                        updateConfig({ transomHeight: e.target.value ? parseInt(e.target.value) : null })
                      }
                      placeholder="e.g. 400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400">Door Leaf Height (auto)</Label>
                    <div className="flex items-center h-10 rounded-md border border-input bg-gray-50 px-3">
                      {doorLeafHeight ? (
                        <span className="text-sm font-mono text-gray-700">
                          {doorLeafHeight}mm
                          <span className="text-gray-400 ml-1 text-xs">
                            ({config.height}mm &minus; {config.transomHeight}mm)
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">Enter height &amp; transom height</span>
                      )}
                    </div>
                  </div>
                </div>

                {doorLeafHeight !== null && doorLeafHeight < 1800 && (
                  <div className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 mt-3">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Door leaf height is below 1800mm — check this is intentional
                  </div>
                )}
              </section>
            )}

            {/* SECTION: BOM Estimate */}
            {(bomPreview || bomLoading) && (
              <section className="rounded-lg border border-blue-200 bg-blue-50/30">
                <button
                  type="button"
                  onClick={() => setBomExpanded(!bomExpanded)}
                  className="flex items-center justify-between w-full px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                      Estimated BOM Cost
                    </h3>
                    {bomLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />}
                    {bomTotalCost !== null && !bomLoading && (
                      <span className="text-sm font-semibold font-mono text-blue-900">
                        {formatCurrency(adjustedBomTotal ?? bomTotalCost)}
                      </span>
                    )}
                  </div>
                  {bomExpanded ? (
                    <ChevronUp className="h-4 w-4 text-blue-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-blue-500" />
                  )}
                </button>

                {bomExpanded && bomPreview && bomPreview.length > 0 && (
                  <div className="px-4 pb-4">
                    {/* BOM items table */}
                    <div className="rounded-md border border-blue-200 bg-white overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-blue-50 text-blue-700">
                            <th className="text-left px-3 py-2 font-medium">Item</th>
                            <th className="text-left px-3 py-2 font-medium w-24">Category</th>
                            <th className="text-right px-3 py-2 font-medium w-16">Qty</th>
                            <th className="text-right px-3 py-2 font-medium w-24">Unit Cost</th>
                            <th className="text-right px-3 py-2 font-medium w-24">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {bomPreview.map((item, i) => (
                            <tr key={i} className={cn(
                              "hover:bg-gray-50",
                              item.unitCost === 0 && "text-gray-400"
                            )}>
                              <td className="px-3 py-1.5 truncate max-w-[250px]" title={item.description}>
                                {item.description}
                              </td>
                              <td className="px-3 py-1.5">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] px-1.5 py-0",
                                    item.category === "MATERIALS" && "border-blue-200 text-blue-600",
                                    item.category === "HARDWARE" && "border-purple-200 text-purple-600",
                                    item.category === "SEALS" && "border-green-200 text-green-600",
                                    item.category === "LABOUR" && "border-orange-200 text-orange-600",
                                    item.category === "FINISH" && "border-pink-200 text-pink-600",
                                  )}
                                >
                                  {item.category}
                                </Badge>
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono">{item.quantity}</td>
                              <td className="px-3 py-1.5 text-right font-mono">
                                {item.unitCost > 0 ? formatCurrency(item.unitCost) : "—"}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono font-medium">
                                {item.totalCost > 0 ? formatCurrency(item.totalCost) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-blue-50 font-semibold text-blue-900">
                            <td colSpan={2} className="px-3 py-2">
                              Total ({bomPreview.length} items)
                            </td>
                            <td className="px-3 py-2 text-right" />
                            <td className="px-3 py-2 text-right" />
                            <td className="px-3 py-2 text-right font-mono">
                              {bomTotalCost !== null ? formatCurrency(bomTotalCost) : "—"}
                            </td>
                          </tr>
                          {/* Category subtotals */}
                          {Object.entries(
                            bomPreview.reduce<Record<string, number>>((acc, item) => {
                              acc[item.category] = (acc[item.category] || 0) + item.totalCost
                              return acc
                            }, {})
                          )
                            .filter(([, total]) => total > 0)
                            .sort(([, a], [, b]) => b - a)
                            .map(([category, total]) => (
                              <tr key={category} className="text-[10px] text-gray-500">
                                <td colSpan={4} className="px-3 py-1 text-right">
                                  {category}
                                </td>
                                <td className="px-3 py-1 text-right font-mono">
                                  {formatCurrency(total)}
                                </td>
                              </tr>
                            ))}
                        </tfoot>
                      </table>
                    </div>

                    {/* Shop Floor Labour Cost (from BOO) */}
                    {labourCost !== null && labourCost > 0 && (
                      <div className="mt-2 flex items-center justify-between rounded-md border border-green-200 bg-green-50/50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-xs text-green-700 font-medium">
                            Shop Floor Labour
                          </span>
                          <span className="text-[10px] text-green-600 font-mono">
                            {labourHours?.toFixed(1)} hrs &times; &pound;17/hr
                          </span>
                        </div>
                        <span className="text-xs font-semibold font-mono text-green-800">
                          {formatCurrency(labourCost)}
                        </span>
                      </div>
                    )}

                    {/* Unpriced items — let sales price individually or add flat amount */}
                    {(() => {
                      const unpricedItems = bomPreview
                        .map((item, i) => ({ ...item, index: i }))
                        .filter((item) => item.unitCost === 0)
                      if (unpricedItems.length === 0) return null
                      return (
                        <div className="mt-3 space-y-3">
                          <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            {unpricedItems.length} item(s) without pricing
                          </div>

                          {/* Individual pricing */}
                          <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                            <p className="text-[10px] text-amber-600 font-medium uppercase tracking-wider">
                              Enter price per unit for each item
                            </p>
                            {unpricedItems.map((item) => (
                              <div key={item.index} className="flex items-center gap-2">
                                <span className="text-xs text-gray-700 flex-1 truncate" title={item.description}>
                                  {item.description}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[8px] px-1 py-0 shrink-0 border-amber-200 text-amber-600"
                                >
                                  {item.category}
                                </Badge>
                                <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                                  &times;{item.quantity}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] text-gray-400">&pound;</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={unpricedOverrides[item.index] || ""}
                                    onChange={(e) =>
                                      setUnpricedOverrides((prev) => ({
                                        ...prev,
                                        [item.index]: e.target.value,
                                      }))
                                    }
                                    className="w-24 h-7 text-xs font-mono"
                                    placeholder="0.00"
                                  />
                                </div>
                                {unpricedOverrides[item.index] &&
                                  parseFloat(unpricedOverrides[item.index]) > 0 && (
                                    <span className="text-[10px] text-amber-700 font-mono shrink-0">
                                      = {formatCurrency(
                                        parseFloat(unpricedOverrides[item.index]) * item.quantity
                                      )}
                                    </span>
                                  )}
                              </div>
                            ))}
                          </div>

                          {/* OR flat cost adjustment */}
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-wider">
                            <div className="flex-1 border-t border-gray-200" />
                            or
                            <div className="flex-1 border-t border-gray-200" />
                          </div>
                        </div>
                      )
                    })()}

                    {/* Additional cost adjustment — always visible */}
                    <div className="mt-3 flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50/50 p-2.5">
                      <div className="flex-1">
                        <span className="text-xs text-blue-700 font-medium">Additional Cost</span>
                        <p className="text-[10px] text-blue-500">Flat amount added on top of BOM total</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-gray-500">&pound;</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={costAdjustment}
                          onChange={(e) => setCostAdjustment(e.target.value)}
                          className="w-28 h-7 text-xs font-mono"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Adjusted total summary */}
                    {adjustedBomTotal !== null && adjustedBomTotal !== bomTotalCost && (
                      <div className="mt-2 flex items-center justify-between text-xs px-1">
                        <span className="text-gray-500">
                          Materials: {formatCurrency(bomTotalCost ?? 0)}
                          {labourCost != null && labourCost > 0 && (
                            <span className="text-green-600 ml-2">
                              + {formatCurrency(labourCost)} labour
                            </span>
                          )}
                          {Object.values(unpricedOverrides).some((v) => parseFloat(v) > 0) && (
                            <span className="text-amber-600 ml-2">
                              + manual pricing
                            </span>
                          )}
                          {parseFloat(costAdjustment) > 0 && (
                            <span className="text-blue-600 ml-2">
                              + {formatCurrency(parseFloat(costAdjustment))} adjustment
                            </span>
                          )}
                        </span>
                        <span className="font-semibold font-mono text-blue-900">
                          = {formatCurrency(adjustedBomTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {bomExpanded && bomPreview && bomPreview.length === 0 && !bomLoading && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-gray-500">No BOM items found for this variant. Cost will need to be entered manually.</p>
                  </div>
                )}
              </section>
            )}

            {/* SECTION: Notes */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Notes</h3>
              <Textarea
                value={config.notes}
                onChange={(e) => updateConfig({ notes: e.target.value })}
                placeholder="Any special requirements, delivery notes, etc."
                rows={3}
              />
            </section>

            {/* SECTION: Classification (ITO) */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Classification</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setClassification("STANDARD")}
                  className={cn(
                    "flex-1 rounded-lg border-2 p-3 text-left transition-all",
                    classification === "STANDARD"
                      ? "border-green-500 bg-green-50"
                      : "border-border hover:border-gray-300"
                  )}
                >
                  <div className="text-sm font-semibold text-gray-900">CTO</div>
                  <p className="text-xs text-gray-500">Configure to Order — standard product</p>
                </button>
                <button
                  onClick={() => setClassification("INNOVATE_TO_ORDER")}
                  className={cn(
                    "flex-1 rounded-lg border-2 p-3 text-left transition-all",
                    classification === "INNOVATE_TO_ORDER"
                      ? "border-orange-500 bg-orange-50"
                      : "border-border hover:border-gray-300"
                  )}
                >
                  <div className="text-sm font-semibold text-gray-900">ITO</div>
                  <p className="text-xs text-gray-500">Innovate to Order — requires approval</p>
                </button>
              </div>

              {classification === "INNOVATE_TO_ORDER" && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-2 rounded border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    This item will require Sales Director approval.
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Override Unit Cost (&pound;)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costOverride}
                      onChange={(e) => setCostOverride(e.target.value)}
                      className="w-40 font-mono"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* SECTION: Quantity & Totals */}
            <section className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-end gap-6">
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-24 text-right"
                  />
                </div>
                {(costOverride || adjustedBomTotal) && (
                  <>
                    <div>
                      <span className="text-xs text-gray-500">
                        Unit Cost {adjustedBomTotal && !costOverride ? "(BOM)" : ""}
                      </span>
                      <div className="font-mono font-medium text-sm">
                        {formatCurrency(parseFloat(costOverride) || adjustedBomTotal || 0)}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Total ({parseInt(quantity) || 1}x)</span>
                      <div className="font-mono font-semibold text-sm text-gray-900">
                        {formatCurrency(
                          (parseFloat(costOverride) || adjustedBomTotal || 0) * (parseInt(quantity) || 1)
                        )}
                      </div>
                    </div>
                  </>
                )}
                <div className="ml-auto">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      classification === "STANDARD"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    )}
                  >
                    {classification === "STANDARD" ? "CTO" : "ITO"}
                  </Badge>
                </div>
              </div>
            </section>

            {/* Navigation */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitProduct}
                disabled={!canSubmitProduct || saving}
                className={cn(
                  classification === "INNOVATE_TO_ORDER"
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                )}
              >
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : editingLine ? "Save Changes" : "Add to Quote"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
