"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, ChevronDown, ChevronUp } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type BomSuggestion = {
  bomLineId: string
  description: string
  partNumber: string | null
  supplier: string | null
  quantity: number
  unit: string
  unitCost: number
  category: string
}

export function CreatePoDialog({
  projects,
  suppliers: initialSuppliers,
}: {
  projects: { id: string; projectNumber: string; name: string }[]
  suppliers: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [supplierMode, setSupplierMode] = useState<"existing" | "new">("existing")
  const [selectedProject, setSelectedProject] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [suppliers, setSuppliers] = useState(initialSuppliers)

  // New supplier fields
  const [newSupplierName, setNewSupplierName] = useState("")
  const [newSupplierEmail, setNewSupplierEmail] = useState("")
  const [newSupplierPhone, setNewSupplierPhone] = useState("")
  const [newSupplierSupplies, setNewSupplierSupplies] = useState("")

  // BOM suggestions
  const [bomSuggestions, setBomSuggestions] = useState<BomSuggestion[]>([])
  const [selectedBomLines, setSelectedBomLines] = useState<Set<string>>(new Set())
  const [bomLoading, setBomLoading] = useState(false)
  const [bomExpanded, setBomExpanded] = useState(false)

  // Fetch BOM suggestions when project changes
  useEffect(() => {
    if (!selectedProject) {
      setBomSuggestions([])
      setSelectedBomLines(new Set())
      return
    }
    let cancelled = false
    async function fetchBom() {
      setBomLoading(true)
      const res = await fetch(`/api/purchase-orders/suggest-bom?projectId=${selectedProject}`)
      if (res.ok && !cancelled) {
        const data: BomSuggestion[] = await res.json()
        setBomSuggestions(data)
        setSelectedBomLines(new Set(data.map((d) => d.bomLineId)))
        setBomExpanded(data.length > 0)
      }
      if (!cancelled) setBomLoading(false)
    }
    fetchBom()
    return () => { cancelled = true }
  }, [selectedProject])

  function resetForm() {
    setSupplierMode("existing")
    setSelectedProject("")
    setSelectedSupplier("")
    setNewSupplierName("")
    setNewSupplierEmail("")
    setNewSupplierPhone("")
    setNewSupplierSupplies("")
    setBomSuggestions([])
    setSelectedBomLines(new Set())
    setBomExpanded(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData(e.currentTarget)

    try {
      let supplierId = selectedSupplier || null

      // Create new supplier first if needed
      if (supplierMode === "new" && newSupplierName.trim()) {
        const res = await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newSupplierName.trim(),
            email: newSupplierEmail.trim() || undefined,
            phone: newSupplierPhone.trim() || undefined,
            whatTheySupply: newSupplierSupplies.trim() || undefined,
          }),
        })
        if (res.ok) {
          const newSupplier = await res.json()
          supplierId = newSupplier.id
          setSuppliers((prev) => [...prev, { id: newSupplier.id, name: newSupplier.name }])
        }
      }

      // Build PO lines from selected BOM items
      const lines = bomSuggestions
        .filter((s) => selectedBomLines.has(s.bomLineId))
        .map((s) => ({
          description: s.description,
          quantity: s.quantity,
          unitCost: s.unitCost,
          totalCost: s.quantity * s.unitCost,
        }))

      const totalValue = formData.get("totalValue")
      const autoTotal = lines.length > 0
        ? lines.reduce((sum, l) => sum + l.totalCost, 0)
        : undefined

      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject,
          supplierId,
          totalValue: totalValue || autoTotal || undefined,
          expectedDelivery: formData.get("expectedDelivery") || undefined,
          notes: formData.get("notes") || undefined,
          lines: lines.length > 0 ? lines : undefined,
        }),
      })

      if (res.ok) {
        setOpen(false)
        resetForm()
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  function toggleBomLine(id: string) {
    setSelectedBomLines((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectClass =
    "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New PO
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project */}
          <div className="space-y-2">
            <Label htmlFor="projectId">Project *</Label>
            <select
              id="projectId"
              name="projectId"
              required
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className={selectClass}
            >
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectNumber} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier */}
          <div className="space-y-2">
            <Label>Supplier</Label>
            {supplierMode === "existing" ? (
              <div className="space-y-2">
                <select
                  value={selectedSupplier}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setSupplierMode("new")
                      setSelectedSupplier("")
                    } else {
                      setSelectedSupplier(e.target.value)
                    }
                  }}
                  className={selectClass}
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  <option value="__new__">+ New Supplier</option>
                </select>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-border p-3 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 uppercase">New Supplier</span>
                  <button
                    type="button"
                    onClick={() => { setSupplierMode("existing"); setNewSupplierName("") }}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Use existing
                  </button>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Supplier name *"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    required={supplierMode === "new"}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Email"
                      type="email"
                      value={newSupplierEmail}
                      onChange={(e) => setNewSupplierEmail(e.target.value)}
                    />
                    <Input
                      placeholder="Phone"
                      value={newSupplierPhone}
                      onChange={(e) => setNewSupplierPhone(e.target.value)}
                    />
                  </div>
                  <Input
                    placeholder="What they supply"
                    value={newSupplierSupplies}
                    onChange={(e) => setNewSupplierSupplies(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Value & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalValue">Total Value</Label>
              <Input id="totalValue" name="totalValue" type="number" step="0.01" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedDelivery">Expected Delivery</Label>
              <Input id="expectedDelivery" name="expectedDelivery" type="date" />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="PO description..." />
          </div>

          {/* BOM Suggestions */}
          {selectedProject && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setBomExpanded(!bomExpanded)}
                className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {bomExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                BOM Suggestions
                {bomSuggestions.length > 0 && (
                  <span className="ml-1 text-xs text-gray-500">
                    ({selectedBomLines.size}/{bomSuggestions.length} selected)
                  </span>
                )}
              </button>

              {bomExpanded && (
                <div className="rounded-lg border border-border overflow-hidden">
                  {bomLoading ? (
                    <div className="px-3 py-4 text-center text-xs text-gray-500">Loading BOM...</div>
                  ) : bomSuggestions.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-gray-500">
                      No purchasable BOM items found for this project.
                    </div>
                  ) : (
                    <div className="max-h-[200px] overflow-y-auto divide-y divide-border">
                      {bomSuggestions.map((s) => (
                        <label
                          key={s.bomLineId}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedBomLines.has(s.bomLineId)}
                            onChange={() => toggleBomLine(s.bomLineId)}
                            className="rounded border-gray-300"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-900 truncate">{s.description}</div>
                            <div className="text-xs text-gray-500">
                              {s.partNumber && <span className="font-mono mr-2">{s.partNumber}</span>}
                              {s.quantity} {s.unit}
                              {s.unitCost > 0 && <span className="ml-2">{formatCurrency(s.unitCost)}/ea</span>}
                            </div>
                          </div>
                          <span className="text-xs font-mono text-gray-600 whitespace-nowrap">
                            {formatCurrency(s.quantity * s.unitCost)}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create PO"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
