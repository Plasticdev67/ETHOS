"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type HandoverProduct = {
  id: string
  partCode: string
  description: string
}

type Handover = {
  id: string
  projectId: string
  status: string
  checklist: { item: string; checked: boolean }[]
  designNotes: string | null
  includedProductIds: string[]
  initiatedAt: string | null
  acknowledgedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  project: {
    id: string
    projectNumber: string
    name: string
    customer: { name: string } | null
    products: HandoverProduct[]
  }
  initiatedBy: { id: string; name: string } | null
  receivedBy: { id: string; name: string } | null
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function HandoverTrackingPanel({ handovers: initialHandovers }: { handovers: Handover[] }) {
  const [handovers, setHandovers] = useState(initialHandovers)
  const [collapsed, setCollapsed] = useState(false)

  const waiting = handovers.filter((h) => h.status === "SUBMITTED")
  const returned = handovers.filter((h) => h.status === "REJECTED")
  const accepted = handovers.filter((h) => h.status === "ACKNOWLEDGED")

  const totalPending = waiting.length + returned.length

  if (handovers.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-white">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">My Handover Proposals</h2>
          {totalPending > 0 && (
            <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">
              {totalPending}
            </span>
          )}
        </div>
        <svg
          className={cn("w-4 h-4 text-gray-400 transition-transform", collapsed ? "" : "rotate-180")}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-4 border-t border-border">
          {/* Waiting for Production */}
          {waiting.length > 0 && (
            <div className="mt-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <span className="text-amber-500">&#9203;</span> Waiting for Production
              </h3>
              <div className="space-y-2">
                {waiting.map((h) => (
                  <HandoverCard key={h.id} handover={h} variant="waiting" />
                ))}
              </div>
            </div>
          )}

          {/* Returned by Production */}
          {returned.length > 0 && (
            <div className="mt-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <span className="text-red-500">&#8617;</span> Returned by Production
              </h3>
              <div className="space-y-2">
                {returned.map((h) => (
                  <HandoverCard key={h.id} handover={h} variant="returned" onRepropose={(id) => setHandovers(prev => prev.map(ho => ho.id === id ? { ...ho, status: "SUBMITTED" } : ho))} />
                ))}
              </div>
            </div>
          )}

          {/* Recently Accepted */}
          {accepted.length > 0 && (
            <div className="mt-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <span className="text-green-500">&#10003;</span> Recently Accepted
              </h3>
              <div className="space-y-2">
                {accepted.slice(0, 5).map((h) => (
                  <HandoverCard key={h.id} handover={h} variant="accepted" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HandoverCard({ handover, variant, onRepropose }: { handover: Handover; variant: "waiting" | "returned" | "accepted"; onRepropose?: (id: string) => void }) {
  const [reproposing, setReproposing] = useState(false)

  const includedProducts = handover.project.products.filter(
    (p) => (handover.includedProductIds as string[]).includes(p.id)
  )
  const isPartial = includedProducts.length < handover.project.products.length

  async function handleRepropose() {
    setReproposing(true)
    try {
      const res = await fetch(`/api/design/handover/${handover.projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includedProductIds: handover.includedProductIds }),
      })
      if (res.ok) onRepropose?.(handover.id)
    } finally {
      setReproposing(false)
    }
  }

  return (
    <div className={cn(
      "rounded-lg border p-3",
      variant === "waiting" ? "border-amber-200 bg-amber-50/50" :
      variant === "returned" ? "border-red-200 bg-red-50/50" :
      "border-green-200 bg-green-50/50"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/projects/${handover.project.id}`}
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            {handover.project.projectNumber} — {handover.project.name}
          </Link>
          <div className="text-xs text-gray-500 mt-0.5">
            {handover.project.customer?.name || "No customer"}
          </div>
        </div>
        <div className="text-[10px] text-gray-400 shrink-0">
          {variant === "waiting" && handover.initiatedAt && `proposed ${timeAgo(handover.initiatedAt)}`}
          {variant === "returned" && handover.rejectedAt && `returned ${timeAgo(handover.rejectedAt)}`}
          {variant === "accepted" && handover.acknowledgedAt && `accepted ${timeAgo(handover.acknowledgedAt)}`}
        </div>
      </div>

      {/* Products included */}
      <div className="mt-1.5 text-[10px] text-gray-600">
        {isPartial ? (
          <span>{includedProducts.length} of {handover.project.products.length} products ({includedProducts.map((p) => p.partCode).join(", ")})</span>
        ) : (
          <span>All {handover.project.products.length} products</span>
        )}
      </div>

      {/* Returned reason */}
      {variant === "returned" && handover.rejectionReason && (
        <div className="mt-2 p-2 rounded bg-red-100 border border-red-200">
          <div className="text-[10px] font-medium text-red-700 mb-0.5">Reason:</div>
          <div className="text-xs text-red-800">{handover.rejectionReason}</div>
        </div>
      )}

      {/* Status-specific footer */}
      {variant === "waiting" && (
        <div className="mt-2 text-[10px] text-amber-600 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Production has not yet reviewed
        </div>
      )}

      {variant === "returned" && (
        <div className="mt-2 flex gap-2">
          <Link
            href={`/projects/${handover.project.id}`}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-50"
          >
            Open Project
          </Link>
          <button
            onClick={handleRepropose}
            disabled={reproposing}
            className="inline-flex items-center rounded-md bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {reproposing ? "Re-proposing..." : "Re-propose"}
          </button>
        </div>
      )}

      {variant === "accepted" && (
        <div className="mt-1.5 flex items-center gap-2">
          {handover.receivedBy && (
            <span className="text-[10px] text-green-600">Accepted by {handover.receivedBy.name}</span>
          )}
          <Link
            href="/production"
            className="text-[10px] text-blue-600 hover:underline"
          >
            View in Production
          </Link>
        </div>
      )}
    </div>
  )
}
