"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

type BomLine = {
  id: string
  description: string
  category: string
  partNumber: string | null
  supplier: string | null
  quantity: number
  unit: string
  unitCost: number
  sageCostPrice: number | null
  costOverridden: boolean
  notes: string | null
  sortOrder: number
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  designCardId: string
  productDescription: string
  productJobNumber: string | null
}

const CATEGORIES = [
  { value: "MATERIALS", label: "Materials" },
  { value: "HARDWARE", label: "Hardware" },
  { value: "SEALS", label: "Seals" },
  { value: "FINISH", label: "Finish" },
  { value: "LABOUR", label: "Labour" },
  { value: "OTHER", label: "Other" },
]

const UNITS = ["each", "metres", "m²", "kg", "litres", "set", "pair"]

export function BomEditorDialog({ open, onOpenChange, designCardId, productDescription, productJobNumber }: Props) {
  const router = useRouter()
  const [lines, setLines] = useState<BomLine[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [adding, setAdding] = useState(false)

  const fetchBom = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/design/bom/${designCardId}`)
      if (res.ok) {
        const data = await res.json()
        setLines(data.bomLines || [])
      }
    } finally {
      setLoading(false)
    }
  }, [designCardId])

  useEffect(() => {
    if (open) fetchBom()
  }, [open, fetchBom])

  if (!open) return null

  async function addLine() {
    setAdding(true)
    try {
      const res = await fetch(`/api/design/bom/${designCardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "", category: "MATERIALS", quantity: 1, unitCost: 0 }),
      })
      if (res.ok) {
        const line = await res.json()
        setLines((prev) => [...prev, line])
      }
    } finally {
      setAdding(false)
    }
  }

  async function updateLine(lineId: string, field: string, value: unknown) {
    setSaving((s) => ({ ...s, [lineId]: true }))
    try {
      const res = await fetch(`/api/design/bom/${designCardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lineId, [field]: value }),
      })
      if (res.ok) {
        const updated = await res.json()
        setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, ...updated } : l)))
      }
    } finally {
      setSaving((s) => ({ ...s, [lineId]: false }))
    }
  }

  async function deleteLine(lineId: string) {
    setSaving((s) => ({ ...s, [lineId]: true }))
    try {
      const res = await fetch(`/api/design/bom/${designCardId}?lineId=${lineId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setLines((prev) => prev.filter((l) => l.id !== lineId))
      }
    } finally {
      setSaving((s) => ({ ...s, [lineId]: false }))
    }
  }

  const totalCost = lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unitCost), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={() => { onOpenChange(false); router.refresh() }} />

      <div className="relative bg-white rounded-lg shadow-xl border border-border w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Bill of Materials</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {productDescription}
                {productJobNumber && <span className="ml-2 font-mono text-xs text-gray-400">{productJobNumber}</span>}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Total Cost</div>
              <div className="text-lg font-bold text-gray-900">
                £{totalCost.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto flex-1 px-6 py-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading BOM...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-2 text-xs font-semibold text-gray-500 w-[220px]">Description</th>
                  <th className="pb-2 pr-2 text-xs font-semibold text-gray-500 w-[100px]">Category</th>
                  <th className="pb-2 pr-2 text-xs font-semibold text-gray-500 w-[110px]">Part No.</th>
                  <th className="pb-2 pr-2 text-xs font-semibold text-gray-500 w-[110px]">Supplier</th>
                  <th className="pb-2 pr-2 text-xs font-semibold text-gray-500 w-[60px] text-right">Qty</th>
                  <th className="pb-2 pr-2 text-xs font-semibold text-gray-500 w-[70px]">Unit</th>
                  <th className="pb-2 pr-2 text-xs font-semibold text-gray-500 w-[90px] text-right">Unit £</th>
                  <th className="pb-2 pr-2 text-xs font-semibold text-gray-500 w-[90px] text-right">Total £</th>
                  <th className="pb-2 text-xs font-semibold text-gray-500 w-[36px]"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <BomLineRow
                    key={line.id}
                    line={line}
                    isSaving={saving[line.id]}
                    onUpdate={(field, value) => updateLine(line.id, field, value)}
                    onDelete={() => deleteLine(line.id)}
                  />
                ))}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400">
                      No BOM lines yet. Click &ldquo;Add Line&rdquo; to start building the BOM.
                    </td>
                  </tr>
                )}
              </tbody>
              {lines.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td colSpan={7} className="pt-2 text-right font-semibold text-gray-700 pr-2">Total</td>
                    <td className="pt-2 text-right font-bold text-gray-900">
                      £{totalCost.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-gray-50 rounded-b-lg shrink-0 flex items-center justify-between">
          <button
            onClick={addLine}
            disabled={adding}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {adding ? "Adding..." : "Add Line"}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{lines.length} line{lines.length !== 1 ? "s" : ""}</span>
            <button
              onClick={() => { onOpenChange(false); router.refresh() }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-border rounded-lg hover:bg-gray-50"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BomLineRow({
  line,
  isSaving,
  onUpdate,
  onDelete,
}: {
  line: BomLine
  isSaving?: boolean
  onUpdate: (field: string, value: unknown) => void
  onDelete: () => void
}) {
  const lineTotal = Number(line.quantity) * Number(line.unitCost)
  const inputClass = "w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"

  return (
    <tr className={`border-b border-gray-100 ${isSaving ? "opacity-50" : ""}`}>
      <td className="py-1.5 pr-2">
        <input
          type="text"
          className={inputClass}
          defaultValue={line.description}
          placeholder="Item description"
          onBlur={(e) => {
            if (e.target.value !== line.description) onUpdate("description", e.target.value)
          }}
        />
      </td>
      <td className="py-1.5 pr-2">
        <select
          className={inputClass}
          defaultValue={line.category}
          onChange={(e) => onUpdate("category", e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </td>
      <td className="py-1.5 pr-2">
        <input
          type="text"
          className={inputClass}
          defaultValue={line.partNumber || ""}
          placeholder="Part #"
          onBlur={(e) => {
            if (e.target.value !== (line.partNumber || "")) onUpdate("partNumber", e.target.value)
          }}
        />
      </td>
      <td className="py-1.5 pr-2">
        <input
          type="text"
          className={inputClass}
          defaultValue={line.supplier || ""}
          placeholder="Supplier"
          onBlur={(e) => {
            if (e.target.value !== (line.supplier || "")) onUpdate("supplier", e.target.value)
          }}
        />
      </td>
      <td className="py-1.5 pr-2">
        <input
          type="number"
          className={`${inputClass} text-right`}
          defaultValue={Number(line.quantity)}
          step="0.01"
          min="0"
          onBlur={(e) => {
            const val = parseFloat(e.target.value)
            if (!isNaN(val) && val !== Number(line.quantity)) onUpdate("quantity", val)
          }}
        />
      </td>
      <td className="py-1.5 pr-2">
        <select
          className={inputClass}
          defaultValue={line.unit}
          onChange={(e) => onUpdate("unit", e.target.value)}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </td>
      <td className="py-1.5 pr-2">
        <div className="flex items-center justify-end gap-1 rounded border border-gray-100 bg-gray-50 px-2 py-1 text-sm text-gray-600">
          {line.sageCostPrice !== null && (
            <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
          <span>{Number(line.unitCost).toFixed(2)}</span>
        </div>
      </td>
      <td className="py-1.5 pr-2 text-right text-sm font-medium text-gray-700">
        £{lineTotal.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="py-1.5">
        <button
          onClick={onDelete}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          title="Delete line"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  )
}
