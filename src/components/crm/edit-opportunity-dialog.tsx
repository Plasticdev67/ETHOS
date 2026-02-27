"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Award, Trash2, ExternalLink } from "lucide-react"

const STATUSES = [
  { value: "ACTIVE_LEAD", label: "Active Lead" },
  { value: "QUOTED", label: "Quoted" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
]

const LEAD_SOURCES = [
  { value: "REFERRAL", label: "Referral" },
  { value: "WEBSITE", label: "Website" },
  { value: "TRADE_SHOW", label: "Trade Show" },
  { value: "COLD_CALL", label: "Cold Call" },
  { value: "REPEAT_BUSINESS", label: "Repeat Business" },
  { value: "TENDER_PORTAL", label: "Tender Portal" },
  { value: "OTHER", label: "Other" },
]

type Opportunity = {
  id: string
  prospectId: string
  name: string
  description: string | null
  estimatedValue: string | number | null
  contactPerson: string | null
  leadSource: string
  status: string
  expectedCloseDate: string | null
  notes: string | null
  sortOrder: number
  convertedProjectId?: string | null
}

type Props = {
  opportunity: Opportunity
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (updated: Opportunity) => void
}

export function EditOpportunityDialog({ opportunity, open, onOpenChange, onUpdate }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)
  const [showConvertConfirm, setShowConvertConfirm] = useState(false)
  const [convertResult, setConvertResult] = useState<{ projectNumber: string; projectId: string } | null>(null)

  const isConverted = opportunity.status === "WON" && !!opportunity.convertedProjectId

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData)

    try {
      const res = await fetch(`/api/opportunities/${opportunity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate({ ...opportunity, ...updated })
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleConvert() {
    setConverting(true)
    try {
      const res = await fetch(`/api/opportunities/${opportunity.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (res.ok) {
        const result = await res.json()
        setConvertResult(result)
        setShowConvertConfirm(false)
        router.refresh()
      } else {
        const error = await res.json()
        alert(`Conversion failed: ${error.error}`)
      }
    } finally {
      setConverting(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this opportunity? This cannot be undone.")) return

    await fetch(`/api/opportunities/${opportunity.id}`, { method: "DELETE" })
    router.refresh()
    onOpenChange(false)
  }

  const expectedCloseDateValue = opportunity.expectedCloseDate
    ? new Date(opportunity.expectedCloseDate).toISOString().split("T")[0]
    : ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Opportunity</DialogTitle>
        </DialogHeader>

        {/* Conversion success banner */}
        {convertResult && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
            <p className="text-sm font-semibold text-green-800">
              Successfully converted to Project #{convertResult.projectNumber}
            </p>
            <a
              href={`/projects/${convertResult.projectId}`}
              className="inline-flex items-center gap-1 text-sm text-green-700 underline hover:text-green-900"
            >
              View Project <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Already converted banner */}
        {isConverted && !convertResult && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              This opportunity has been converted to a project.
            </p>
          </div>
        )}

        {/* Convert confirmation panel */}
        {showConvertConfirm && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-800 font-semibold">
              <Award className="h-5 w-5" />
              Convert to Project
            </div>
            <p className="text-sm text-green-700">
              This will create a Customer (if needed) and a new Project (P0) from this opportunity. Continue?
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleConvert}
                disabled={converting}
                className="bg-green-600 hover:bg-green-700"
              >
                {converting ? "Converting..." : "Confirm Conversion"}
              </Button>
              <Button variant="outline" onClick={() => setShowConvertConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Opportunity Name *</Label>
            <Input id="edit-name" name="name" required defaultValue={opportunity.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" name="description" defaultValue={opportunity.description || ""} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <select
                id="edit-status"
                name="status"
                defaultValue={opportunity.status}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-leadSource">Lead Source</Label>
              <select
                id="edit-leadSource"
                name="leadSource"
                defaultValue={opportunity.leadSource}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {LEAD_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-estimatedValue">Estimated Value (£)</Label>
              <Input
                id="edit-estimatedValue"
                name="estimatedValue"
                type="number"
                step="0.01"
                min="0"
                defaultValue={opportunity.estimatedValue ? String(opportunity.estimatedValue) : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-expectedCloseDate">Expected Close Date</Label>
              <Input
                id="edit-expectedCloseDate"
                name="expectedCloseDate"
                type="date"
                defaultValue={expectedCloseDateValue}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-contactPerson">Contact Person</Label>
            <Input id="edit-contactPerson" name="contactPerson" defaultValue={opportunity.contactPerson || ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea id="edit-notes" name="notes" defaultValue={opportunity.notes || ""} rows={2} />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <div className="flex gap-2">
              {!isConverted && !convertResult && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => setShowConvertConfirm(true)}
                >
                  <Award className="mr-1 h-4 w-4" />
                  Convert to Project
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleDelete}
              >
                <Trash2 className="mr-1 h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
