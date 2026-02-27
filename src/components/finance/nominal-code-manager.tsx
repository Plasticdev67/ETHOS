"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Edit2, Check, X } from "lucide-react"

const categories = [
  "MATERIALS",
  "LABOUR",
  "PLANT_HIRE",
  "SUB_CONTRACT",
  "TRANSPORT",
  "OVERHEADS",
  "PRELIMS",
  "DESIGN",
  "OTHER",
]

const categoryColors: Record<string, string> = {
  MATERIALS: "bg-blue-100 text-blue-700",
  LABOUR: "bg-purple-100 text-purple-700",
  PLANT_HIRE: "bg-amber-100 text-amber-700",
  SUB_CONTRACT: "bg-orange-100 text-orange-700",
  TRANSPORT: "bg-cyan-100 text-cyan-700",
  OVERHEADS: "bg-gray-100 text-gray-700",
  PRELIMS: "bg-pink-100 text-pink-700",
  DESIGN: "bg-indigo-100 text-indigo-700",
  OTHER: "bg-gray-100 text-gray-600",
}

type NominalCode = {
  id: string
  code: string
  description: string
  category: string
  active: boolean
  _count: {
    purchaseOrderLines: number
    plantHires: number
    subContracts: number
    projectCostCategories: number
  }
}

export function NominalCodeManager({ codes }: { codes: NominalCode[] }) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Add form state
  const [newCode, setNewCode] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newCat, setNewCat] = useState("MATERIALS")

  // Edit form state
  const [editCode, setEditCode] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editCat, setEditCat] = useState("")

  async function handleAdd() {
    if (!newCode || !newDesc) return
    setSaving(true)
    try {
      const res = await fetch("/api/nominal-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode, description: newDesc, category: newCat }),
      })
      if (res.ok) {
        setNewCode("")
        setNewDesc("")
        setNewCat("MATERIALS")
        setShowAdd(false)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  function startEdit(nc: NominalCode) {
    setEditingId(nc.id)
    setEditCode(nc.code)
    setEditDesc(nc.description)
    setEditCat(nc.category)
  }

  async function handleEdit(id: string) {
    setSaving(true)
    try {
      await fetch(`/api/nominal-codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: editCode, description: editDesc, category: editCat }),
      })
      setEditingId(null)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    await fetch(`/api/nominal-codes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !currentActive }),
    })
    router.refresh()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/nominal-codes/${id}`, { method: "DELETE" })
    router.refresh()
  }

  const selectClass = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">All Nominal Codes ({codes.length})</CardTitle>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="mr-2 h-4 w-4" /> Add Code
        </Button>
      </CardHeader>

      {/* Add form */}
      {showAdd && (
        <CardContent className="border-t border-border pt-4 pb-2">
          <div className="flex items-end gap-3">
            <div className="space-y-1 w-28">
              <Label className="text-xs">Code</Label>
              <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="4000" className="font-mono" />
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Description</Label>
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Steel / Raw Materials" />
            </div>
            <div className="space-y-1 w-40">
              <Label className="text-xs">Category</Label>
              <select value={newCat} onChange={(e) => setNewCat(e.target.value)} className={selectClass}>
                {categories.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={!newCode || !newDesc || saving}>
              {saving ? "..." : "Add"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </CardContent>
      )}

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border bg-gray-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 w-24">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Category</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Usage</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Active</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {codes.map((nc) => {
                const totalUsage = nc._count.purchaseOrderLines + nc._count.plantHires + nc._count.subContracts + nc._count.projectCostCategories
                const isEditing = editingId === nc.id

                if (isEditing) {
                  return (
                    <tr key={nc.id} className="bg-blue-50/30">
                      <td className="px-4 py-2">
                        <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} className="font-mono h-8 w-20" />
                      </td>
                      <td className="px-4 py-2">
                        <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-8" />
                      </td>
                      <td className="px-4 py-2">
                        <select value={editCat} onChange={(e) => setEditCat(e.target.value)} className={`${selectClass} h-8 py-1`}>
                          {categories.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-center font-mono text-xs">{totalUsage}</td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(nc.id)} className="rounded p-1.5 text-green-600 hover:bg-green-50"><Check className="h-4 w-4" /></button>
                          <button onClick={() => setEditingId(null)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={nc.id} className={`hover:bg-gray-50 ${!nc.active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-2.5 font-mono text-sm font-semibold">{nc.code}</td>
                    <td className="px-4 py-2.5 text-gray-700">{nc.description}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="secondary" className={categoryColors[nc.category] || "bg-gray-100 text-gray-700"}>
                        {nc.category.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono text-xs text-gray-500">{totalUsage}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleToggleActive(nc.id, nc.active)}
                        className={`text-xs font-medium ${nc.active ? "text-green-600" : "text-gray-400"}`}
                      >
                        {nc.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(nc)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {totalUsage === 0 && (
                          <button onClick={() => handleDelete(nc.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {codes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <p className="mb-1">No nominal codes set up yet.</p>
                    <p className="text-xs text-gray-400">Add codes that match your Sage nominal ledger — e.g. 4000 Materials, 4100 Sub-contract, etc.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
