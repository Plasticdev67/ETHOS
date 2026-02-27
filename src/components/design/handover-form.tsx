"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import {
  DEFAULT_HANDOVER_CHECKLIST,
  getDesignCardStatusColor,
  getDesignCardStatusLabel,
  JOB_TYPE_LABELS,
} from "@/lib/design-utils"

type Props = {
  project: {
    id: string
    projectNumber: string
    name: string
    customer: { name: string } | null
    designCards: {
      id: string
      status: string
      product: {
        id: string
        description: string
        partCode: string
        productJobNumber: string | null
      }
      jobCards: { id: string; jobType: string; status: string }[]
    }[]
    designHandover: {
      id: string
      status: string
      checklist: { item: string; checked: boolean }[]
      designNotes: string | null
      initiatedBy: { id: string; name: string } | null
      receivedBy: { id: string; name: string } | null
      initiatedAt: string | null
      acknowledgedAt: string | null
      rejectedAt: string | null
      rejectionReason: string | null
    } | null
  }
}

function getJobStatusDotColor(status: string): string {
  switch (status) {
    case "SIGNED_OFF":
      return "bg-green-500"
    case "APPROVED":
      return "bg-emerald-400"
    case "SUBMITTED":
      return "bg-amber-400"
    case "IN_PROGRESS":
      return "bg-blue-400"
    case "READY":
      return "bg-slate-300"
    case "REJECTED":
      return "bg-red-400"
    default:
      return "bg-gray-200"
  }
}

function getHandoverStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-700" },
    SUBMITTED: { label: "Submitted", className: "bg-blue-100 text-blue-700" },
    ACKNOWLEDGED: { label: "Acknowledged", className: "bg-green-100 text-green-700" },
    REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700" },
  }
  return map[status] || { label: status, className: "bg-gray-100 text-gray-600" }
}

export function HandoverForm({ project }: Props) {
  const router = useRouter()
  const handover = project.designHandover

  const initialChecklist = handover?.checklist?.length
    ? handover.checklist
    : DEFAULT_HANDOVER_CHECKLIST.map((item) => ({ item, checked: false }))

  const [checklist, setChecklist] = useState(initialChecklist)
  const [designNotes, setDesignNotes] = useState(handover?.designNotes || "")
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const allCardsComplete = project.designCards.length > 0 && project.designCards.every((c) => c.status === "COMPLETE")
  const readyCount = project.designCards.filter((c) => c.status === "COMPLETE").length
  const totalCount = project.designCards.length

  function toggleChecklistItem(index: number) {
    setChecklist((prev) =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    )
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSuccessMessage("")
    setErrorMessage("")

    try {
      const res = await fetch(`/api/design/handover/${project.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist, designNotes }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to submit handover")
      }

      setSuccessMessage("Handover submitted successfully.")
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const isResubmission = handover?.status === "REJECTED"
  const isEditable = !handover || handover.status === "DRAFT" || handover.status === "REJECTED"

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Design Handover — {project.projectNumber} {project.name}
        </h1>
        {project.customer && (
          <p className="text-sm text-gray-500 mt-1">{project.customer.name}</p>
        )}
      </div>

      {/* Handover Status */}
      {handover && (
        <div className="border border-border rounded-lg bg-white p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Handover Status:</span>
            <Badge className={getHandoverStatusBadge(handover.status).className}>
              {getHandoverStatusBadge(handover.status).label}
            </Badge>
          </div>

          {handover.status === "SUBMITTED" && (
            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md p-3">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Awaiting acknowledgement from Production
            </div>
          )}

          {handover.status === "ACKNOWLEDGED" && (
            <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Handover acknowledged</p>
                {handover.acknowledgedAt && (
                  <p className="text-xs text-green-600 mt-0.5">
                    on {new Date(handover.acknowledgedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                {handover.receivedBy && (
                  <p className="text-xs text-green-600">by {handover.receivedBy.name}</p>
                )}
              </div>
            </div>
          )}

          {handover.status === "REJECTED" && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Handover rejected</p>
                {handover.rejectionReason && (
                  <p className="text-xs text-red-600 mt-0.5">Reason: {handover.rejectionReason}</p>
                )}
                {handover.rejectedAt && (
                  <p className="text-xs text-red-600 mt-0.5">
                    on {new Date(handover.rejectedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                <p className="text-xs text-red-600 mt-1 font-medium">
                  Please address the issues and resubmit.
                </p>
              </div>
            </div>
          )}

          {handover.initiatedBy && handover.initiatedAt && (
            <p className="text-xs text-gray-500">
              Initiated by {handover.initiatedBy.name} on{" "}
              {new Date(handover.initiatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
      )}

      {/* Readiness Check */}
      <div className="border border-border rounded-lg bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Readiness Check</h2>
          <span className="text-xs text-gray-500">
            {readyCount} of {totalCount} products ready
          </span>
        </div>

        <div className="space-y-2">
          {project.designCards.map((card) => {
            const allSignedOff = card.jobCards.length > 0 && card.jobCards.every((j) => j.status === "SIGNED_OFF")
            return (
              <div key={card.id} className="border border-gray-100 rounded-md p-3 bg-gray-50/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {allSignedOff ? (
                      <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span className="text-sm font-medium text-gray-800">
                      {card.product.description}
                    </span>
                    {card.product.partCode && (
                      <span className="text-xs text-gray-400">{card.product.partCode}</span>
                    )}
                  </div>
                  <Badge className={`text-[10px] ${getDesignCardStatusColor(card.status)}`}>
                    {getDesignCardStatusLabel(card.status)}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 ml-6">
                  {card.jobCards.map((job) => (
                    <div key={job.id} className="flex items-center gap-1" title={`${JOB_TYPE_LABELS[job.jobType] || job.jobType}: ${job.status}`}>
                      <span className={`w-2 h-2 rounded-full ${getJobStatusDotColor(job.status)}`} />
                      <span className="text-[10px] text-gray-500">
                        {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Checklist */}
      {isEditable && (
        <div className="border border-border rounded-lg bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Handover Checklist</h2>
          <div className="space-y-2">
            {checklist.map((item, index) => (
              <label key={index} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleChecklistItem(index)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{item.item}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Read-only checklist for submitted/acknowledged */}
      {!isEditable && handover && (
        <div className="border border-border rounded-lg bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Handover Checklist</h2>
          <div className="space-y-2">
            {handover.checklist.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                {item.checked ? (
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className={`text-sm ${item.checked ? "text-gray-700" : "text-gray-400"}`}>
                  {item.item}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="border border-border rounded-lg bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">Design Notes</h2>
        {isEditable ? (
          <textarea
            value={designNotes}
            onChange={(e) => setDesignNotes(e.target.value)}
            rows={4}
            placeholder="Add any notes for the production team..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
          />
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {handover?.designNotes || "No notes provided."}
          </p>
        )}
      </div>

      {/* Submit / Resubmit */}
      {isEditable && (
        <div className="space-y-3">
          {!allCardsComplete && (
            <p className="text-xs text-amber-600">
              All design cards must be complete before submitting a handover.
            </p>
          )}

          {successMessage && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!allCardsComplete || submitting}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? "Submitting..."
              : isResubmission
              ? "Resubmit Handover"
              : "Submit Handover"}
          </button>
        </div>
      )}
    </div>
  )
}
