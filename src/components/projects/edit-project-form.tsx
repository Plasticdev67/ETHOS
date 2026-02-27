"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const projectTypes = [
  { value: "STANDARD", label: "Standard" },
  { value: "BESPOKE_MAJOR", label: "Bespoke/Major" },
]

const workStreams = [
  { value: "COMMUNITY", label: "Community" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "BESPOKE", label: "Bespoke" },
  { value: "BLAST", label: "Blast" },
  { value: "BUND_CONTAINMENT", label: "Bund Containment" },
  { value: "REFURBISHMENT", label: "Refurbishment" },
  { value: "ADHOC", label: "Ad-hoc" },
]

const salesStages = [
  { value: "OPPORTUNITY", label: "Opportunity" },
  { value: "QUOTED", label: "Quoted" },
  { value: "ORDER", label: "Order" },
]

const projectStatuses = [
  { value: "OPPORTUNITY", label: "Opportunity" },
  { value: "QUOTATION", label: "Quotation" },
  { value: "DESIGN", label: "Design" },
  { value: "MANUFACTURE", label: "Manufacture" },
  { value: "INSTALLATION", label: "Installation" },
  { value: "REVIEW", label: "Review" },
  { value: "COMPLETE", label: "Complete" },
]

const contractTypes = [
  { value: "STANDARD", label: "Standard" },
  { value: "NEC", label: "NEC" },
  { value: "FRAMEWORK_CALLOFF", label: "Framework Call-off" },
  { value: "OTHER", label: "Other" },
]

const priorities = [
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
]

const classifications = [
  { value: "NORMAL", label: "Normal" },
  { value: "MEGA", label: "Mega Project" },
  { value: "SUB_CONTRACT", label: "Sub-contract" },
]

const ragStatuses = [
  { value: "", label: "Not set" },
  { value: "GREEN", label: "Green" },
  { value: "AMBER", label: "Amber" },
  { value: "RED", label: "Red" },
]

const lifecycleStages = [
  { value: "P0", label: "P0 — Enquiry" },
  { value: "P1", label: "P1 — Quotation" },
  { value: "P2", label: "P2 — Order Handover" },
  { value: "P3", label: "P3 — Design Review" },
  { value: "P4", label: "P4 — Production Complete" },
  { value: "P5", label: "P5 — Handover / Close" },
]

function toDateInputValue(date: string | Date | null | undefined): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  return d.toISOString().split("T")[0]
}

type ProjectData = {
  id: string
  name: string
  projectNumber: string
  customerId: string | null
  coordinatorId: string | null
  projectManagerId: string | null
  installManagerId: string | null
  projectType: string
  workStream: string
  salesStage: string
  projectStatus: string
  contractType: string
  priority: string
  isICUFlag: boolean
  classification: string
  ragStatus: string | null
  siteLocation: string | null
  deliveryType: string | null
  projectRegion: string | null
  notes: string | null
  estimatedValue: string | number | null
  contractValue: string | number | null
  currentCost: string | number | null
  lifecycleStage: string
  enquiryReceived: string | Date | null
  quoteSubmitted: string | Date | null
  orderReceived: string | Date | null
  targetCompletion: string | Date | null
  actualCompletion: string | Date | null
  p0Date: string | Date | null
  p1Date: string | Date | null
  p2Date: string | Date | null
  p3Date: string | Date | null
  p4Date: string | Date | null
  p5Date: string | Date | null
}

export function EditProjectForm({
  project,
  customers,
  users,
}: {
  project: ProjectData
  customers: { id: string; name: string }[]
  users: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [isICU, setIsICU] = useState(project.isICUFlag)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData(e.currentTarget)
    const data: Record<string, unknown> = Object.fromEntries(formData)
    data.isICUFlag = isICU

    try {
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      router.push(`/projects/${project.id}`)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const selectClass = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="space-y-6 p-6">
          {/* Project Number (read only) */}
          <div className="space-y-2">
            <Label>Project Number</Label>
            <p className="font-mono text-sm font-medium text-gray-900">{project.projectNumber}</p>
          </div>

          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input id="name" name="name" required defaultValue={project.name} />
          </div>

          {/* Customer & Coordinator */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer</Label>
              <select id="customerId" name="customerId" className={selectClass} defaultValue={project.customerId || ""}>
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coordinatorId">Project Coordinator</Label>
              <select id="coordinatorId" name="coordinatorId" className={selectClass} defaultValue={project.coordinatorId || ""}>
                <option value="">Select coordinator...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Project Manager & Install Manager */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectManagerId">Project Manager</Label>
              <select id="projectManagerId" name="projectManagerId" className={selectClass} defaultValue={project.projectManagerId || ""}>
                <option value="">Select manager...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="installManagerId">Install Manager</Label>
              <select id="installManagerId" name="installManagerId" className={selectClass} defaultValue={project.installManagerId || ""}>
                <option value="">Select manager...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority, Classification, RAG */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select id="priority" name="priority" className={selectClass} defaultValue={project.priority}>
                {priorities.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="classification">Classification</Label>
              <select id="classification" name="classification" className={selectClass} defaultValue={project.classification}>
                {classifications.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ragStatus">RAG Status</Label>
              <select id="ragStatus" name="ragStatus" className={selectClass} defaultValue={project.ragStatus || ""}>
                {ragStatuses.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ICU Flag */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isICUFlag"
              checked={isICU}
              onChange={(e) => setIsICU(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isICUFlag" className="text-sm">
              ICU Flag — Mark this project for urgent attention on the Motherboard
            </Label>
          </div>

          {/* Lifecycle Stage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lifecycleStage">Lifecycle Stage (P0-P5)</Label>
              <select id="lifecycleStage" name="lifecycleStage" className={selectClass} defaultValue={project.lifecycleStage || "P0"}>
                {lifecycleStages.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Type & Work Stream */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type</Label>
              <select id="projectType" name="projectType" className={selectClass} defaultValue={project.projectType}>
                {projectTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workStream">Work Stream</Label>
              <select id="workStream" name="workStream" className={selectClass} defaultValue={project.workStream}>
                {workStreams.map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status & Sales Stage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectStatus">Project Status</Label>
              <select id="projectStatus" name="projectStatus" className={selectClass} defaultValue={project.projectStatus}>
                {projectStatuses.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salesStage">Sales Stage</Label>
              <select id="salesStage" name="salesStage" className={selectClass} defaultValue={project.salesStage}>
                {salesStages.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contract Type & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractType">Contract Type</Label>
              <select id="contractType" name="contractType" className={selectClass} defaultValue={project.contractType}>
                {contractTypes.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteLocation">Site Location</Label>
              <Input id="siteLocation" name="siteLocation" defaultValue={project.siteLocation || ""} />
            </div>
          </div>

          {/* Region & Delivery Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectRegion">Region</Label>
              <Input id="projectRegion" name="projectRegion" defaultValue={project.projectRegion || ""} placeholder="e.g. South Wales" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryType">Delivery Type</Label>
              <Input id="deliveryType" name="deliveryType" defaultValue={project.deliveryType || ""} placeholder="e.g. Supply & Install" />
            </div>
          </div>

          {/* Financial Values */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedValue">Estimated Value</Label>
              <Input id="estimatedValue" name="estimatedValue" type="number" step="0.01" defaultValue={project.estimatedValue ? String(project.estimatedValue) : ""} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractValue">Contract Value</Label>
              <Input id="contractValue" name="contractValue" type="number" step="0.01" defaultValue={project.contractValue ? String(project.contractValue) : ""} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentCost">Current Cost</Label>
              <Input id="currentCost" name="currentCost" type="number" step="0.01" defaultValue={project.currentCost ? String(project.currentCost) : ""} placeholder="0.00" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="enquiryReceived">Enquiry Received</Label>
              <Input id="enquiryReceived" name="enquiryReceived" type="date" defaultValue={toDateInputValue(project.enquiryReceived)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quoteSubmitted">Quote Submitted</Label>
              <Input id="quoteSubmitted" name="quoteSubmitted" type="date" defaultValue={toDateInputValue(project.quoteSubmitted)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderReceived">Order Received</Label>
              <Input id="orderReceived" name="orderReceived" type="date" defaultValue={toDateInputValue(project.orderReceived)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetCompletion">Target Completion</Label>
              <Input id="targetCompletion" name="targetCompletion" type="date" defaultValue={toDateInputValue(project.targetCompletion)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="actualCompletion">Actual Completion</Label>
              <Input id="actualCompletion" name="actualCompletion" type="date" defaultValue={toDateInputValue(project.actualCompletion)} />
            </div>
          </div>

          {/* P-Gate Dates */}
          <div className="border-t border-border pt-4">
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Lifecycle Gate Dates</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p0Date" className="text-xs">P0 — Enquiry</Label>
                <Input id="p0Date" name="p0Date" type="date" defaultValue={toDateInputValue(project.p0Date)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p1Date" className="text-xs">P1 — Quotation</Label>
                <Input id="p1Date" name="p1Date" type="date" defaultValue={toDateInputValue(project.p1Date)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p2Date" className="text-xs">P2 — Order Handover</Label>
                <Input id="p2Date" name="p2Date" type="date" defaultValue={toDateInputValue(project.p2Date)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p3Date" className="text-xs">P3 — Design Review</Label>
                <Input id="p3Date" name="p3Date" type="date" defaultValue={toDateInputValue(project.p3Date)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p4Date" className="text-xs">P4 — Production Complete</Label>
                <Input id="p4Date" name="p4Date" type="date" defaultValue={toDateInputValue(project.p4Date)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p5Date" className="text-xs">P5 — Handover / Close</Label>
                <Input id="p5Date" name="p5Date" type="date" defaultValue={toDateInputValue(project.p5Date)} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={project.notes || ""} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
