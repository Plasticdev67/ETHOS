"use client"

import { useState, useEffect } from "react"
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

type Prospect = {
  id: string
  companyName: string
  contactName: string | null
}

export function NewLeadDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loadingProspects, setLoadingProspects] = useState(false)

  // Fetch prospects when dialog opens
  useEffect(() => {
    if (!open) return
    setLoadingProspects(true)
    fetch("/api/prospects")
      .then((res) => res.json())
      .then((data) => setProspects(data))
      .catch(() => {})
      .finally(() => setLoadingProspects(false))
  }, [open])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      prospectId: formData.get("prospectId"),
      name: formData.get("name"),
      estimatedValue: formData.get("estimatedValue") || undefined,
      contactPerson: formData.get("contactPerson") || undefined,
      expectedCloseDate: formData.get("expectedCloseDate") || undefined,
      notes: formData.get("notes") || undefined,
    }

    try {
      const res = await fetch("/api/opportunities", {
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          New Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prospectId">Prospect (Company) *</Label>
            {loadingProspects ? (
              <div className="text-sm text-gray-400 py-2">Loading prospects...</div>
            ) : (
              <select
                id="prospectId"
                name="prospectId"
                required
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select a prospect...</option>
                {prospects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.companyName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-name">Lead / Opportunity Name *</Label>
            <Input
              id="lead-name"
              name="name"
              required
              placeholder="e.g. Steel Fabrication - Phase 2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead-estimatedValue">Estimated Value (&pound;)</Label>
              <Input
                id="lead-estimatedValue"
                name="estimatedValue"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 25000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-expectedCloseDate">Expected Close Date</Label>
              <Input
                id="lead-expectedCloseDate"
                name="expectedCloseDate"
                type="date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-contactPerson">Contact Person</Label>
            <Input
              id="lead-contactPerson"
              name="contactPerson"
              placeholder="e.g. John Smith"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-notes">Notes</Label>
            <Textarea
              id="lead-notes"
              name="notes"
              placeholder="Additional details about this lead..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || loadingProspects}>
              {saving ? "Adding..." : "Add Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
