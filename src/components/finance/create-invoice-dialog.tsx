"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"

const invoiceTypes = [
  { value: "APPLICATION", label: "Application for Payment" },
  { value: "INTERIM_INVOICE", label: "Interim Invoice" },
  { value: "FINAL_ACCOUNT", label: "Final Account" },
  { value: "RETENTION_RELEASE", label: "Retention Release" },
  { value: "VARIATION", label: "Variation" },
]

export function CreateInvoiceDialog({
  projects,
}: {
  projects: { id: string; projectNumber: string; name: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [projectId, setProjectId] = useState("")
  const [type, setType] = useState("APPLICATION")
  const [applicationAmount, setApplicationAmount] = useState("")
  const [retentionHeld, setRetentionHeld] = useState("")
  const [cisDeduction, setCisDeduction] = useState("")
  const [periodFrom, setPeriodFrom] = useState("")
  const [periodTo, setPeriodTo] = useState("")
  const [dateDue, setDateDue] = useState("")
  const [notes, setNotes] = useState("")

  const netPayable = (parseFloat(applicationAmount) || 0) - (parseFloat(retentionHeld) || 0) - (parseFloat(cisDeduction) || 0)

  async function handleSubmit() {
    if (!projectId || !applicationAmount) return
    setSaving(true)
    try {
      const res = await fetch("/api/sales-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          type,
          applicationAmount,
          retentionHeld: retentionHeld || "0",
          cisDeduction: cisDeduction || "0",
          periodFrom: periodFrom || null,
          periodTo: periodTo || null,
          dateDue: dateDue || null,
          dateSubmitted: new Date().toISOString(),
          notes: notes || null,
        }),
      })
      if (res.ok) {
        setOpen(false)
        setProjectId("")
        setType("APPLICATION")
        setApplicationAmount("")
        setRetentionHeld("")
        setCisDeduction("")
        setPeriodFrom("")
        setPeriodTo("")
        setDateDue("")
        setNotes("")
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const selectClass = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Invoice / Application</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Project *</Label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={selectClass}>
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.projectNumber} — {p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
                {invoiceTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Application Amount *</Label>
              <Input type="number" step="0.01" value={applicationAmount} onChange={(e) => setApplicationAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Retention Held</Label>
              <Input type="number" step="0.01" value={retentionHeld} onChange={(e) => setRetentionHeld(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>CIS Deduction</Label>
              <Input type="number" step="0.01" value={cisDeduction} onChange={(e) => setCisDeduction(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {applicationAmount && (
            <div className="rounded-lg border border-border bg-gray-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Net Payable:</span>
                <span className="font-mono font-semibold">£{netPayable.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Period From</Label>
              <Input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Period To</Label>
              <Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={dateDue} onChange={(e) => setDateDue(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Valuation period, cert reference, etc." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!projectId || !applicationAmount || saving}>
              {saving ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
