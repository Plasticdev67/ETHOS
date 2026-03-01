"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type Project = { id: string; projectNumber: string; name: string }
type Supplier = { id: string; name: string; email?: string }
type BomLine = {
  id: string
  description: string
  partNumber: string | null
  quantity: number
  unit: string
  unitCost: number
  category: string
  supplier: string | null
}

export default function NewEnquiryPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1: Project & BOM selection
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState("")
  const [bomLines, setBomLines] = useState<BomLine[]>([])
  const [selectedBomIds, setSelectedBomIds] = useState<Set<string>>(new Set())
  const [bomLoading, setBomLoading] = useState(false)

  // Step 2: Supplier selection
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<string>>(new Set())
  const [supplierSearch, setSupplierSearch] = useState("")

  // Step 3: Details
  const [subject, setSubject] = useState("")
  const [notes, setNotes] = useState("")

  // Load projects on mount
  useEffect(() => {
    async function loadProjects() {
      const res = await fetch("/api/projects?status=active")
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    }
    loadProjects()
  }, [])

  // Load suppliers on mount
  useEffect(() => {
    async function loadSuppliers() {
      const res = await fetch("/api/suppliers")
      if (res.ok) {
        const data = await res.json()
        setSuppliers(data)
      }
    }
    loadSuppliers()
  }, [])

  // Load BOM lines when project changes
  useEffect(() => {
    if (!selectedProject) {
      setBomLines([])
      setSelectedBomIds(new Set())
      return
    }
    let cancelled = false
    async function fetchBom() {
      setBomLoading(true)
      const res = await fetch(`/api/purchase-orders/suggest-bom?projectId=${selectedProject}`)
      if (res.ok && !cancelled) {
        const data: BomLine[] = await res.json()
        setBomLines(data)
        // Select all by default
        setSelectedBomIds(new Set(data.map((d) => d.id)))
      }
      if (!cancelled) setBomLoading(false)
    }
    fetchBom()
    return () => { cancelled = true }
  }, [selectedProject])

  function toggleBomLine(id: string) {
    setSelectedBomIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllBom() {
    if (selectedBomIds.size === bomLines.length) {
      setSelectedBomIds(new Set())
    } else {
      setSelectedBomIds(new Set(bomLines.map((b) => b.id || (b as unknown as { bomLineId: string }).bomLineId)))
    }
  }

  function toggleSupplier(id: string) {
    setSelectedSupplierIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredSuppliers = suppliers.filter(
    (s) =>
      !supplierSearch ||
      s.name.toLowerCase().includes(supplierSearch.toLowerCase())
  )

  async function handleSubmit() {
    if (!selectedProject || selectedBomIds.size === 0 || selectedSupplierIds.size === 0 || !subject.trim()) {
      return
    }

    setSaving(true)
    try {
      // Map BOM line IDs - handle both 'id' and 'bomLineId' fields
      const bomLineIds = Array.from(selectedBomIds)

      const res = await fetch("/api/finance/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject,
          subject: subject.trim(),
          notes: notes.trim() || undefined,
          bomLineIds,
          supplierIds: Array.from(selectedSupplierIds),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/purchasing/enquiries/${data.id}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const selectedProject_obj = projects.find((p) => p.id === selectedProject)

  const selectClass =
    "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/purchasing/enquiries">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">New Procurement Enquiry</h1>
          <p className="text-sm text-gray-500">
            Step {step} of 3 —{" "}
            {step === 1 ? "Select Items" : step === 2 ? "Select Suppliers" : "Review & Create"}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s < step
                  ? "bg-blue-600 text-white"
                  : s === step
                    ? "bg-blue-100 text-blue-700 ring-2 ring-blue-600"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div className={`w-12 h-0.5 ${s < step ? "bg-blue-600" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Project & BOM Lines */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Project & Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className={selectClass}
              >
                <option value="">Select a project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectNumber} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedProject && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>BOM Items</Label>
                  {bomLines.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAllBom}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      {selectedBomIds.size === bomLines.length ? "Deselect all" : "Select all"}
                    </button>
                  )}
                </div>

                {bomLoading ? (
                  <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading BOM items...
                  </div>
                ) : bomLines.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">
                    No purchasable BOM items found for this project.
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="border-b border-border">
                          <th className="px-3 py-2 w-8"></th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                            Description
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                            Part No.
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                            Qty
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                            Unit
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                            Est. Cost
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {bomLines.map((bl) => {
                          const lineId = bl.id || (bl as unknown as { bomLineId: string }).bomLineId
                          return (
                            <tr
                              key={lineId}
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => toggleBomLine(lineId)}
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedBomIds.has(lineId)}
                                  onChange={() => toggleBomLine(lineId)}
                                  className="rounded border-gray-300"
                                />
                              </td>
                              <td className="px-3 py-2 text-gray-900">{bl.description}</td>
                              <td className="px-3 py-2 font-mono text-gray-500 text-xs">
                                {bl.partNumber || "—"}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-700">{bl.quantity}</td>
                              <td className="px-3 py-2 text-gray-500">{bl.unit}</td>
                              <td className="px-3 py-2 text-right font-mono text-gray-600">
                                {bl.unitCost > 0 ? formatCurrency(bl.unitCost * bl.quantity) : "—"}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  {selectedBomIds.size} of {bomLines.length} items selected
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedProject || selectedBomIds.size === 0}
              >
                Next: Select Suppliers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Suppliers */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Suppliers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Search Suppliers</Label>
              <Input
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                placeholder="Filter suppliers..."
              />
            </div>

            <div className="rounded-lg border border-border overflow-hidden max-h-[400px] overflow-y-auto">
              {filteredSuppliers.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  No suppliers found.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredSuppliers.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSupplierIds.has(s.id)}
                        onChange={() => toggleSupplier(s.id)}
                        className="rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{s.name}</div>
                        {s.email && (
                          <div className="text-xs text-gray-500">{s.email}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {selectedSupplierIds.size} suppliers selected
            </p>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={selectedSupplierIds.size === 0}
              >
                Next: Review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Create */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create Enquiry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Materials for Flood Door Assembly"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes or requirements..."
                rows={3}
              />
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border border-border p-4 bg-gray-50/50">
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">Project</p>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedProject_obj
                    ? `${selectedProject_obj.projectNumber} — ${selectedProject_obj.name}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">Items</p>
                <p className="text-sm text-gray-900 mt-1">{selectedBomIds.size} line items</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">Suppliers</p>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedSupplierIds.size} suppliers
                </p>
                <div className="text-xs text-gray-500 mt-0.5">
                  {suppliers
                    .filter((s) => selectedSupplierIds.has(s.id))
                    .map((s) => s.name)
                    .join(", ")}
                </div>
              </div>
            </div>

            {/* Selected items summary */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-gray-500">Selected Items</p>
              <div className="rounded-lg border border-border overflow-hidden max-h-[200px] overflow-y-auto">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-border">
                    {bomLines
                      .filter((bl) => selectedBomIds.has(bl.id || (bl as unknown as { bomLineId: string }).bomLineId))
                      .map((bl) => (
                        <tr key={bl.id || (bl as unknown as { bomLineId: string }).bomLineId} className="bg-white">
                          <td className="px-3 py-1.5 text-gray-900">{bl.description}</td>
                          <td className="px-3 py-1.5 text-gray-500 font-mono">
                            {bl.partNumber || "—"}
                          </td>
                          <td className="px-3 py-1.5 text-right text-gray-700">
                            {bl.quantity} {bl.unit}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={saving || !subject.trim()}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create Enquiry
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
