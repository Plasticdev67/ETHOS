"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { JOB_TYPE_LABELS } from "@/lib/design-utils"

type DesignCard = {
  id: string
  status: string
  estimatedHours: string | number | null
  actualHours: string | number | null
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
  }
  assignedDesigner: { id: string; name: string } | null
  jobCards: { id: string; jobType: string; status: string; assignedToId: string | null }[]
}

// Check if a card has any actionable work (not all BLOCKED/SIGNED_OFF)
function hasActionableJobs(card: DesignCard): boolean {
  return card.jobCards.some(
    (jc) => jc.status !== "BLOCKED" && jc.status !== "SIGNED_OFF"
  )
}

type Designer = {
  id: string
  name: string
}

function calcRemainingDays(cards: DesignCard[]): number {
  let totalRemainingHours = 0
  for (const card of cards) {
    const estimated = Number(card.estimatedHours) || 0
    const actual = Number(card.actualHours) || 0
    const remaining = Math.max(0, estimated - actual)
    totalRemainingHours += remaining
  }
  return Math.round(totalRemainingHours / 8 * 10) / 10
}

function getDaysColor(days: number): string {
  if (days === 0) return "text-green-600 bg-green-50"
  if (days <= 3) return "text-blue-600 bg-blue-50"
  if (days <= 7) return "text-amber-600 bg-amber-50"
  return "text-red-600 bg-red-50"
}

// Only show these 7 designers, in this order (match by first name)
const DESIGNER_FIRST_NAMES = ["Andrew", "David", "Gregg", "Kelan", "Reece", "Samuel", "Shaun"]

// Map alternate names to canonical first names
const NAME_ALIASES: Record<string, string> = { Dave: "David" }

function getFirstName(fullName: string): string {
  const first = fullName.split(" ")[0]
  return NAME_ALIASES[first] || first
}

const designerColors = [
  "border-t-blue-500",
  "border-t-emerald-500",
  "border-t-violet-500",
  "border-t-amber-500",
  "border-t-cyan-500",
  "border-t-rose-500",
  "border-t-lime-500",
]

export function DesignerWorkloadBoard({
  cards: initialCards,
  designers,
}: {
  cards: DesignCard[]
  designers: Designer[]
}) {
  const [cards, setCards] = useState(initialCards)

  // Sync state when server data changes
  useEffect(() => {
    setCards(initialCards)
  }, [initialCards])

  // Filter to the 7 specific designers, ordered by DESIGNER_FIRST_NAMES
  const filteredDesigners = DESIGNER_FIRST_NAMES.map((firstName) => {
    return designers.find((d) => getFirstName(d.name) === firstName)
  }).filter(Boolean) as Designer[]

  // Build designer columns from the filtered designers list
  // Group cards by designer ID
  const grouped: Record<string, DesignCard[]> = {}
  const designerMap: Record<string, Designer> = {}

  for (const d of filteredDesigners) {
    grouped[d.id] = []
    designerMap[d.id] = d
  }
  for (const card of cards) {
    if (card.assignedDesigner) {
      const dId = card.assignedDesigner.id
      if (grouped[dId]) {
        grouped[dId].push(card)
      }
      if (!designerMap[dId]) {
        designerMap[dId] = { id: dId, name: card.assignedDesigner.name }
      }
    }
  }

  // Build columns in fixed order matching DESIGNER_FIRST_NAMES
  const columns = filteredDesigners.map((d, i) => ({
    id: d.id,
    name: d.name,
    borderColor: designerColors[i % designerColors.length],
  }))

  async function handleDragEnd(result: DropResult) {
    const { draggableId, destination, source } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId) return

    const targetDesignerId = destination.droppableId
    const card = cards.find((c) => c.id === draggableId)
    if (!card) return

    const targetDesigner = designerMap[targetDesignerId]
    if (!targetDesigner) return

    // Optimistic update
    const previousCards = [...cards]
    setCards((prev) =>
      prev.map((c) =>
        c.id === draggableId
          ? { ...c, assignedDesigner: { id: targetDesignerId, name: targetDesigner.name } }
          : c
      )
    )

    // Persist to backend
    try {
      const res = await fetch("/api/design/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designCardIds: [draggableId],
          designerId: targetDesignerId,
        }),
      })
      if (!res.ok) {
        // Revert on failure
        setCards(previousCards)
      }
    } catch {
      setCards(previousCards)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Designer Workload</h2>
      <p className="text-xs text-gray-500 mb-3">
        Showing current active task per designer — drag cards between designers to reassign
      </p>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columns.map((col) => {
            const colCards = grouped[col.id] || []

            // Split into active (has actionable jobs) and waiting (all jobs blocked)
            const activeCards = colCards.filter(hasActionableJobs)
            const waitingCards = colCards.filter((c) => !hasActionableJobs(c))

            // Sort active: IN_PROGRESS first, then REVIEW, then QUEUED, then rest
            const sortedActive = [...activeCards].sort((a, b) => {
              const order: Record<string, number> = { IN_PROGRESS: 0, REVIEW: 1, QUEUED: 2 }
              return (order[a.status] ?? 3) - (order[b.status] ?? 3)
            })

            return (
              <Droppable key={col.id} droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col rounded-lg border border-border ${col.borderColor} border-t-4 min-w-[220px] max-w-[260px] flex-1 shrink-0 ${
                      snapshot.isDraggingOver ? "bg-blue-50/50" : "bg-gray-50/50"
                    }`}
                  >
                    {/* Header */}
                    <div className="px-3 py-2.5 border-b border-border space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700">{col.name}</span>
                        <div className="flex items-center gap-1">
                          <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-gray-200 px-1.5 text-[10px] font-semibold text-gray-600">
                            {activeCards.length}
                          </span>
                          {waitingCards.length > 0 && (
                            <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-orange-100 px-1.5 text-[10px] font-semibold text-orange-600" title="Allocated but not ready">
                              +{waitingCards.length}
                            </span>
                          )}
                        </div>
                      </div>
                      {colCards.length > 0 && (() => {
                        const remaining = calcRemainingDays(colCards)
                        const totalEst = colCards.reduce((s, c) => s + (Number(c.estimatedHours) || 0), 0)
                        const totalAct = colCards.reduce((s, c) => s + (Number(c.actualHours) || 0), 0)
                        const pct = totalEst > 0 ? Math.round((totalAct / totalEst) * 100) : 0
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getDaysColor(remaining)}`}>
                                {remaining === 0 ? "Caught up" : `${remaining}d remaining`}
                              </span>
                              <span className="text-[9px] text-gray-400">{pct}%</span>
                            </div>
                            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Active cards — ready to work on */}
                    <div className="flex flex-col gap-2 p-2 min-h-[60px]">
                      {sortedActive.length > 0 ? (
                        sortedActive.map((card, idx) => (
                          <Draggable key={card.id} draggableId={card.id} index={idx}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={dragSnapshot.isDragging ? "opacity-90 rotate-1" : ""}
                              >
                                <DesignerProductCard card={card} />
                              </div>
                            )}
                          </Draggable>
                        ))
                      ) : (
                        <div className="py-4 text-center text-xs text-gray-400">
                          No active task
                        </div>
                      )}
                      {provided.placeholder}
                    </div>

                    {/* Not Ready section — allocated but predecessor not finished */}
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
                        <div className="flex flex-col gap-1.5 px-2 pb-2">
                          {waitingCards.map((card) => (
                            <WaitingCard key={card.id} card={card} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}

function WaitingCard({ card }: { card: DesignCard }) {
  // Find the next job that will become ready (first BLOCKED job)
  const nextJob = card.jobCards.find((jc) => jc.status === "BLOCKED")
  // Find the predecessor job that's blocking it
  const predecessorJob = nextJob
    ? card.jobCards[card.jobCards.indexOf(nextJob) - 1]
    : null

  return (
    <Link href={`/projects/${card.project.id}`}>
      <div className="rounded-md border border-orange-200 bg-orange-50/50 px-2.5 py-2 hover:bg-orange-50 transition-colors">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-mono text-gray-400">{card.project.projectNumber}</span>
        </div>
        <div className="text-[10px] font-medium text-gray-700 truncate">{card.product.description}</div>
        <div className="text-[9px] text-gray-400 truncate">
          {card.product.productJobNumber || card.product.partCode}
        </div>
        {predecessorJob && nextJob && (
          <div className="mt-1 flex items-center gap-1 text-[9px] text-orange-600">
            <span>Waiting for</span>
            <span className="font-semibold">{JOB_TYPE_LABELS[predecessorJob.jobType] || predecessorJob.jobType}</span>
            <span className="text-gray-400">({predecessorJob.status.replace(/_/g, " ").toLowerCase()})</span>
          </div>
        )}
        {/* Mini progress dots */}
        <div className="flex gap-1 mt-1.5">
          {card.jobCards.map((jc) => (
            <div
              key={jc.id}
              className={`h-1 flex-1 rounded-full ${
                jc.status === "SIGNED_OFF" ? "bg-green-500" :
                jc.status === "APPROVED" ? "bg-emerald-400" :
                jc.status === "SUBMITTED" ? "bg-amber-400" :
                jc.status === "IN_PROGRESS" ? "bg-blue-400" :
                jc.status === "READY" ? "bg-slate-300" :
                jc.status === "REJECTED" ? "bg-red-400" :
                "bg-gray-200"
              }`}
              title={`${JOB_TYPE_LABELS[jc.jobType] || jc.jobType}: ${jc.status}`}
            />
          ))}
        </div>
      </div>
    </Link>
  )
}

function DesignerProductCard({ card }: { card: DesignCard }) {
  const activeJob = card.jobCards.find(
    (j) => j.status === "IN_PROGRESS" || j.status === "SUBMITTED" || j.status === "REJECTED"
  ) || card.jobCards.find((j) => j.status === "READY")

  const needsReview = activeJob?.status === "SUBMITTED"

  return (
    <Link href={needsReview ? `/design/jobs/${activeJob.id}` : `/projects/${card.project.id}`}>
      <div className={`rounded-lg border bg-white p-2.5 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
        needsReview ? "border-amber-300 ring-1 ring-amber-200" : "border-border"
      }`}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] font-mono text-gray-400">{card.project.projectNumber}</span>
          <span className={`text-[9px] font-semibold px-1 py-0.5 rounded ${
            card.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
            card.status === "REVIEW" ? "bg-amber-100 text-amber-700" :
            card.status === "QUEUED" ? "bg-gray-100 text-gray-600" :
            "bg-gray-100 text-gray-500"
          }`}>
            {card.status.replace("_", " ")}
          </span>
        </div>
        <div className="text-xs font-medium text-gray-900 truncate">{card.product.description}</div>
        <div className="text-[10px] text-gray-500 truncate mt-0.5">
          {card.product.productJobNumber || card.product.partCode}
        </div>

        {activeJob && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${
              activeJob.status === "IN_PROGRESS" ? "bg-blue-500" :
              activeJob.status === "SUBMITTED" ? "bg-amber-500" :
              activeJob.status === "REJECTED" ? "bg-red-500" :
              "bg-slate-400"
            }`} />
            <span className="text-[10px] text-gray-600">
              {JOB_TYPE_LABELS[activeJob.jobType] || activeJob.jobType}
            </span>
          </div>
        )}

        {/* Needs review indicator */}
        {needsReview && (
          <div className="mt-1.5 flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-1">
            <svg className="w-3 h-3 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-[10px] font-medium text-amber-700">Click to review</span>
          </div>
        )}

        {/* Mini progress dots */}
        <div className="flex gap-1 mt-1.5">
          {card.jobCards.map((jc) => (
            <div
              key={jc.id}
              className={`h-1 flex-1 rounded-full ${
                jc.status === "SIGNED_OFF" ? "bg-green-500" :
                jc.status === "APPROVED" ? "bg-emerald-400" :
                jc.status === "SUBMITTED" ? "bg-amber-400" :
                jc.status === "IN_PROGRESS" ? "bg-blue-400" :
                jc.status === "READY" ? "bg-slate-300" :
                jc.status === "REJECTED" ? "bg-red-400" :
                "bg-gray-200"
              }`}
              title={`${JOB_TYPE_LABELS[jc.jobType] || jc.jobType}: ${jc.status}`}
            />
          ))}
        </div>
      </div>
    </Link>
  )
}
