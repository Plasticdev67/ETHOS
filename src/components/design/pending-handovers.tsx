"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  getDesignCardStatusColor,
  getDesignCardStatusLabel,
  JOB_TYPE_LABELS,
} from "@/lib/design-utils"

type Handover = {
  id: string
  projectId: string
  status: string
  checklist: { item: string; checked: boolean }[]
  designNotes: string | null
  initiatedAt: string | null
  initiatedBy: { id: string; name: string } | null
  includedProductIds?: string[]
  project: {
    id: string
    projectNumber: string
    name: string
    customer: { name: string } | null
    designCards: {
      id: string
      status: string
      product: { id: string; description: string; partCode: string }
      jobCards: { jobType: string; status: string }[]
    }[]
  }
}

type Props = {
  handovers: Handover[]
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

export function PendingHandovers({ handovers }: Props) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")

  if (handovers.length === 0) {
    return (
      <div className="border border-border rounded-lg bg-white p-8 text-center">
        <p className="text-sm text-gray-500">No pending handovers at this time.</p>
      </div>
    )
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
    setRejectingId(null)
    setRejectionReason("")
    setErrorMessage("")
  }

  async function handleAcknowledge(handover: Handover) {
    setLoadingAction(handover.id + "-ack")
    setErrorMessage("")

    try {
      const res = await fetch(`/api/design/handover/${handover.projectId}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receivedById: "TODO" }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to acknowledge handover")
      }

      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleReject(handover: Handover) {
    if (!rejectionReason.trim()) {
      setErrorMessage("Please provide a rejection reason.")
      return
    }

    setLoadingAction(handover.id + "-rej")
    setErrorMessage("")

    try {
      const res = await fetch(`/api/design/handover/${handover.projectId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to reject handover")
      }

      setRejectingId(null)
      setRejectionReason("")
      router.refresh()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="border border-border rounded-lg bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Customer
            </th>
            <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Products
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Initiated By
            </th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {handovers.map((handover) => {
            const isExpanded = expandedId === handover.id
            const isRejecting = rejectingId === handover.id
            const isAcking = loadingAction === handover.id + "-ack"
            const isRejLoading = loadingAction === handover.id + "-rej"

            return (
              <tr key={handover.id} className="group">
                <td colSpan={6} className="p-0">
                  {/* Main row */}
                  <div className="flex items-center px-4 py-3">
                    <div className="flex-1 min-w-0 grid grid-cols-6 gap-4 items-center">
                      <div>
                        <Link
                          href={`/projects/${handover.project.id}`}
                          className="text-sm font-semibold text-blue-600 hover:underline"
                        >
                          {handover.project.projectNumber}
                        </Link>
                      </div>
                      <div className="text-sm text-gray-700 truncate">
                        {handover.project.name}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {handover.project.customer?.name || "—"}
                      </div>
                      <div className="text-center text-sm text-gray-700">
                        {handover.includedProductIds && handover.includedProductIds.length < handover.project.designCards.length ? (
                          <span>
                            <span className="font-semibold text-amber-700">{handover.includedProductIds.length}</span>
                            <span className="text-gray-400"> of {handover.project.designCards.length}</span>
                          </span>
                        ) : (
                          handover.project.designCards.length
                        )}
                      </div>
                      <div>
                        {handover.initiatedBy && (
                          <div>
                            <p className="text-sm text-gray-700">{handover.initiatedBy.name}</p>
                            {handover.initiatedAt && (
                              <p className="text-[10px] text-gray-400">
                                {new Date(handover.initiatedAt).toLocaleDateString("en-AU", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleExpand(handover.id)}
                          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {isExpanded ? "Collapse" : "Expand"}
                        </button>
                        <button
                          onClick={() => handleAcknowledge(handover)}
                          disabled={!!loadingAction}
                          className="inline-flex items-center rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isAcking ? "..." : "Acknowledge"}
                        </button>
                        <button
                          onClick={() => {
                            if (isRejecting) {
                              setRejectingId(null)
                              setRejectionReason("")
                            } else {
                              setRejectingId(handover.id)
                              setExpandedId(handover.id)
                            }
                          }}
                          disabled={!!loadingAction}
                          className="inline-flex items-center rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-gray-100 bg-gray-50/50">
                      {/* Error message */}
                      {errorMessage && (
                        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mt-3">
                          {errorMessage}
                        </div>
                      )}

                      {/* Rejection input */}
                      {isRejecting && (
                        <div className="mt-3 space-y-2">
                          <label className="block text-xs font-medium text-gray-700">
                            Rejection Reason
                          </label>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={3}
                            placeholder="Explain why this handover is being rejected..."
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-y"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReject(handover)}
                              disabled={!!loadingAction}
                              className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isRejLoading ? "Rejecting..." : "Confirm Rejection"}
                            </button>
                            <button
                              onClick={() => {
                                setRejectingId(null)
                                setRejectionReason("")
                              }}
                              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Checklist */}
                      <div className="mt-3">
                        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                          Checklist
                        </h3>
                        <div className="space-y-1">
                          {handover.checklist.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                              {item.checked ? (
                                <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                              <span className={`text-xs ${item.checked ? "text-gray-700" : "text-gray-400"}`}>
                                {item.item}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Design Notes */}
                      {handover.designNotes && (
                        <div>
                          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                            Design Notes
                          </h3>
                          <p className="text-xs text-gray-700 whitespace-pre-wrap bg-white border border-gray-200 rounded-md p-2">
                            {handover.designNotes}
                          </p>
                        </div>
                      )}

                      {/* Design Cards */}
                      <div>
                        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                          {handover.includedProductIds && handover.includedProductIds.length < handover.project.designCards.length
                            ? `Products in this handover (${handover.includedProductIds.length} of ${handover.project.designCards.length})`
                            : "Design Cards"}
                        </h3>
                        <div className="space-y-1.5">
                          {handover.project.designCards.map((card) => {
                            const isIncluded = !handover.includedProductIds ||
                              handover.includedProductIds.length === 0 ||
                              handover.includedProductIds.includes(card.product.id)
                            return (
                            <div
                              key={card.id}
                              className={`flex items-center justify-between rounded-md px-3 py-2 ${
                                isIncluded
                                  ? "bg-white border border-gray-200"
                                  : "bg-gray-50 border border-gray-100 opacity-50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-800">
                                  {card.product.description}
                                </span>
                                {card.product.partCode && (
                                  <span className="text-[10px] text-gray-400">
                                    {card.product.partCode}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  {card.jobCards.map((job, jIdx) => (
                                    <div
                                      key={jIdx}
                                      className="flex items-center gap-1"
                                      title={`${JOB_TYPE_LABELS[job.jobType] || job.jobType}: ${job.status}`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${getJobStatusDotColor(job.status)}`}
                                      />
                                      <span className="text-[9px] text-gray-400">
                                        {JOB_TYPE_LABELS[job.jobType]?.split(" ")[0] || job.jobType}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <Badge
                                  className={`text-[10px] ${getDesignCardStatusColor(card.status)}`}
                                >
                                  {getDesignCardStatusLabel(card.status)}
                                </Badge>
                                {!isIncluded && (
                                  <span className="text-[9px] text-gray-400 ml-1">not included</span>
                                )}
                              </div>
                            </div>
                          )})}
                        </div>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
