"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
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
  notes: string | null
  sortOrder: number
}

type Props = {
  designCardId: string
  product: {
    id: string
    description: string
    partCode: string
    productJobNumber: string | null
  }
  project: {
    id: string
    projectNumber: string
    name: string
    customer: { name: string } | null
  }
  initialBomLines: BomLine[]
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

export function BomEditorPage({ designCardId, product, project, initialBomLines }: Props) {
  const router = useRouter()
  const [lines, setLines] = useState<BomLine[]>(initialBomLines)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [adding, setAdding] = useState(false)

  const totalCost = lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unitCost), 0)

  const addLine = useCallback(async () => {
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
  }, [designCardId])

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

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/design" className="hover:text-blue-600 hover:underline">Design</Link>
        <span>/</span>
        <Link href="/design/my-work" className="hover:text-blue-600 hover:underline">My Work</Link>
        <span>/</span>
        <Link href={`/projects/${project.id}`} className="hover:text-blue-600 hover:underline">
          {project.projectNumber}
        </Link>
        <span>/</span>
        <span className="text-gray-700 truncate max-w-[200px]" title={product.description}>
          {product.description}
        </span>
        <span>/</span>
        <span className="text-gray-900 font-medium">BOM</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-gray-900">Bill of Materials</h1>
          <p className="text-sm text-gray-500">
            {product.description}
            {product.productJobNumber && (
              <span className="ml-2 font-mono text-xs text-gray-400">{product.productJobNumber}</span>
            )}
          </p>
          {project.customer && (
            <p className="text-xs text-gray-400">
              {project.projectNumber} — {project.name} — {project.customer.name}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-gray-500">Total Cost</div>
          <div className="text-2xl font-bold text-gray-900">
            £{totalCost.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* BOM Table */}
      <div className="border border-border rounded-lg bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-[220px]">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-[110px]">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-[120px]">Part No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-[120px]">Supplier</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 w-[70px]">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-[80px]">Unit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 w-[100px]">Unit £</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 w-[100px]">Total £</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-[44px]"></th>
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
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    No BOM lines yet. Click &ldquo;Add Line&rdquo; to start building the BOM.
                  </td>
                </tr>
              )}
            </tbody>
            {lines.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-gray-50">
                  <td colSpan={7} className="px-4 py-3 text-right font-semibold text-gray-700">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    £{totalCost.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={addLine}
          disabled={adding}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {adding ? "Adding..." : "Add Line"}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{lines.length} line{lines.length !== 1 ? "s" : ""}</span>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-border rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
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
  const inputClass = "w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50/50 ${isSaving ? "opacity-50" : ""}`}>
      <td className="px-4 py-2">
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
      <td className="px-4 py-2">
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
      <td className="px-4 py-2">
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
      <td className="px-4 py-2">
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
      <td className="px-4 py-2">
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
      <td className="px-4 py-2">
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
      <td className="px-4 py-2">
        <input
          type="number"
          className={`${inputClass} text-right`}
          defaultValue={Number(line.unitCost)}
          step="0.01"
          min="0"
          onBlur={(e) => {
            const val = parseFloat(e.target.value)
            if (!isNaN(val) && val !== Number(line.unitCost)) onUpdate("unitCost", val)
          }}
        />
      </td>
      <td className="px-4 py-2 text-right text-sm font-medium text-gray-700">
        £{lineTotal.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-2">
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
