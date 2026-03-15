"use client"

import { useState, useEffect, memo } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { usePermissions } from "@/hooks/use-permissions"
import { AssignJobsDialog } from "./assign-jobs-dialog"
import { HandoverSelectDialog } from "./handover-select-dialog"
import { AwaitingResponseDialog, ResumeFromWaitButton } from "./wait-event-dialog"

type JobCard = {
  id: string
  jobType: string
  status: string
  assignedToId: string | null
}

type WaitEvent = {
  id: string
  reason: string
  notes: string | null
  externalParty: string | null
  triggeredAt: string
  resolvedAt: string | null
  triggeredBy: { id: string; name: string } | null
}

type DesignCard = {
  id: string
  status: string
  targetEndDate: string | null
  updatedAt: string
  product: {
    id: string
    description: string
    partCode: string
    productJobNumber: string | null
    productionStatus: string | null
  }
  assignedDesigner: { id: string; name: string } | null
  jobCards: JobCard[]
  waitEvents?: WaitEvent[]
}

type ProductInfo = {
  id: string
  description: string
  partCode: string
  productJobNumber: string | null
  quantity: number
}

type HandoverInfo = {
  id: string
  status: string
  includedProductIds: string[]
}

export type ProjectGroup = {
  id: string
  projectNumber: string
  name: string
  targetCompletion: string | null
  customer: { name: string } | null
  projectManager: { name: string } | null
  priority: string
  contractValue: string | number | null
  products: ProductInfo[]
  designCards: DesignCard[]
  handover?: HandoverInfo | null
}

type Designer = { id: string; name: string }

// Get the current stage for an individual product design card
function getProductStage(card: DesignCard): string {
  if (card.status === "COMPLETE") return "COMPLETE"
  if (card.status === "QUEUED") return "QUEUED"
  if (card.status === "AWAITING_RESPONSE") return "AWAITING_RESPONSE"

  const activeJob = card.jobCards.find(
    (j) => j.status === "IN_PROGRESS" || j.status === "SUBMITTED" || j.status === "REJECTED"
  ) || card.jobCards.find((j) => j.status === "APPROVED") || card.jobCards.find((j) => j.status === "READY")

  if (activeJob) return activeJob.jobType
  return "DESIGN_REVIEW"
}

// Determine the project's column — 4 buckets matching the spec
function getProjectDesignStage(project: ProjectGroup): string {
  const cards = project.designCards
  if (cards.length === 0) return "WAITING"
  if (cards.every((c) => c.status === "COMPLETE")) return "DESIGN_COMPLETE"
  if (cards.every((c) => c.status === "QUEUED")) return "WAITING"

  // Check if any products have completed design but haven't been handed to production yet
  const handoverableProducts = cards.filter(
    (c) => c.status === "COMPLETE" && !c.product.productionStatus
  )

  // If there are products ready for handover, show in DESIGN_COMPLETE
  if (handoverableProducts.length > 0) return "DESIGN_COMPLETE"

  // Check what stages active (non-complete) cards are at
  const activeCards = cards.filter((c) => c.status !== "COMPLETE")
  const stages = activeCards.map((c) => getProductStage(c))

  // If any card is in REVIEW status, AWAITING_RESPONSE, or has jobs in DESIGN_REVIEW/BOM_FINALISATION submitted
  const hasReviewStage = activeCards.some((c) => c.status === "REVIEW" || c.status === "AWAITING_RESPONSE") ||
    stages.some((s) => s === "DESIGN_REVIEW" || s === "BOM_FINALISATION")

  // If any card is in early work stages → IN_PROGRESS
  const hasWorkStage = stages.some((s) =>
    s === "QUEUED" || s === "GA_DRAWING" || s === "PRODUCTION_DRAWINGS"
  )
  if (hasWorkStage) return "IN_PROGRESS"

  // All active products are in review/approval stages
  if (hasReviewStage) return "REVIEW"

  return "IN_PROGRESS"
}

const COLUMNS = [
  { id: "WAITING", label: "Waiting", borderColor: "border-t-gray-400", bg: "bg-gray-50/50", description: "Projects waiting for design to start" },
  { id: "IN_PROGRESS", label: "In Progress", borderColor: "border-t-blue-400", bg: "bg-blue-50/30", description: "Actively being designed" },
  { id: "REVIEW", label: "Review / Approval", borderColor: "border-t-amber-500", bg: "bg-amber-50/30", description: "Waiting for client or internal review" },
  { id: "DESIGN_COMPLETE", label: "Design Complete", borderColor: "border-t-green-500", bg: "bg-blue-50", description: "Ready for handover to production" },
]

const priorityBadge: Record<string, string> = {
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
}

const STAGE_LABELS: Record<string, string> = {
  QUEUED: "Queued",
  GA_DRAWING: "GA",
  PRODUCTION_DRAWINGS: "Prod",
  BOM_FINALISATION: "BOM",
  DESIGN_REVIEW: "Review",
  AWAITING_RESPONSE: "Waiting",
  COMPLETE: "Done",
}

const STAGE_COLORS: Record<string, string> = {
  QUEUED: "bg-gray-300",
  GA_DRAWING: "bg-blue-400",
  PRODUCTION_DRAWINGS: "bg-indigo-400",
  BOM_FINALISATION: "bg-amber-400",
  DESIGN_REVIEW: "bg-purple-400",
  AWAITING_RESPONSE: "bg-orange-400",
  COMPLETE: "bg-green-500",
}

const WAIT_REASON_LABELS: Record<string, string> = {
  CALCS_FROM_SUB: "Calcs (Sub)",
  CLIENT_REVIEW: "Client Review",
  CONSULTANT_REVIEW: "Consultant",
  STRUCTURAL_ENGINEER: "Structural Eng.",
  ARCHITECT_REVIEW: "Architect",
  THIRD_PARTY_APPROVAL: "3rd Party",
  OTHER: "Other",
}

function getIdleDays(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24))
}

function getWaitDuration(triggeredAt: string): string {
  const ms = Date.now() - new Date(triggeredAt).getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days === 0) return "today"
  if (days === 1) return "1 day"
  if (days < 7) return `${days} days`
  const weeks = Math.floor(days / 7)
  const remainDays = days % 7
  if (remainDays === 0) return `${weeks}w`
  return `${weeks}w ${remainDays}d`
}

// Single shared timer — avoids N intervals for N cards
let sharedNow = Date.now()
const sharedListeners: Set<() => void> = new Set()
let sharedInterval: ReturnType<typeof setInterval> | null = null

function startSharedTimer() {
  if (sharedInterval) return
  sharedInterval = setInterval(() => {
    sharedNow = Date.now()
    sharedListeners.forEach((fn) => fn())
  }, 1000)
}

function stopSharedTimer() {
  if (sharedListeners.size === 0 && sharedInterval) {
    clearInterval(sharedInterval)
    sharedInterval = null
  }
}

function useSharedNow() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const listener = () => setNow(sharedNow)
    sharedListeners.add(listener)
    startSharedTimer()
    return () => {
      sharedListeners.delete(listener)
      stopSharedTimer()
    }
  }, [])

  return now
}

const CountdownTimer = memo(function CountdownTimer({ targetDate }: { targetDate: string }) {
  const now = useSharedNow()

  const target = new Date(targetDate).getTime()
  const diff = target - now

  if (diff <= 0) {
    const overdueDays = Math.ceil(Math.abs(diff) / (1000 * 60 * 60 * 24))
    return (
      <div className="flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-red-50 border border-red-200">
        <svg className="w-3 h-3 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[10px] font-semibold text-red-600">Overdue {overdueDays}d</span>
      </div>
    )
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  const isUrgent = days < 3
  const isWarning = days >= 3 && days < 7
  const colorClass = isUrgent
    ? "bg-red-50 border-red-200 text-red-600"
    : isWarning
    ? "bg-amber-50 border-amber-200 text-amber-600"
    : "bg-green-50 border-green-200 text-green-600"
  const iconColor = isUrgent ? "text-red-500" : isWarning ? "text-amber-500" : "text-green-500"

  let display: string
  if (days > 0) {
    display = `${days}d ${hours}h ${minutes}m`
  } else if (hours > 0) {
    display = `${hours}h ${minutes}m ${seconds}s`
  } else {
    display = `${minutes}m ${seconds}s`
  }

  return (
    <div className={`flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded border ${colorClass}`}>
      <svg className={`w-3 h-3 shrink-0 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-[10px] font-semibold font-mono">{display}</span>
    </div>
  )
})

export function DesignBoard({ projects, designers }: { projects: ProjectGroup[]; designers: Designer[] }) {
  const grouped: Record<string, ProjectGroup[]> = {}
  for (const col of COLUMNS) {
    grouped[col.id] = []
  }
  for (const project of projects) {
    const stage = getProjectDesignStage(project)
    if (grouped[stage]) {
      grouped[stage].push(project)
    } else {
      grouped["WAITING"].push(project)
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const colProjects = grouped[col.id]
        return (
          <div
            key={col.id}
            className={`flex flex-col rounded-lg border border-border ${col.borderColor} border-t-4 min-w-[260px] flex-1 ${col.bg}`}
          >
            <div className="px-3 py-2.5 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gray-700">{col.label}</span>
                <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-gray-200 px-1.5 text-[10px] font-semibold text-gray-600">
                  {colProjects.length}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">{col.description}</p>
            </div>

            <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[80px]">
              {colProjects.map((project) => (
                <ProjectDesignCard
                  key={project.id}
                  project={project}
                  designers={designers}
                  columnId={col.id}
                />
              ))}
              {colProjects.length === 0 && (
                <div className="py-6 text-center text-xs text-gray-400">
                  No projects
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const ProjectDesignCard = memo(function ProjectDesignCard({ project, designers }: { project: ProjectGroup; designers: Designer[]; columnId: string }) {
  const [assignOpen, setAssignOpen] = useState(false)
  const [handoverOpen, setHandoverOpen] = useState(false)
  const [waitOpen, setWaitOpen] = useState(false)
  const [activating, setActivating] = useState(false)
  const [localHandoverStatus, setLocalHandoverStatus] = useState(project.handover?.status || null)
  const [activated, setActivated] = useState(false)
  const { can } = usePermissions()
  const canAssign = can("design:assign")
  const canHandover = can("design:handover-create")
  const canManageDesign = can("design:manage")
  const hasDesignCards = project.designCards.length > 0 || activated

  const totalJobs = project.designCards.reduce((s, c) => s + c.jobCards.length, 0)
  const completedJobs = project.designCards.reduce(
    (s, c) => s + c.jobCards.filter((j) => j.status === "APPROVED" || j.status === "SIGNED_OFF").length,
    0
  )
  const pct = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0

  const completeCardCount = project.designCards.filter((c) => c.status === "COMPLETE").length
  const totalCardCount = project.designCards.length
  const allComplete = completeCardCount === totalCardCount && totalCardCount > 0
  const hasPartialComplete = completeCardCount > 0 && !allComplete

  // Products ready for handover (complete design, not yet in production)
  const handoverableProducts = project.designCards.filter(
    (c) => c.status === "COMPLETE" && !c.product.productionStatus
  )
  const hasHandoverable = handoverableProducts.length > 0

  // Cards currently awaiting external response
  const awaitingCards = project.designCards.filter((c) => c.status === "AWAITING_RESPONSE")
  const hasAwaitingCards = awaitingCards.length > 0

  // Cards eligible for "Awaiting Response" action
  const waitableCards = project.designCards.filter(
    (c) => c.status === "IN_PROGRESS" || c.status === "REVIEW"
  )
  const hasWaitableCards = waitableCards.length > 0

  // Stale cards — active cards with no activity for 3+ days (excluding waits)
  const staleCards = project.designCards.filter((c) => {
    if (c.status === "COMPLETE" || c.status === "QUEUED" || c.status === "AWAITING_RESPONSE" || c.status === "ON_HOLD") return false
    return getIdleDays(c.updatedAt) >= 3
  })
  const maxIdleDays = staleCards.length > 0 ? Math.max(...staleCards.map((c) => getIdleDays(c.updatedAt))) : 0

  const designerNames = [...new Set(
    project.designCards
      .map((c) => c.assignedDesigner?.name?.split(" ")[0])
      .filter(Boolean) as string[]
  )]

  // Check existing handover status
  const handoverStatus = localHandoverStatus

  async function handleActivateDesign() {
    // Prompt for design completion estimate
    const estimate = prompt("Estimated design completion date (DD/MM/YYYY):\n\nInclude expected client review time.")
    if (estimate === null) return // cancelled

    let designEstimatedCompletion: string | undefined
    if (estimate.trim()) {
      // Parse DD/MM/YYYY
      const parts = estimate.trim().split(/[\/\-]/)
      if (parts.length === 3) {
        const [d, m, y] = parts
        const parsed = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`)
        if (!isNaN(parsed.getTime())) {
          designEstimatedCompletion = parsed.toISOString()
        }
      }
    }

    setActivating(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/activate-design`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designEstimatedCompletion }),
      })
      if (res.ok) {
        setActivated(true)
      }
    } finally {
      setActivating(false)
    }
  }

  // Build handoverable product list for the dialog
  const handoverProductList = project.designCards
    .filter((c) => c.status === "COMPLETE")
    .map((c) => ({
      productId: c.product.id,
      designCardId: c.id,
      partCode: c.product.partCode,
      productJobNumber: c.product.productJobNumber,
      description: c.product.description,
      inProduction: !!c.product.productionStatus,
    }))

  return (
    <>
      <div className={cn(
        "rounded-lg border p-3 shadow-sm hover:shadow-md transition-all",
        // Card background: beautiful emerald for fully complete, warm amber for partial
        allComplete
          ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300 ring-1 ring-emerald-200/50"
          : hasPartialComplete && hasHandoverable
          ? "bg-gradient-to-br from-amber-50/80 to-orange-50/60 border-amber-300 ring-1 ring-amber-200/50"
          : "bg-white border-border",
        // Left accent for handover status (takes precedence on left border)
        handoverStatus === "REJECTED" ? "border-l-[3px] border-l-red-500" :
        handoverStatus === "SUBMITTED" ? "border-l-[3px] border-l-amber-500" :
        handoverStatus === "ACKNOWLEDGED" ? "border-l-[3px] border-l-green-500" :
        ""
      )}>
        <Link href={`/projects/${project.id}`}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-mono text-gray-400">{project.projectNumber}</span>
                {project.priority && project.priority !== "NORMAL" && (
                  <Badge variant="secondary" className={cn("text-[8px] px-1 py-0", priorityBadge[project.priority] || "")}>
                    {project.priority}
                  </Badge>
                )}
                {staleCards.length > 0 && (
                  <Badge variant="secondary" className={cn(
                    "text-[8px] px-1 py-0",
                    maxIdleDays >= 7 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {staleCards.length} idle ({maxIdleDays}d)
                  </Badge>
                )}
                {hasAwaitingCards && (
                  <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-orange-100 text-orange-700">
                    {awaitingCards.length} waiting
                  </Badge>
                )}
              </div>
              <div className="text-sm font-medium text-gray-900 truncate">{project.name}</div>
            </div>
            <span className="text-xs font-bold text-gray-600 shrink-0">{pct}%</span>
          </div>

          <div className="text-xs text-gray-500 truncate">{project.customer?.name || "No customer"}</div>
          {project.projectManager && (
            <div className="text-[10px] text-indigo-500 truncate">PM: {project.projectManager.name.split(" ")[0]}</div>
          )}

          {hasDesignCards ? (
            <>
              <div className={cn("w-full h-1.5 rounded-full overflow-hidden mt-2", allComplete ? "bg-emerald-200" : "bg-gray-200")}>
                <div className={cn("h-full rounded-full transition-all", allComplete ? "bg-emerald-500" : hasPartialComplete ? "bg-amber-500" : "bg-blue-500")} style={{ width: `${pct}%` }} />
              </div>

              {/* Per-product breakdown with status icons */}
              <div className="mt-2 space-y-1">
                <div className={cn(
                "text-[10px] font-medium mb-1 flex items-center gap-1.5",
                allComplete ? "text-emerald-700" : hasPartialComplete ? "text-amber-700" : "text-gray-500"
              )}>
                {allComplete ? (
                  <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : hasPartialComplete ? (
                  <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : null}
                {allComplete
                  ? "All products design-complete"
                  : `${completeCardCount} of ${totalCardCount} products complete`}
                {hasHandoverable && !allComplete && (
                  <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
                    {handoverableProducts.length} ready
                  </span>
                )}
              </div>
                {project.designCards.slice(0, 5).map((card) => {
                  const stage = getProductStage(card)
                  const isComplete = card.status === "COMPLETE"
                  const inProduction = !!card.product.productionStatus
                  const idle = !isComplete && !inProduction && stage !== "AWAITING_RESPONSE" && stage !== "QUEUED" ? getIdleDays(card.updatedAt) : 0
                  return (
                    <div key={card.id} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                      {isComplete ? (
                        inProduction ? (
                          <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )
                      ) : stage === "AWAITING_RESPONSE" ? (
                        <svg className="w-3.5 h-3.5 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ml-1 ${STAGE_COLORS[stage] || "bg-gray-300"}`} />
                      )}
                      <span className={cn(
                        "text-[10px] truncate flex-1",
                        inProduction ? "text-blue-600" : isComplete ? "text-green-700" : stage === "AWAITING_RESPONSE" ? "text-orange-700" : "text-gray-600"
                      )}>
                        {card.product.productJobNumber || card.product.partCode}
                      </span>
                      <span className={cn(
                        "text-[9px] shrink-0",
                        inProduction ? "text-blue-500 font-medium" : stage === "AWAITING_RESPONSE" ? "text-orange-600 font-medium" : idle >= 3 ? "text-red-500 font-medium" : "text-gray-400"
                      )}>
                        {inProduction ? "In Production" : isComplete ? "Done" : (STAGE_LABELS[stage] || stage)}
                      </span>
                      {idle >= 3 && (
                        <span className={cn(
                          "text-[8px] px-1 py-0 rounded font-semibold shrink-0",
                          idle >= 7 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {idle}d idle
                        </span>
                      )}
                      {!isComplete && stage !== "AWAITING_RESPONSE" && (
                        <Link
                          href={`/design/bom/${card.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-0.5 text-gray-400 hover:text-amber-600 transition-colors shrink-0"
                          title="Edit BOM"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </Link>
                      )}
                      </div>
                      {/* Wait reason tag */}
                      {stage === "AWAITING_RESPONSE" && card.waitEvents && card.waitEvents.length > 0 && (() => {
                        const activeWait = card.waitEvents.find((w) => !w.resolvedAt)
                        if (!activeWait) return null
                        return (
                          <div className="flex items-center gap-1 ml-5 text-[9px]">
                            <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">
                              {WAIT_REASON_LABELS[activeWait.reason] || activeWait.reason}
                            </span>
                            {activeWait.externalParty && (
                              <span className="text-orange-500 truncate max-w-[80px]">{activeWait.externalParty}</span>
                            )}
                            <span className="text-orange-400">{getWaitDuration(activeWait.triggeredAt)}</span>
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
                {project.designCards.length > 5 && (
                  <div className="text-[9px] text-gray-400 pl-3">+{project.designCards.length - 5} more</div>
                )}
              </div>
            </>
          ) : (
            /* Products awaiting design activation */
            <div className="mt-2 space-y-1">
              {project.products.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-300" />
                  <span className="text-[10px] text-gray-600 truncate flex-1">
                    {p.productJobNumber || p.partCode}
                  </span>
                  <span className="text-[9px] text-gray-400 shrink-0">Awaiting</span>
                </div>
              ))}
              {project.products.length > 4 && (
                <div className="text-[9px] text-gray-400 pl-3">+{project.products.length - 4} more</div>
              )}
            </div>
          )}
        </Link>

        {/* Handover status indicator */}
        {handoverStatus && (
          <div className={cn(
            "mt-2 px-2 py-1 rounded text-[10px] font-medium",
            handoverStatus === "SUBMITTED" ? "bg-amber-50 text-amber-700 border border-amber-200" :
            handoverStatus === "REJECTED" ? "bg-red-50 text-red-700 border border-red-200" :
            handoverStatus === "ACKNOWLEDGED" ? "bg-green-50 text-green-700 border border-green-200" :
            "bg-gray-50 text-gray-600 border border-gray-200"
          )}>
            {handoverStatus === "SUBMITTED" && (hasPartialComplete ? "Partial handover proposed — awaiting review" : "Handover proposed — awaiting review")}
            {handoverStatus === "REJECTED" && "Handover returned — needs revision"}
            {handoverStatus === "ACKNOWLEDGED" && (hasHandoverable ? "Partial handover accepted — more products ready" : "Handover accepted by Production")}
            {handoverStatus === "DRAFT" && "Handover draft"}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          <div className="text-[10px] text-gray-400">
            <span>{hasDesignCards ? project.designCards.length : project.products.length} product{(hasDesignCards ? project.designCards.length : project.products.length) !== 1 ? "s" : ""}</span>
            {designerNames.length > 0 && (
              <span className="ml-1 text-indigo-500">{designerNames.join(", ")}</span>
            )}
          </div>

          {/* Action buttons based on column — hidden for read-only users */}
          {/* Show handover button if there are products ready AND no pending submission */}
          {hasHandoverable && canHandover && handoverStatus !== "SUBMITTED" ? (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setHandoverOpen(true)
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-white transition-colors",
                allComplete ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {handoverStatus === "REJECTED" ? "Re-propose Handover" :
                handoverStatus === "ACKNOWLEDGED" ? `Handover ${handoverableProducts.length} More` :
                allComplete ? "Propose Handover" :
                `Handover ${handoverableProducts.length} Product${handoverableProducts.length !== 1 ? "s" : ""}`}
            </button>
          ) : hasDesignCards && canAssign ? (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setAssignOpen(true)
              }}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Assign
            </button>
          ) : !hasDesignCards && canManageDesign ? (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleActivateDesign()
              }}
              disabled={activating}
              className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-[10px] font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {activating ? "Accepting..." : "Accept from Sales"}
            </button>
          ) : null}

          {/* Awaiting Response button — show when cards are in progress and user can manage */}
          {hasWaitableCards && canManageDesign && !hasHandoverable && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setWaitOpen(true)
              }}
              className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-[10px] font-medium text-orange-600 hover:bg-orange-100 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Awaiting Response
            </button>
          )}
        </div>

        {/* Resume buttons for cards that are awaiting response */}
        {hasAwaitingCards && (
          <div className="mt-1.5 space-y-1">
            {awaitingCards.map((card) => {
              const activeWait = card.waitEvents?.find((w) => !w.resolvedAt)
              return (
                <div key={card.id} className="flex items-center justify-between gap-2 px-1">
                  <span className="text-[9px] text-orange-600 truncate">
                    {card.product.productJobNumber || card.product.partCode}
                    {activeWait && (
                      <span className="ml-1 text-orange-400">
                        — {WAIT_REASON_LABELS[activeWait.reason] || activeWait.reason}
                      </span>
                    )}
                  </span>
                  <ResumeFromWaitButton designCardId={card.id} />
                </div>
              )
            })}
          </div>
        )}

        {project.targetCompletion && (
          <CountdownTimer targetDate={project.targetCompletion} />
        )}
      </div>

      <AssignJobsDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        projectId={project.id}
        projectNumber={project.projectNumber}
        projectName={project.name}
        designCards={project.designCards}
        designers={designers}
      />

      <HandoverSelectDialog
        open={handoverOpen}
        onOpenChange={setHandoverOpen}
        projectId={project.id}
        projectNumber={project.projectNumber}
        projectName={project.name}
        products={handoverProductList}
        onSubmitted={() => setLocalHandoverStatus("SUBMITTED")}
      />

      <AwaitingResponseDialog
        open={waitOpen}
        onOpenChange={setWaitOpen}
        cards={project.designCards}
        projectNumber={project.projectNumber}
        projectName={project.name}
      />

    </>
  )
})
