"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Check, X } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type CatalogueItem = {
  id: string
  partCode: string
  description: string
  classId: string
  active: boolean
  guideUnitCost: string | number | null
  guideMarginPercent: string | number | null
  defaultUnits: string | null
  _count: { products: number }
}

export function EditCatalogueRow({ item }: { item: CatalogueItem }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const [description, setDescription] = useState(item.description)
  const [guideUnitCost, setGuideUnitCost] = useState(String(item.guideUnitCost || ""))
  const [guideMarginPercent, setGuideMarginPercent] = useState(String(item.guideMarginPercent || ""))
  const [defaultUnits, setDefaultUnits] = useState(item.defaultUnits || "nr")

  useEffect(() => {
    if (editing && nameRef.current) nameRef.current.focus()
  }, [editing])

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/catalogue/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          guideUnitCost: guideUnitCost || null,
          guideMarginPercent: guideMarginPercent || null,
          defaultUnits,
        }),
      })
      setEditing(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDescription(item.description)
    setGuideUnitCost(String(item.guideUnitCost || ""))
    setGuideMarginPercent(String(item.guideMarginPercent || ""))
    setDefaultUnits(item.defaultUnits || "nr")
    setEditing(false)
  }

  const inputClass = "w-full rounded border border-border px-2 py-1 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
  const smallInput = "w-20 rounded border border-border px-2 py-1 text-xs text-right focus:border-blue-500 focus:outline-none"

  if (editing) {
    return (
      <tr className="bg-blue-50/30">
        <td className="px-4 py-2 font-mono text-xs font-medium text-gray-700">{item.partCode}</td>
        <td className="px-4 py-2">
          <input ref={nameRef} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        </td>
        <td className="px-4 py-2"><input value={guideUnitCost} onChange={(e) => setGuideUnitCost(e.target.value)} className={smallInput} placeholder="0" /></td>
        <td className="px-4 py-2"><input value={guideMarginPercent} onChange={(e) => setGuideMarginPercent(e.target.value)} className={smallInput} placeholder="40" /></td>
        <td className="px-4 py-2">
          <select value={defaultUnits} onChange={(e) => setDefaultUnits(e.target.value)} className="w-16 rounded border border-border px-1 py-1 text-xs focus:border-blue-500 focus:outline-none">
            <option value="nr">nr</option>
            <option value="item">item</option>
            <option value="set">set</option>
            <option value="lot">lot</option>
            <option value="m">m</option>
            <option value="m2">m2</option>
            <option value="kg">kg</option>
          </select>
        </td>
        <td className="px-4 py-2 text-center text-xs text-gray-500">{item._count.products}</td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={handleSave} disabled={saving}>
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-2 font-mono text-xs font-medium text-gray-700">{item.partCode}</td>
      <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
      <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
        {item.guideUnitCost ? formatCurrency(item.guideUnitCost) : "—"}
      </td>
      <td className="px-4 py-2 text-right text-xs text-gray-600">
        {item.guideMarginPercent ? `${item.guideMarginPercent}%` : "—"}
      </td>
      <td className="px-4 py-2 text-center text-xs text-gray-600">
        {item.defaultUnits || "—"}
      </td>
      <td className="px-4 py-2 text-center">
        <Badge variant="secondary" className="bg-gray-100 text-gray-700">{item._count.products}</Badge>
      </td>
      <td className="px-4 py-2">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4 text-gray-400" />
        </Button>
      </td>
    </tr>
  )
}
