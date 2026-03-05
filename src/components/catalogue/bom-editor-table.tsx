"use client"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Trash2, Plus, Save, X, Check, Lock, Unlock } from "lucide-react"

interface BomItem {
  id: string
  description: string
  category: string
  stockCode: string | null
  quantity: string
  unitCost: string
  scalesWithSize: boolean
  sortOrder: number
}

interface BomEditorTableProps {
  variantId: string
  variantCode: string
  variantName: string
  familyName: string
  initialItems: BomItem[]
}

const CATEGORIES = ["MATERIALS", "LABOUR", "HARDWARE", "SEALS", "FINISH", "OTHER"]

function formatCurrency(val: number | string) {
  return `£${parseFloat(String(val)).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`
}

export default function BomEditorTable({
  variantId,
  variantCode,
  variantName,
  familyName,
  initialItems,
}: BomEditorTableProps) {
  const [items, setItems] = useState<BomItem[]>(initialItems)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<BomItem>>({})
  const [adding, setAdding] = useState(false)
  const [newItem, setNewItem] = useState({
    description: "",
    category: "MATERIALS",
    stockCode: "",
    quantity: "1",
    unitCost: "0",
    scalesWithSize: false,
  })
  const [saving, setSaving] = useState(false)

  // Password lock state
  const [unlocked, setUnlocked] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [verifying, setVerifying] = useState(false)

  const totalCost = items.reduce(
    (sum, item) => sum + parseFloat(item.unitCost) * parseFloat(item.quantity),
    0
  )

  const verifyPassword = useCallback(async () => {
    if (!password.trim()) return
    setVerifying(true)
    setPasswordError("")
    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setPasswordError(data.error || "Incorrect password")
        return
      }
      setUnlocked(true)
      setShowPasswordPrompt(false)
      setPassword("")
      setPasswordError("")
    } catch {
      setPasswordError("Verification failed")
    } finally {
      setVerifying(false)
    }
  }, [password])

  const requestUnlock = useCallback(() => {
    setShowPasswordPrompt(true)
    setPassword("")
    setPasswordError("")
  }, [])

  const lockEditor = useCallback(() => {
    setUnlocked(false)
    setEditingId(null)
    setEditData({})
    setAdding(false)
  }, [])

  const startEdit = useCallback((item: BomItem) => {
    if (!unlocked) { requestUnlock(); return }
    setEditingId(item.id)
    setEditData({
      description: item.description,
      category: item.category,
      stockCode: item.stockCode,
      quantity: item.quantity,
      unitCost: item.unitCost,
      scalesWithSize: item.scalesWithSize,
    })
  }, [unlocked, requestUnlock])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditData({})
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editingId || !unlocked) return
    setSaving(true)
    try {
      const res = await fetch("/api/catalogue/bom", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          description: editData.description,
          category: editData.category,
          stockCode: editData.stockCode || null,
          unitCost: parseFloat(editData.unitCost || "0"),
          quantity: parseFloat(editData.quantity || "1"),
          scalesWithSize: editData.scalesWithSize,
        }),
      })
      if (!res.ok) throw new Error("Failed to save")
      const updated = await res.json()
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingId
            ? {
                ...i,
                description: updated.description,
                category: updated.category,
                stockCode: updated.stockCode,
                quantity: String(updated.quantity),
                unitCost: String(updated.unitCost),
                scalesWithSize: updated.scalesWithSize,
              }
            : i
        )
      )
      setEditingId(null)
      setEditData({})
    } catch {
      alert("Failed to save changes")
    } finally {
      setSaving(false)
    }
  }, [editingId, editData, unlocked])

  const deleteItem = useCallback(async (id: string) => {
    if (!unlocked) { requestUnlock(); return }
    if (!confirm("Delete this BOM item?")) return
    try {
      const res = await fetch(`/api/catalogue/bom?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {
      alert("Failed to delete item")
    }
  }, [unlocked, requestUnlock])

  const handleAddClick = useCallback(() => {
    if (!unlocked) { requestUnlock(); return }
    setAdding(true)
  }, [unlocked, requestUnlock])

  const addItem = useCallback(async () => {
    if (!newItem.description.trim() || !unlocked) return
    setSaving(true)
    try {
      const res = await fetch("/api/catalogue/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          description: newItem.description,
          category: newItem.category,
          stockCode: newItem.stockCode || null,
          unitCost: parseFloat(newItem.unitCost),
          quantity: parseFloat(newItem.quantity),
          scalesWithSize: newItem.scalesWithSize,
        }),
      })
      if (!res.ok) throw new Error("Failed to add")
      const created = await res.json()
      setItems((prev) => [
        ...prev,
        {
          id: created.id,
          description: created.description,
          category: created.category,
          stockCode: created.stockCode,
          quantity: String(created.quantity),
          unitCost: String(created.unitCost),
          scalesWithSize: created.scalesWithSize,
          sortOrder: created.sortOrder,
        },
      ])
      setAdding(false)
      setNewItem({ description: "", category: "MATERIALS", stockCode: "", quantity: "1", unitCost: "0", scalesWithSize: false })
    } catch {
      alert("Failed to add item")
    } finally {
      setSaving(false)
    }
  }, [variantId, newItem, unlocked])

  return (
    <div className="space-y-4">
      {/* Password prompt overlay */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <Card className="w-[400px]">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold">Unlock BOM Editor</h3>
              </div>
              <p className="text-sm text-gray-500">
                Enter your password to enable editing. The editor will remain unlocked until you lock it or refresh the page.
              </p>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verifyPassword()}
                autoFocus
              />
              {passwordError && (
                <p className="text-sm text-red-500">{passwordError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPasswordPrompt(false)}>
                  Cancel
                </Button>
                <Button onClick={verifyPassword} disabled={verifying || !password.trim()}>
                  {verifying ? "Verifying..." : "Unlock"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 mb-1">{familyName}</div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{variantName}</h2>
            <Badge variant="secondary">{variantCode}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{items.length} items</span>
          <span className="text-sm font-mono font-semibold">{formatCurrency(totalCost)}</span>
          {unlocked ? (
            <>
              <Button size="sm" onClick={handleAddClick} disabled={adding}>
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
              <Button size="sm" variant="outline" onClick={lockEditor} className="text-amber-600 border-amber-300 hover:bg-amber-50">
                <Unlock className="w-4 h-4 mr-1" /> Lock
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={requestUnlock}>
              <Lock className="w-4 h-4 mr-1" /> Unlock to Edit
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 w-[280px]">Description</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 w-[100px]">Stock Code</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 w-[100px]">Category</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500 w-[70px]">Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500 w-[90px]">Unit Cost</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500 w-[90px]">Total</th>
                  <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 w-[60px]">Scales</th>
                  {unlocked && <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500 w-[80px]">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) =>
                  editingId === item.id ? (
                    <tr key={item.id} className="bg-blue-50/50">
                      <td className="px-3 py-1.5">
                        <Input
                          value={editData.description || ""}
                          onChange={(e) => setEditData((d) => ({ ...d, description: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          value={editData.stockCode || ""}
                          onChange={(e) => setEditData((d) => ({ ...d, stockCode: e.target.value }))}
                          className="h-8 text-sm font-mono"
                          placeholder="—"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <select
                          value={editData.category || "MATERIALS"}
                          onChange={(e) => setEditData((d) => ({ ...d, category: e.target.value }))}
                          className="h-8 rounded border border-input bg-background px-2 text-sm"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          value={editData.quantity || ""}
                          onChange={(e) => setEditData((d) => ({ ...d, quantity: e.target.value }))}
                          className="h-8 text-sm text-right font-mono w-[70px]"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          value={editData.unitCost || ""}
                          onChange={(e) => setEditData((d) => ({ ...d, unitCost: e.target.value }))}
                          className="h-8 text-sm text-right font-mono w-[90px]"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-gray-400">
                        {formatCurrency(
                          parseFloat(editData.unitCost || "0") * parseFloat(editData.quantity || "1")
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={editData.scalesWithSize || false}
                          onChange={(e) => setEditData((d) => ({ ...d, scalesWithSize: e.target.checked }))}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit} disabled={saving}>
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                            <X className="w-4 h-4 text-gray-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={item.id} className="hover:bg-gray-50 group">
                      <td className="px-3 py-2 text-gray-700">{item.description}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-400">{item.stockCode || "—"}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-500">{item.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {parseFloat(item.unitCost) === 0 ? (
                          <span className="text-red-400">£0.00</span>
                        ) : (
                          formatCurrency(item.unitCost)
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-medium">
                        {formatCurrency(parseFloat(item.unitCost) * parseFloat(item.quantity))}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {item.scalesWithSize && <span className="text-[10px] text-blue-600">Yes</span>}
                      </td>
                      {unlocked && (
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(item)}>
                              <Pencil className="w-3.5 h-3.5 text-gray-400" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteItem(item.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                )}

                {/* Add new item row */}
                {adding && (
                  <tr className="bg-green-50/50">
                    <td className="px-3 py-1.5">
                      <Input
                        value={newItem.description}
                        onChange={(e) => setNewItem((n) => ({ ...n, description: e.target.value }))}
                        placeholder="Item description"
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        value={newItem.stockCode}
                        onChange={(e) => setNewItem((n) => ({ ...n, stockCode: e.target.value }))}
                        placeholder="Code"
                        className="h-8 text-sm font-mono"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={newItem.category}
                        onChange={(e) => setNewItem((n) => ({ ...n, category: e.target.value }))}
                        className="h-8 rounded border border-input bg-background px-2 text-sm"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem((n) => ({ ...n, quantity: e.target.value }))}
                        className="h-8 text-sm text-right font-mono w-[70px]"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        value={newItem.unitCost}
                        onChange={(e) => setNewItem((n) => ({ ...n, unitCost: e.target.value }))}
                        className="h-8 text-sm text-right font-mono w-[90px]"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-gray-400">
                      {formatCurrency(parseFloat(newItem.unitCost) * parseFloat(newItem.quantity))}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={newItem.scalesWithSize}
                        onChange={(e) => setNewItem((n) => ({ ...n, scalesWithSize: e.target.checked }))}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={addItem} disabled={saving}>
                          <Save className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAdding(false)}>
                          <X className="w-4 h-4 text-gray-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-gray-50/50">
                  <td colSpan={5} className="px-3 py-2 text-right text-sm font-semibold text-gray-700">
                    Total Base Cost
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-gray-900">
                    {formatCurrency(totalCost)}
                  </td>
                  <td colSpan={unlocked ? 2 : 1} />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
