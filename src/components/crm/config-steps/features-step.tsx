"use client"

import { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { GripVertical, X } from "lucide-react"
import type { SelectedFeatureTag, FeatureTagData } from "@/lib/product-config-types"
import { calcPerimeter } from "@/lib/product-config-types"

const CATEGORY_LABELS: Record<string, string> = {
  FIXINGS: "Fixings",
  DOOR_HARDWARE: "Door Hardware",
  ELECTRICAL: "Electrical",
  SEALS_GASKETS: "Seals & Gaskets",
  OTHER: "Other",
  GENERAL: "General",
}

const CATEGORY_COLORS: Record<string, string> = {
  FIXINGS: "border-blue-200 bg-blue-50",
  DOOR_HARDWARE: "border-amber-200 bg-amber-50",
  ELECTRICAL: "border-purple-200 bg-purple-50",
  SEALS_GASKETS: "border-green-200 bg-green-50",
  OTHER: "border-gray-200 bg-gray-50",
  GENERAL: "border-gray-200 bg-gray-50",
}

function formatCurrency(val: number) {
  return `£${val.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function FeaturesStep({
  selected,
  onChange,
  width,
  height,
}: {
  selected: SelectedFeatureTag[]
  onChange: (features: SelectedFeatureTag[]) => void
  width: number | null
  height: number | null
}) {
  const [availableTags, setAvailableTags] = useState<FeatureTagData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/feature-tags")
      .then((r) => r.json())
      .then((tags) => setAvailableTags(tags))
      .catch(() => setAvailableTags([]))
      .finally(() => setLoading(false))
  }, [])

  const perimeter = calcPerimeter(width, height)

  // Group available tags by category (exclude already selected)
  const selectedIds = new Set(selected.map((s) => s.tagId))
  const available = availableTags.filter((t) => !selectedIds.has(t.id) && t.isActive)
  const grouped = available.reduce<Record<string, FeatureTagData[]>>((acc, tag) => {
    const cat = tag.category || "OTHER"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(tag)
    return acc
  }, {})

  function addTag(tag: FeatureTagData) {
    let qty = tag.defaultQuantity
    if (tag.autoCalcFromDimensions && tag.autoCalcFormula && perimeter > 0) {
      qty = evalFormula(tag.autoCalcFormula, width, height, perimeter)
    }
    const unitCost = Number(tag.unitCost) || 0
    const newTag: SelectedFeatureTag = {
      tagId: tag.id,
      name: tag.name,
      code: tag.code,
      category: tag.category,
      unitCost,
      unit: tag.unit,
      quantity: qty,
      totalCost: unitCost * qty,
    }
    onChange([...selected, newTag])
  }

  function removeTag(tagId: string) {
    onChange(selected.filter((t) => t.tagId !== tagId))
  }

  function updateQuantity(tagId: string, quantity: number) {
    onChange(
      selected.map((t) =>
        t.tagId === tagId
          ? { ...t, quantity, totalCost: t.unitCost * quantity }
          : t
      )
    )
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    const { source, destination } = result

    // Dragging from available to selected
    if (source.droppableId === "available" && destination.droppableId === "selected") {
      const tagId = result.draggableId.replace("avail-", "")
      const tag = availableTags.find((t) => t.id === tagId)
      if (tag) addTag(tag)
    }
  }

  const subtotal = selected.reduce((sum, t) => sum + t.totalCost, 0)

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Drag feature tags or click to add:</p>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 gap-3" style={{ minHeight: 300 }}>
          {/* Available Features */}
          <Droppable droppableId="available" isDropDisabled>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="rounded-lg border border-border p-2 overflow-y-auto max-h-[350px]"
              >
                <div className="text-xs font-semibold text-gray-600 mb-2 px-1">
                  AVAILABLE FEATURES
                </div>

                {loading ? (
                  <div className="py-8 text-center text-xs text-gray-400">Loading tags...</div>
                ) : Object.keys(grouped).length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">
                    {availableTags.length === 0
                      ? "No feature tags configured. Add tags in admin."
                      : "All available tags have been added"}
                  </div>
                ) : (
                  Object.entries(grouped).map(([category, tags]) => (
                    <div key={category} className="mb-3">
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1">
                        {CATEGORY_LABELS[category] || category}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag, idx) => (
                          <Draggable key={tag.id} draggableId={`avail-${tag.id}`} index={idx}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                              >
                                <button
                                  type="button"
                                  onClick={() => addTag(tag)}
                                  className={cn(
                                    "rounded-lg border px-2.5 py-1.5 text-left transition-all hover:shadow-sm cursor-grab active:cursor-grabbing",
                                    dragSnapshot.isDragging ? "shadow-md opacity-80 rotate-2" : "",
                                    CATEGORY_COLORS[category] || CATEGORY_COLORS.OTHER
                                  )}
                                >
                                  <div className="text-[11px] font-medium text-gray-800 leading-tight">
                                    {tag.name}
                                  </div>
                                  <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                                    {formatCurrency(Number(tag.unitCost))}/{tag.unit}
                                  </div>
                                </button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                    </div>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Selected Features (Drop Zone) */}
          <Droppable droppableId="selected">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "rounded-lg border-2 border-dashed p-2 transition-colors",
                  snapshot.isDraggingOver
                    ? "border-indigo-400 bg-indigo-50/50"
                    : selected.length > 0
                    ? "border-border bg-white"
                    : "border-gray-300 bg-gray-50/30"
                )}
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-semibold text-gray-600">SELECTED FEATURES</span>
                  {selected.length === 0 && (
                    <span className="text-[10px] text-gray-400">Drag features here</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {selected.map((tag) => (
                    <div
                      key={tag.tagId}
                      className={cn(
                        "rounded-lg border px-2.5 py-2 flex items-center gap-2",
                        CATEGORY_COLORS[tag.category] || CATEGORY_COLORS.OTHER
                      )}
                    >
                      <GripVertical className="h-3 w-3 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-gray-800 truncate">
                          {tag.name}
                        </div>
                        <div className="text-[9px] text-gray-500 font-mono">
                          {formatCurrency(tag.unitCost)}/{tag.unit}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] text-gray-500">Qty:</span>
                        <Input
                          type="number"
                          min={1}
                          value={tag.quantity}
                          onChange={(e) =>
                            updateQuantity(tag.tagId, parseInt(e.target.value) || 1)
                          }
                          className="w-14 h-6 text-xs text-center px-1"
                        />
                      </div>
                      <span className="text-[10px] font-mono font-medium text-gray-700 shrink-0 w-16 text-right">
                        {formatCurrency(tag.totalCost)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag.tagId)}
                        className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {selected.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border/60 flex justify-between px-1">
                    <span className="text-xs font-medium text-gray-600">Features Subtotal:</span>
                    <span className="text-xs font-mono font-semibold text-gray-900">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                )}

                <div className="hidden">{provided.placeholder}</div>
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>
    </div>
  )
}

// Simple formula evaluator for dimension-based auto-calculation
function evalFormula(formula: string, w: number | null, h: number | null, perimeter: number): number {
  try {
    const width = w || 0
    const height = h || 0
    const area = (width * height) / 1_000_000
    // Replace variable names with values
    const expr = formula
      .replace(/\bperimeter\b/g, String(perimeter))
      .replace(/\bwidth\b/g, String(width))
      .replace(/\bheight\b/g, String(height))
      .replace(/\barea\b/g, String(area))
    // Safe eval using Function constructor (only math operations)
    const result = new Function(`return (${expr})`)()
    return Math.max(1, Math.ceil(Number(result) || 1))
  } catch {
    return 1
  }
}
