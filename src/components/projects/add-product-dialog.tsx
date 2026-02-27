"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"

export function AddProductDialog({
  projectId,
  catalogueItems,
  users,
}: {
  projectId: string
  catalogueItems: { id: string; partCode: string; description: string }[]
  users: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedCatalogue, setSelectedCatalogue] = useState("")

  function handleCatalogueChange(catalogueId: string) {
    setSelectedCatalogue(catalogueId)
    if (catalogueId) {
      const item = catalogueItems.find((c) => c.id === catalogueId)
      if (item) {
        const partInput = document.getElementById("partCode") as HTMLInputElement
        const descInput = document.getElementById("description") as HTMLInputElement
        if (partInput) partInput.value = item.partCode
        if (descInput) descInput.value = item.description
      }
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData(e.currentTarget)
    const data: Record<string, unknown> = {
      projectId,
      partCode: formData.get("partCode"),
      description: formData.get("description"),
      additionalDetails: formData.get("additionalDetails") || null,
      quantity: parseInt(formData.get("quantity") as string) || 1,
      allocatedDesignerId: formData.get("allocatedDesignerId") || null,
      coordinatorId: formData.get("coordinatorId") || null,
      catalogueItemId: selectedCatalogue || null,
      requiredCompletionDate: formData.get("requiredCompletionDate") || null,
    }

    try {
      await fetch(`/api/projects/${projectId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      setOpen(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Product to Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Catalogue item (optional autofill) */}
          <div className="space-y-2">
            <Label htmlFor="catalogueItem">From Catalogue (optional)</Label>
            <select
              id="catalogueItem"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedCatalogue}
              onChange={(e) => handleCatalogueChange(e.target.value)}
            >
              <option value="">Custom product...</option>
              {catalogueItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.partCode} — {item.description}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="partCode">Part Code *</Label>
              <Input id="partCode" name="partCode" required placeholder="e.g. FG-01" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input id="description" name="description" required placeholder="e.g. Flood Gate 2.4m x 1.8m" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalDetails">Additional Details</Label>
            <Textarea id="additionalDetails" name="additionalDetails" rows={2} placeholder="Any extra specs..." />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Qty</Label>
              <Input id="quantity" name="quantity" type="number" min="1" defaultValue="1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allocatedDesignerId">Designer</Label>
              <select
                id="allocatedDesignerId"
                name="allocatedDesignerId"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coordinatorId">Coordinator</Label>
              <select
                id="coordinatorId"
                name="coordinatorId"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="requiredCompletionDate">Required Completion Date</Label>
            <Input id="requiredCompletionDate" name="requiredCompletionDate" type="date" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
