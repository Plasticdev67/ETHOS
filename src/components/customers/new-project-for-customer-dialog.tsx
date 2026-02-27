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

const projectTypes = [
  { value: "STANDARD", label: "Standard" },
  { value: "BESPOKE_MAJOR", label: "Bespoke / Major" },
]

const workStreams = [
  { value: "COMMUNITY", label: "Community" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "BESPOKE", label: "Bespoke" },
  { value: "BLAST", label: "Blast" },
  { value: "BUND_CONTAINMENT", label: "Bund / Containment" },
  { value: "REFURBISHMENT", label: "Refurbishment" },
  { value: "ADHOC", label: "Ad-hoc" },
]

const classifications = [
  { value: "NORMAL", label: "Normal" },
  { value: "MEGA", label: "Mega" },
  { value: "SUB_CONTRACT", label: "Sub-contract" },
]

export function NewProjectForCustomerDialog({
  customerId,
  customerName,
}: {
  customerId: string
  customerName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData(e.currentTarget)
    const data: Record<string, string | null> = {
      name: formData.get("name") as string,
      customerId,
      projectType: formData.get("projectType") as string,
      workStream: formData.get("workStream") as string,
      classification: formData.get("classification") as string,
      estimatedValue: (formData.get("estimatedValue") as string) || null,
      siteLocation: (formData.get("siteLocation") as string) || null,
      notes: (formData.get("notes") as string) || null,
    }

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const project = await res.json()
        setOpen(false)
        router.push(`/projects/${project.id}`)
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
          <Plus className="mr-1.5 h-4 w-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Project for {customerName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="np-name">Project Name *</Label>
            <Input
              id="np-name"
              name="name"
              required
              placeholder="e.g. Highway Barrier Installation Phase 2"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="np-type">Type</Label>
              <select id="np-type" name="projectType" className={selectClass}>
                {projectTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="np-stream">Work Stream</Label>
              <select id="np-stream" name="workStream" className={selectClass}>
                {workStreams.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="np-class">Classification</Label>
              <select
                id="np-class"
                name="classification"
                className={selectClass}
              >
                {classifications.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="np-value">Estimated Value</Label>
              <Input
                id="np-value"
                name="estimatedValue"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 50000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="np-site">Site Location</Label>
              <Input
                id="np-site"
                name="siteLocation"
                placeholder="e.g. Manchester"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="np-notes">Notes</Label>
            <Textarea
              id="np-notes"
              name="notes"
              placeholder="Any initial notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
