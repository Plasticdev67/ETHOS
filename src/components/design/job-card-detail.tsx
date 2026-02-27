"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import {
  JOB_TYPE_LABELS,
  getDesignJobStatusColor,
  getDesignJobStatusLabel,
  getDesignCardStatusColor,
  getDesignCardStatusLabel,
} from "@/lib/design-utils"
import { TaskActionButtons } from "@/components/design/task-action-buttons"
import { StatusTimeline } from "@/components/design/status-timeline"
import { formatDate } from "@/lib/utils"

type AuditEntry = {
  id: string
  action: string
  entity: string
  entityId: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  metadata: string | null
  userName: string | null
  createdAt: string
}

type JobCardData = {
  id: string
  designCardId: string
  jobType: string
  status: string
  sortOrder: number
  assignedToId: string | null
  reviewerId: string | null
  startedAt: string | null
  submittedAt: string | null
  approvedAt: string | null
  signedOffAt: string | null
  rejectedAt: string | null
  reviewNotes: string | null
  rejectionReason: string | null
  estimatedHours: string | null
  actualHours: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  designCard: {
    id: string
    status: string
    product: {
      id: string
      description: string
      partCode: string
      productJobNumber: string | null
    }
    project: {
      id: string
      projectNumber: string
      name: string
      customer: { name: string } | null
    }
    assignedDesigner: { id: string; name: string } | null
  }
  assignedTo: { id: string; name: string } | null
  reviewer: { id: string; name: string } | null
}

export function JobCardDetail({
  jobCard,
  auditLog,
}: {
  jobCard: JobCardData
  auditLog: AuditEntry[]
}) {
  const router = useRouter()
  const [reviewNotes, setReviewNotes] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { designCard } = jobCard
  const { product, project } = designCard

  async function handleApprove() {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/design/jobs/${jobCard.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNotes: reviewNotes || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to approve")
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      setError("Rejection reason is required")
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/design/jobs/${jobCard.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to reject")
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/design" className="hover:text-blue-600 hover:underline">
          Design
        </Link>
        <span>/</span>
        <Link
          href={`/projects/${project.id}`}
          className="hover:text-blue-600 hover:underline"
        >
          {project.projectNumber}
        </Link>
        <span>/</span>
        <span className="text-gray-700 truncate max-w-[200px]" title={product.description}>
          {product.description}
        </span>
        <span>/</span>
        <span className="text-gray-900 font-medium">
          {JOB_TYPE_LABELS[jobCard.jobType] || jobCard.jobType}
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-gray-900">
            {JOB_TYPE_LABELS[jobCard.jobType] || jobCard.jobType}
          </h1>
          <p className="text-sm text-gray-500">
            {product.description}
            {product.productJobNumber && (
              <span className="ml-2 text-gray-400">({product.productJobNumber})</span>
            )}
          </p>
          {project.customer && (
            <p className="text-xs text-gray-400">{project.customer.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getDesignJobStatusColor(jobCard.status)}>
            {getDesignJobStatusLabel(jobCard.status)}
          </Badge>
          <TaskActionButtons
            jobCard={{
              id: jobCard.id,
              status: jobCard.status,
              rejectionReason: jobCard.rejectionReason,
            }}
          />
        </div>
      </div>

      {/* Status Timeline */}
      <div className="border border-border rounded-lg bg-white p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Lifecycle</h2>
        <StatusTimeline currentStatus={jobCard.status} />
      </div>

      {/* Details Grid */}
      <div className="border border-border rounded-lg bg-white p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          <DetailRow label="Assigned To" value={jobCard.assignedTo?.name || "Unassigned"} />
          <DetailRow label="Reviewer" value={jobCard.reviewer?.name || "Not set"} />
          <DetailRow label="Design Card Designer" value={designCard.assignedDesigner?.name || "Unassigned"} />
          <DetailRow
            label="Design Card Status"
            value={
              <Badge className={`text-[10px] ${getDesignCardStatusColor(designCard.status)}`}>
                {getDesignCardStatusLabel(designCard.status)}
              </Badge>
            }
          />
          <DetailRow label="Started" value={formatDate(jobCard.startedAt)} />
          <DetailRow label="Submitted" value={formatDate(jobCard.submittedAt)} />
          <DetailRow label="Approved" value={formatDate(jobCard.approvedAt)} />
          <DetailRow label="Signed Off" value={formatDate(jobCard.signedOffAt)} />
          <DetailRow
            label="Estimated Hours"
            value={jobCard.estimatedHours ? `${jobCard.estimatedHours}h` : "\u2014"}
          />
          <DetailRow
            label="Actual Hours"
            value={jobCard.actualHours ? `${jobCard.actualHours}h` : "\u2014"}
          />
          <div className="sm:col-span-2">
            <DetailRow label="Notes" value={jobCard.notes || "\u2014"} />
          </div>
        </div>
      </div>

      {/* Rejection Info */}
      {jobCard.status === "REJECTED" && jobCard.rejectionReason && (
        <div className="border border-red-200 rounded-lg bg-red-50 p-4">
          <h2 className="text-sm font-medium text-red-800 mb-2">Rejection</h2>
          <p className="text-sm text-red-700">{jobCard.rejectionReason}</p>
          {jobCard.rejectedAt && (
            <p className="text-xs text-red-500 mt-2">
              Rejected on {formatDate(jobCard.rejectedAt)}
            </p>
          )}
        </div>
      )}

      {/* Review Section (only when SUBMITTED) */}
      {jobCard.status === "SUBMITTED" && (
        <div className="border border-amber-200 rounded-lg bg-amber-50 p-4 space-y-4">
          <h2 className="text-sm font-medium text-amber-800">Review Actions</h2>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Approve */}
          <div className="space-y-2">
            <label htmlFor="reviewNotes" className="block text-sm font-medium text-gray-700">
              Review Notes (optional)
            </label>
            <textarea
              id="reviewNotes"
              rows={2}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add any notes for this review..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Approving..." : "Approve"}
            </button>
          </div>

          <hr className="border-amber-200" />

          {/* Reject */}
          <div className="space-y-2">
            <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700">
              Rejection Reason (required to reject)
            </label>
            <textarea
              id="rejectionReason"
              rows={2}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this is being rejected..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
            />
            <button
              onClick={handleReject}
              disabled={isSubmitting}
              className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Rejecting..." : "Reject"}
            </button>
          </div>
        </div>
      )}

      {/* Audit Trail */}
      <div className="border border-border rounded-lg bg-white p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Audit Trail</h2>
        {auditLog.length === 0 ? (
          <p className="text-sm text-gray-400">No audit entries yet.</p>
        ) : (
          <div className="space-y-3">
            {auditLog.map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  )
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const date = new Date(entry.createdAt)
  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  const formattedTime = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })

  let parsedMetadata: Record<string, unknown> | null = null
  if (entry.metadata) {
    try {
      parsedMetadata = JSON.parse(entry.metadata)
    } catch {
      // ignore parse errors
    }
  }

  return (
    <div className="flex gap-3 text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
      <div className="flex-shrink-0 w-28 text-gray-400">
        <div>{formattedDate}</div>
        <div className="text-xs">{formattedTime}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-700">{entry.action}</span>
          {entry.field && (
            <span className="text-gray-500">
              <span className="font-mono text-xs bg-gray-100 px-1 rounded">{entry.field}</span>
            </span>
          )}
          {entry.userName && (
            <span className="text-xs text-gray-400">by {entry.userName}</span>
          )}
        </div>
        {(entry.oldValue || entry.newValue) && (
          <div className="mt-0.5 text-xs text-gray-500">
            {entry.oldValue && (
              <span className="line-through text-red-400 mr-2">{entry.oldValue}</span>
            )}
            {entry.newValue && (
              <span className="text-green-600">{entry.newValue}</span>
            )}
          </div>
        )}
        {parsedMetadata && (
          <div className="mt-0.5 text-xs text-gray-400 font-mono truncate" title={entry.metadata || ""}>
            {Object.entries(parsedMetadata)
              .filter(([, v]) => v !== null && v !== undefined)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")}
          </div>
        )}
      </div>
    </div>
  )
}
