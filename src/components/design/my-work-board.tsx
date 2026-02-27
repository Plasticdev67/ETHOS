"use client"

import { useState } from "react"
import { JOB_TYPE_LABELS } from "@/lib/design-utils"
import { TaskActionButtons } from "./task-action-buttons"
import { BomEditorDialog } from "./bom-editor-dialog"

type JobCard = {
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
  estimatedHours: number | null
  actualHours: number | null
  notes: string | null
}

type DesignCard = {
  id: string
  status: string
  product: {
    id: string
    description: string
    partCode: string
    productJobNumber: string | null
    productionStatus: string | null
  }
  project: {
    id: string
    projectNumber: string
    name: string
  }
  assignedDesigner: { id: string; name: string } | null
  jobCards: JobCard[]
}

// Determine which column a product card belongs to based on its job cards
function getProductStage(card: DesignCard): string {
  if (card.status === "COMPLETE") return "COMPLETE"
  if (card.status === "QUEUED") return "QUEUED"

  // Find the current active job
  const activeJob = card.jobCards.find(
    (j) => j.status === "IN_PROGRESS" || j.status === "SUBMITTED" || j.status === "REJECTED"
  ) || card.jobCards.find((j) => j.status === "APPROVED") || card.jobCards.find((j) => j.status === "READY")

  if (activeJob) return activeJob.jobType

  // All done but card not complete?
  return "DESIGN_REVIEW"
}

const COLUMNS = [
  { id: "GA_DRAWING", label: "GA Drawing", borderColor: "border-t-blue-400", bg: "bg-blue-50/30" },
  { id: "PRODUCTION_DRAWINGS", label: "Prod Drawings", borderColor: "border-t-indigo-400", bg: "bg-indigo-50/30" },
  { id: "BOM_FINALISATION", label: "BOM", borderColor: "border-t-amber-400", bg: "bg-amber-50/30" },
  { id: "DESIGN_REVIEW", label: "Design Review", borderColor: "border-t-purple-400", bg: "bg-purple-50/30" },
  { id: "COMPLETE", label: "Complete", borderColor: "border-t-green-500", bg: "bg-green-50/30" },
]

export function MyWorkBoard({ cards }: { cards: DesignCard[] }) {
  const [bomOpen, setBomOpen] = useState(false)
  const [bomCard, setBomCard] = useState<DesignCard | null>(null)

  function openBom(card: DesignCard) {
    setBomCard(card)
    setBomOpen(true)
  }

  // Group cards into two maps:
  // 1. readyGrouped — cards placed by their active (workable) job stage
  // 2. waitingGrouped — cards placed by their first BLOCKED job stage
  const readyGrouped: Record<string, DesignCard[]> = {}
  const waitingGrouped: Record<string, DesignCard[]> = {}
  for (const col of COLUMNS) {
    readyGrouped[col.id] = []
    waitingGrouped[col.id] = []
  }

  for (const card of cards) {
    // Place card in its active job's column (ready section)
    const stage = getProductStage(card)
    if (readyGrouped[stage]) {
      readyGrouped[stage].push(card)
    } else {
      readyGrouped["GA_DRAWING"].push(card)
    }

    // Also find the first BLOCKED job → place in that column's waiting section
    const firstBlockedJob = card.jobCards.find((jc) => jc.status === "BLOCKED")
    if (firstBlockedJob && waitingGrouped[firstBlockedJob.jobType]) {
      waitingGrouped[firstBlockedJob.jobType].push(card)
    }
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const allReadyCards = readyGrouped[col.id]
          const waitingCards = waitingGrouped[col.id]

          // Split ready cards into "Live" (IN_PROGRESS) and "Ready" (others)
          const liveCards = allReadyCards.filter((card) => {
            const activeJob = card.jobCards.find(
              (j) => j.status === "IN_PROGRESS" || j.status === "SUBMITTED" || j.status === "REJECTED"
            )
            return activeJob?.status === "IN_PROGRESS"
          })
          const readyCards = allReadyCards.filter((card) => !liveCards.includes(card))
          const totalCount = allReadyCards.length + waitingCards.length

          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-lg border border-border ${col.borderColor} border-t-4 min-w-[260px] max-w-[300px] flex-1 shrink-0 ${col.bg}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <span className="text-xs font-semibold uppercase text-gray-700">{col.label}</span>
                <div className="flex items-center gap-1">
                  {liveCards.length > 0 && (
                    <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-blue-500 px-1.5 text-[10px] font-semibold text-white" title="In progress">
                      {liveCards.length}
                    </span>
                  )}
                  <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-gray-200 px-1.5 text-[10px] font-semibold text-gray-600">
                    {readyCards.length}
                  </span>
                  {waitingCards.length > 0 && (
                    <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-orange-100 px-1.5 text-[10px] font-semibold text-orange-600" title="Allocated but not ready">
                      +{waitingCards.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Live section — currently working on */}
              {liveCards.length > 0 && (
                <div className="bg-blue-50/70 border-b border-blue-200">
                  <div className="flex items-center gap-1.5 px-3 py-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                    </span>
                    <span className="text-[10px] font-semibold text-blue-700 uppercase">
                      Live ({liveCards.length})
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 px-2 pb-2">
                    {liveCards.map((card) => (
                      <ProductWorkCard key={card.id} card={card} onOpenBom={openBom} isLive />
                    ))}
                  </div>
                </div>
              )}

              {/* Ready cards — can work on now */}
              <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-400px)] min-h-[40px]">
                {readyCards.map((card) => (
                  <ProductWorkCard key={card.id} card={card} onOpenBom={openBom} />
                ))}
                {totalCount === 0 && (
                  <div className="py-6 text-center text-xs text-gray-400">
                    No tasks
                  </div>
                )}
              </div>

              {/* Not Ready section — predecessor not finished */}
              {waitingCards.length > 0 && (
                <div className="border-t border-dashed border-orange-300 mx-2">
                  <div className="flex items-center gap-1.5 px-2 py-1.5">
                    <svg className="w-3 h-3 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-[10px] font-semibold text-orange-600 uppercase">
                      Not Ready ({waitingCards.length})
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 px-2 pb-2 overflow-y-auto max-h-[400px]">
                    {waitingCards.map((card) => (
                      <WaitingWorkCard key={`waiting-${card.id}`} card={card} blockedJobType={col.id} onOpenBom={openBom} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Shared BOM Editor Dialog */}
      {bomCard && (
        <BomEditorDialog
          open={bomOpen}
          onOpenChange={(open) => { setBomOpen(open); if (!open) setBomCard(null) }}
          designCardId={bomCard.id}
          productDescription={bomCard.product.description}
          productJobNumber={bomCard.product.productJobNumber}
        />
      )}
    </>
  )
}

function WaitingWorkCard({ card, blockedJobType, onOpenBom }: { card: DesignCard; blockedJobType: string; onOpenBom: (card: DesignCard) => void }) {
  // Find the predecessor job that's blocking this stage
  const blockedJob = card.jobCards.find((jc) => jc.jobType === blockedJobType)
  const blockedIdx = blockedJob ? card.jobCards.indexOf(blockedJob) : -1
  const predecessorJob = blockedIdx > 0 ? card.jobCards[blockedIdx - 1] : null

  return (
    <div className="rounded-md border border-orange-200 bg-orange-50/50 p-2.5">
      <div className="flex items-start justify-between gap-1">
        <button onClick={() => onOpenBom(card)} className="min-w-0 text-left group">
          <div className="text-[11px] font-semibold text-gray-700 truncate group-hover:text-amber-700 transition-colors">{card.product.description}</div>
          <div className="text-[10px] text-gray-400 font-mono">
            {card.product.productJobNumber || card.product.partCode}
          </div>
        </button>
      </div>
      <div className="mt-1">
        <span className="text-[9px] text-gray-400">
          {card.project.projectNumber} — {card.project.name}
        </span>
      </div>
      {predecessorJob && (
        <div className="mt-1.5 flex items-center gap-1 text-[9px] text-orange-600">
          <svg className="w-3 h-3 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Waiting for <span className="font-semibold">{JOB_TYPE_LABELS[predecessorJob.jobType] || predecessorJob.jobType}</span></span>
          <span className={`px-1 py-0.5 rounded text-[8px] font-medium ${
            predecessorJob.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
            predecessorJob.status === "SUBMITTED" ? "bg-amber-100 text-amber-700" :
            predecessorJob.status === "READY" ? "bg-slate-100 text-slate-600" :
            "bg-gray-100 text-gray-500"
          }`}>
            {predecessorJob.status.replace(/_/g, " ")}
          </span>
        </div>
      )}
      {/* Mini progress dots */}
      <div className="flex gap-1 mt-2">
        {card.jobCards.map((jc) => {
          const color =
            jc.status === "SIGNED_OFF" ? "bg-green-500" :
            jc.status === "APPROVED" ? "bg-emerald-400" :
            jc.status === "SUBMITTED" ? "bg-amber-400" :
            jc.status === "IN_PROGRESS" ? "bg-blue-400" :
            jc.status === "READY" ? "bg-slate-300" :
            jc.status === "REJECTED" ? "bg-red-400" :
            "bg-gray-200"
          const labels: Record<string, string> = {
            GA_DRAWING: "GA",
            PRODUCTION_DRAWINGS: "Prod",
            BOM_FINALISATION: "BOM",
            DESIGN_REVIEW: "Review",
          }
          return (
            <div key={jc.id} className="flex-1">
              <div className={`h-1.5 rounded-full ${color}`} title={`${labels[jc.jobType] || jc.jobType}: ${jc.status.replace(/_/g, " ")}`} />
              <p className="text-[7px] text-gray-400 mt-0.5 text-center">{labels[jc.jobType] || jc.jobType}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProductWorkCard({ card, onOpenBom, isLive }: { card: DesignCard; onOpenBom: (card: DesignCard) => void; isLive?: boolean }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // Find the current active job card for action buttons
  const activeJob = card.jobCards.find(
    (j) => j.status === "IN_PROGRESS" || j.status === "SUBMITTED" || j.status === "REJECTED" || j.status === "READY" || j.status === "APPROVED"
  )

  const isComplete = card.status === "COMPLETE" && !activeJob
  const alreadyInProduction = !!card.product.productionStatus

  async function handleSendToHandover() {
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch(`/api/design/handover/${card.project.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includedProductIds: [card.product.id] }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setSendError(data.error || "Failed to send")
      }
    } catch {
      setSendError("Network error")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`rounded-lg border p-3 shadow-sm ${
      isLive ? "border-blue-300 bg-blue-50/50 ring-1 ring-blue-200/50" : "border-border bg-white"
    }`}>
      {/* Product info — click opens BOM */}
      <div className="flex items-start justify-between gap-1">
        <button onClick={() => onOpenBom(card)} className="min-w-0 text-left group">
          <div className="text-sm font-semibold text-gray-900 truncate group-hover:text-amber-700 transition-colors">{card.product.description}</div>
          <div className="text-xs text-gray-500 font-mono mt-0.5">
            {card.product.productJobNumber || card.product.partCode}
          </div>
        </button>
        <button
          onClick={() => onOpenBom(card)}
          className="p-1 text-gray-400 hover:text-amber-600 transition-colors shrink-0"
          title="Edit BOM"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </button>
      </div>

      {/* Small project ref */}
      <div className="mt-1.5">
        <span className="text-[10px] text-gray-400">
          {card.project.projectNumber} — {card.project.name}
        </span>
      </div>

      {/* Job cards progress — 4 mini bars — click opens BOM */}
      <div className="flex gap-1 mt-2">
        {card.jobCards.map((jc) => {
          const color =
            jc.status === "SIGNED_OFF" ? "bg-green-500" :
            jc.status === "APPROVED" ? "bg-emerald-400" :
            jc.status === "SUBMITTED" ? "bg-amber-400" :
            jc.status === "IN_PROGRESS" ? "bg-blue-400" :
            jc.status === "READY" ? "bg-slate-300" :
            jc.status === "REJECTED" ? "bg-red-400" :
            "bg-gray-200"
          const labels: Record<string, string> = {
            GA_DRAWING: "GA",
            PRODUCTION_DRAWINGS: "Prod",
            BOM_FINALISATION: "BOM",
            DESIGN_REVIEW: "Review",
          }
          return (
            <div key={jc.id} className="flex-1">
              <button onClick={() => onOpenBom(card)} className="w-full">
                <div className={`h-2 rounded-full ${color} hover:opacity-80 cursor-pointer`} title={`${labels[jc.jobType] || jc.jobType}: ${jc.status.replace(/_/g, " ")}`} />
              </button>
              <p className="text-[8px] text-gray-400 mt-0.5 text-center">{labels[jc.jobType] || jc.jobType}</p>
            </div>
          )
        })}
      </div>

      {/* Action button for the active job */}
      {activeJob && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500">
              {JOB_TYPE_LABELS[activeJob.jobType] || activeJob.jobType}
            </span>
            <TaskActionButtons jobCard={{ id: activeJob.id, status: activeJob.status, rejectionReason: activeJob.rejectionReason }} />
          </div>
        </div>
      )}

      {/* Completed indicator + handover button */}
      {isComplete && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-green-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs font-medium">Design Complete</span>
            </div>
            <button
              onClick={() => onOpenBom(card)}
              className="text-[10px] text-amber-600 hover:text-amber-700 hover:underline font-medium"
            >
              View BOM
            </button>
          </div>
          {/* Handover action */}
          {alreadyInProduction ? (
            <div className="mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded bg-blue-50 border border-blue-200">
              <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-[10px] font-medium text-blue-600">In Production</span>
            </div>
          ) : sent ? (
            <div className="mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded bg-amber-50 border border-amber-200">
              <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[10px] font-medium text-amber-600">Handover Proposed</span>
            </div>
          ) : (
            <>
              <button
                onClick={handleSendToHandover}
                disabled={sending}
                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {sending ? "Sending..." : "Send to Handover"}
              </button>
              {sendError && (
                <p className="mt-1 text-[9px] text-red-500">{sendError}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
