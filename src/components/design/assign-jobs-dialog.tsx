"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type JobCard = {
  id: string
  jobType: string
  status: string
  assignedToId: string | null
}

type DesignCard = {
  id: string
  status: string
  targetEndDate: string | null
  product: {
    id: string
    description: string
    partCode: string
    productJobNumber: string | null
  }
  assignedDesigner: { id: string; name: string } | null
  jobCards: JobCard[]
}

type Designer = { id: string; name: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectNumber: string
  projectName: string
  designCards: DesignCard[]
  designers: Designer[]
}

const JOB_LABELS: Record<string, string> = {
  GA_DRAWING: "GA Drawing",
  PRODUCTION_DRAWINGS: "Production Drawings",
  BOM_FINALISATION: "BOM Finalisation",
  DESIGN_REVIEW: "Design Review",
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  BLOCKED: { bg: "bg-gray-100", text: "text-gray-500" },
  READY: { bg: "bg-slate-100", text: "text-slate-600" },
  IN_PROGRESS: { bg: "bg-blue-100", text: "text-blue-700" },
  SUBMITTED: { bg: "bg-amber-100", text: "text-amber-700" },
  APPROVED: { bg: "bg-emerald-100", text: "text-emerald-700" },
  SIGNED_OFF: { bg: "bg-green-100", text: "text-green-700" },
  REJECTED: { bg: "bg-red-100", text: "text-red-700" },
}

const ASSIGNABLE_TYPES = ["GA_DRAWING", "PRODUCTION_DRAWINGS", "BOM_FINALISATION", "DESIGN_REVIEW"]

export function AssignJobsDialog({ open, onOpenChange, projectId, projectNumber, projectName, designCards, designers }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const card of designCards) {
      for (const jc of card.jobCards) {
        if (jc.assignedToId) map[jc.id] = jc.assignedToId
      }
    }
    return map
  })
  const [deadlines, setDeadlines] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const card of designCards) {
      if (card.targetEndDate) {
        map[card.id] = new Date(card.targetEndDate).toISOString().split("T")[0]
      }
    }
    return map
  })
  const [deadlineSaving, setDeadlineSaving] = useState<Record<string, boolean>>({})
  const [deadlineSaved, setDeadlineSaved] = useState<Record<string, boolean>>({})

  if (!open) return null

  async function handleActivateDesign() {
    setActivating(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/activate-design`, { method: "POST" })
      if (res.ok) {
        router.refresh()
        onOpenChange(false)
        setTimeout(() => onOpenChange(true), 300)
      } else {
        const data = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(data.error || `Failed to activate design (${res.status})`)
      }
    } catch {
      setError("Network error — could not reach server")
    } finally {
      setActivating(false)
    }
  }

  async function handleAssign(jobCardId: string, designerId: string) {
    if (!designerId) return
    setError(null)
    setSaving((s) => ({ ...s, [jobCardId]: true }))
    setSaved((s) => ({ ...s, [jobCardId]: false }))

    try {
      const res = await fetch(`/api/design/jobs/${jobCardId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designerId }),
      })

      if (res.ok) {
        setAssignments((a) => ({ ...a, [jobCardId]: designerId }))
        setSaved((s) => ({ ...s, [jobCardId]: true }))
        setTimeout(() => setSaved((s) => ({ ...s, [jobCardId]: false })), 2000)
        setDirty(true)
      } else {
        const data = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(data.error || `Failed to assign (${res.status})`)
      }
    } catch {
      setError("Network error — could not reach server")
    } finally {
      setSaving((s) => ({ ...s, [jobCardId]: false }))
    }
  }

  async function handleAssignAll(card: DesignCard, designerId: string) {
    if (!designerId) return
    setError(null)

    const jobs = card.jobCards.filter(
      (jc) => ASSIGNABLE_TYPES.includes(jc.jobType) && jc.status !== "SIGNED_OFF"
    )

    const savingMap: Record<string, boolean> = {}
    for (const jc of jobs) savingMap[jc.id] = true
    setSaving((s) => ({ ...s, ...savingMap }))

    let hasError = false
    for (const jc of jobs) {
      try {
        const res = await fetch(`/api/design/jobs/${jc.id}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ designerId }),
        })

        if (res.ok) {
          setAssignments((a) => ({ ...a, [jc.id]: designerId }))
          setSaved((s) => ({ ...s, [jc.id]: true }))
          setTimeout(() => setSaved((s) => ({ ...s, [jc.id]: false })), 2000)
        } else {
          const data = await res.json().catch(() => ({ error: "Unknown error" }))
          setError(data.error || `Failed to assign ${JOB_LABELS[jc.jobType] || jc.jobType}`)
          hasError = true
          break
        }
      } catch {
        setError("Network error — could not reach server")
        hasError = true
        break
      }
    }

    const clearMap: Record<string, boolean> = {}
    for (const jc of jobs) clearMap[jc.id] = false
    setSaving((s) => ({ ...s, ...clearMap }))

    if (!hasError) setDirty(true)
  }

  async function handleDeadline(cardId: string, dateValue: string) {
    setDeadlines((d) => ({ ...d, [cardId]: dateValue }))
    if (!dateValue) return

    setError(null)
    setDeadlineSaving((s) => ({ ...s, [cardId]: true }))
    setDeadlineSaved((s) => ({ ...s, [cardId]: false }))

    try {
      const res = await fetch(`/api/design/cards/${cardId}/deadline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEndDate: dateValue }),
      })

      if (res.ok) {
        setDeadlineSaved((s) => ({ ...s, [cardId]: true }))
        setTimeout(() => setDeadlineSaved((s) => ({ ...s, [cardId]: false })), 2000)
        setDirty(true)
      } else {
        const data = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(data.error || "Failed to save deadline")
      }
    } catch {
      setError("Network error — could not save deadline")
    } finally {
      setDeadlineSaving((s) => ({ ...s, [cardId]: false }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={() => { if (dirty) router.refresh(); onOpenChange(false) }} />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl border border-border w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">Assign Jobs to Designers</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {projectNumber} — {projectName}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {designCards.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">No design cards found for this project.</p>
              <p className="text-xs text-gray-400 mt-2">Design cards need to be created before you can assign jobs to designers.</p>
              <button
                onClick={handleActivateDesign}
                disabled={activating}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {activating ? "Activating..." : "Activate Design"}
              </button>
            </div>
          ) : designers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">No designers available.</p>
              <p className="text-xs text-gray-400 mt-1">Ensure users with design roles (Design Engineer, Engineering Manager) exist in the system.</p>
            </div>
          ) : (
          <div className="space-y-6">
            {designCards.map((card) => {
              const assignableJobs = card.jobCards.filter((jc) => ASSIGNABLE_TYPES.includes(jc.jobType))
              const assignedIds = assignableJobs.map((jc) => assignments[jc.id] || "").filter(Boolean)
              const commonDesignerId =
                assignedIds.length === assignableJobs.length && assignedIds.length > 0 && new Set(assignedIds).size === 1
                  ? assignedIds[0]
                  : ""

              return (
                <div key={card.id} className="border border-border rounded-lg overflow-hidden">
                  {/* Product header with Assign All */}
                  <div className="bg-gray-50 px-4 py-2.5 border-b border-border">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{card.product.description}</div>
                        <div className="text-xs text-gray-500 font-mono">
                          {card.product.productJobNumber || card.product.partCode}
                          {card.assignedDesigner && (
                            <span className="ml-2 text-indigo-500">
                              Card designer: {card.assignedDesigner.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-gray-400 uppercase font-medium whitespace-nowrap">All jobs:</span>
                        <select
                          className="rounded-md border border-border px-2 py-1 text-xs focus:border-blue-500 focus:outline-none bg-white"
                          value={commonDesignerId}
                          onChange={(e) => {
                            if (e.target.value) handleAssignAll(card, e.target.value)
                          }}
                        >
                          <option value="">Select designer...</option>
                          {designers.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Deadline row */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                      <span className="text-[10px] text-gray-500 uppercase font-medium">Required Deadline</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          className="rounded-md border border-border px-2 py-1 text-xs focus:border-blue-500 focus:outline-none bg-white"
                          value={deadlines[card.id] || ""}
                          onChange={(e) => handleDeadline(card.id, e.target.value)}
                        />
                        <div className="w-5 flex items-center justify-center">
                          {deadlineSaving[card.id] && (
                            <svg className="w-3.5 h-3.5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          )}
                          {deadlineSaved[card.id] && !deadlineSaving[card.id] && (
                            <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Job cards table */}
                  <div className="divide-y divide-border">
                    {assignableJobs.map((jc) => {
                      const badge = STATUS_BADGE[jc.status] || STATUS_BADGE.BLOCKED
                      const currentDesignerId = assignments[jc.id] || ""
                      const isSaving = saving[jc.id]
                      const isSaved = saved[jc.id]

                      return (
                        <div key={jc.id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="w-[160px] shrink-0">
                            <span className="text-sm text-gray-700">{JOB_LABELS[jc.jobType] || jc.jobType}</span>
                          </div>

                          <div className="w-[100px] shrink-0">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                              {jc.status.replace(/_/g, " ")}
                            </span>
                          </div>

                          <div className="flex-1">
                            <select
                              className="w-full rounded-md border border-border px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:bg-gray-50"
                              value={currentDesignerId}
                              disabled={isSaving || jc.status === "SIGNED_OFF"}
                              onChange={(e) => {
                                if (e.target.value) handleAssign(jc.id, e.target.value)
                              }}
                            >
                              <option value="">Unassigned</option>
                              {designers.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="w-6 shrink-0 flex items-center justify-center">
                            {isSaving && (
                              <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            )}
                            {isSaved && !isSaving && (
                              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-gray-50 rounded-b-lg shrink-0">
          <div className="flex justify-end">
            <button
              onClick={() => { if (dirty) router.refresh(); onOpenChange(false) }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-border rounded-lg hover:bg-gray-50"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
