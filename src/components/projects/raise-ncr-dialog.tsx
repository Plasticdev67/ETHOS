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

const severities = [
  { value: "MINOR", label: "Minor" },
  { value: "MAJOR", label: "Major" },
  { value: "CRITICAL", label: "Critical" },
]

export function RaiseNcrDialog({
  projectId,
  products,
  productsWithDesignCards = [],
}: {
  projectId: string
  products: { id: string; partCode: string; description: string }[]
  productsWithDesignCards?: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData(e.currentTarget)
    const productId = formData.get("productId") || null
    const data = {
      projectId,
      productId,
      title: formData.get("title"),
      description: formData.get("description") || null,
      severity: formData.get("severity") || "MINOR",
      costImpact: formData.get("costImpact") || null,
      requireDesignRework: formData.get("requireDesignRework") === "on" && productId && productsWithDesignCards.includes(productId as string),
    }

    try {
      const res = await fetch("/api/ncrs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const selectClass =
    "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Raise NCR
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Raise Non-Conformance Report</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" required placeholder="Brief description of the issue..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="productId">Product (optional)</Label>
            <select id="productId" name="productId" className={selectClass}>
              <option value="">Project-level NCR</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.partCode} — {p.description}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <select id="severity" name="severity" className={selectClass} defaultValue="MINOR">
                {severities.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="costImpact">Cost Impact (£)</Label>
              <Input id="costImpact" name="costImpact" type="number" step="0.01" placeholder="0.00" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} placeholder="Detailed description of the non-conformance..." />
          </div>

          {productsWithDesignCards.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <input type="checkbox" id="requireDesignRework" name="requireDesignRework" className="rounded" />
              <Label htmlFor="requireDesignRework" className="text-sm text-amber-800 cursor-pointer">
                Require design rework for selected product
              </Label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Raising..." : "Raise NCR"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
