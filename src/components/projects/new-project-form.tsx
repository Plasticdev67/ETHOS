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

export function NewProjectForm({
  customers,
  users,
}: {
  customers: { id: string; name: string }[]
  users: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData)

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const project = await res.json()
      router.push(`/projects/${project.id}`)
    } finally {
      setSaving(false)
    }
  }

  const selectClass = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="space-y-6 p-6">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input id="name" name="name" required placeholder="e.g. Essex Flood Gates Package 2" />
          </div>

          {/* Customer & Coordinator */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer</Label>
              <select id="customerId" name="customerId" className={selectClass}>
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coordinatorId">Project Coordinator</Label>
              <select id="coordinatorId" name="coordinatorId" className={selectClass}>
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
              <select id="projectManagerId" name="projectManagerId" className={selectClass}>
                <option value="">Select manager...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="installManagerId">Install Manager</Label>
              <select id="installManagerId" name="installManagerId" className={selectClass}>
                <option value="">Select manager...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority & Classification & Value */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select id="priority" name="priority" className={selectClass}>
                {priorities.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="classification">Classification</Label>
              <select id="classification" name="classification" className={selectClass}>
                {classifications.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedValue">Estimated Value</Label>
              <Input id="estimatedValue" name="estimatedValue" type="number" step="0.01" placeholder="0.00" />
            </div>
          </div>

          {/* Type & Work Stream */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type</Label>
              <select id="projectType" name="projectType" className={selectClass}>
                {projectTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workStream">Work Stream</Label>
              <select id="workStream" name="workStream" className={selectClass}>
                {workStreams.map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sales Stage & Contract Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salesStage">Sales Stage</Label>
              <select id="salesStage" name="salesStage" className={selectClass}>
                {salesStages.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractType">Contract Type</Label>
              <select id="contractType" name="contractType" className={selectClass}>
                {contractTypes.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Site Location & Region */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siteLocation">Site Location</Label>
              <Input id="siteLocation" name="siteLocation" placeholder="e.g. Essex, UK" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectRegion">Region</Label>
              <Input id="projectRegion" name="projectRegion" placeholder="e.g. South Wales" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="enquiryReceived">Enquiry Received</Label>
              <Input id="enquiryReceived" name="enquiryReceived" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetCompletion">Target Completion</Label>
              <Input id="targetCompletion" name="targetCompletion" type="date" />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" placeholder="Any additional notes..." rows={3} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
