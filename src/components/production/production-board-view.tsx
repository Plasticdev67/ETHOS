"use client"

import { useState, memo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { STAGE_DISPLAY_NAMES } from "@/lib/production-utils"
import { ProductActionRow } from "./product-action-row"
import { ProjectScheduleDialog } from "./project-schedule-dialog"

type PendingHandover = {
  id: string
  projectId: string
  status: string
  includedProductIds?: string[]
  initiatedAt: string | null
  initiatedBy: { id: string; name: string } | null
  project: {
    id: string
    projectNumber: string
    name: string
    targetCompletion: string | null
    priority: string
    isICUFlag: boolean
    customer: { name: string } | null
    products: Array<{ id: string; partCode: string; description: string; quantity: number }>
    designCards: Array<{
      id: string
      status: string
      product: { id: string; description: string; partCode: string }
    }>
  }
}

type DesignFreezeProject = {
  id: string
  projectNumber: string
  name: string
  targetCompletion: string | null
  priority: string
  isICUFlag: boolean
  customer: { name: string } | null
  products: Array<{ id: string; partCode: string; description: string; quantity: number }>
  designCards: Array<{
    id: string
    status: string
    product: { id: string; description: string; partCode: string }
  }>
  designHandover: { id: string; status: string } | null
}

type ProducingProject = {
  id: string
  projectNumber: string
  name: string
  projectStatus: string
  departmentStatus: string
  priority: string
  isICUFlag: boolean
  workStream: string
  ragStatus: string | null
  targetCompletion: string | null
  customer: { id: string; name: string } | null
  coordinator: { id: string; name: string } | null
  products: Array<{
    id: string
    partCode: string
    description: string
    quantity: number
    productionStatus: string | null
    productionPlannedStart: string | null
    productionTargetDate: string | null
    productionCompletionDate: string | null
    currentDepartment: string | null
    designCard?: { id: string } | null
    productionCuttingHours?: number | null
    productionFabricationHours?: number | null
    productionFittingHours?: number | null
    productionShotblastingHours?: number | null
    productionPaintingHours?: number | null
    productionPackingHours?: number | null
  }>
  _count: { products: number; ncrs: number }
}

type CompleteProject = {
  id: string
  projectNumber: string
  name: string
  projectStatus: string
  priority: string
  isICUFlag: boolean
  targetCompletion: string | null
  actualCompletion: string | null
  customer: { id: string; name: string } | null
  products: Array<{
    id: string
    partCode: string
    description: string
    quantity: number
    productionStatus: string | null
  }>
  _count: { products: number }
}

type Props = {
  pendingHandovers: PendingHandover[]
  designFreezeProjects?: DesignFreezeProject[]
  producingProjects: ProducingProject[]
  completeProjects: CompleteProject[]
}

export function ProductionBoardView({ pendingHandovers, designFreezeProjects = [], producingProjects, completeProjects }: Props) {
  const [localHandovers, setLocalHandovers] = useState(pendingHandovers)
  const [localDesignFreeze, setLocalDesignFreeze] = useState(designFreezeProjects)
  const [localProducing, setLocalProducing] = useState(producingProjects)

  // Exclude DESIGN_FREEZE projects that already have SUBMITTED handovers (shown in handover section)
  const handoverProjectIds = new Set(localHandovers.map(h => h.projectId))
  const filteredDesignFreeze = localDesignFreeze.filter(p => !handoverProjectIds.has(p.id))

  const totalPending = localHandovers.length + filteredDesignFreeze.length

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 items-start">
      {/* Column 1: Pending Handover */}
      <PendingHandoverColumn
        handovers={localHandovers}
        designFreezeProjects={filteredDesignFreeze}
        totalCount={totalPending}
        onHandoverAction={(id) => setLocalHandovers(prev => prev.filter(h => h.id !== id))}
        onDesignFreezeAction={(id) => setLocalDesignFreeze(prev => prev.filter(p => p.id !== id))}
      />

      {/* Column 2: Producing */}
      <ProducingColumn projects={localProducing} onComplete={(id) => setLocalProducing(prev => prev.filter(p => p.id !== id))} />

      {/* Column 3: Handover (Complete) */}
      <HandoverCompleteColumn projects={completeProjects} />
    </div>
  )
}

// ─── Pending Handover Column ───

function PendingHandoverColumn({
  handovers,
  designFreezeProjects,
  totalCount,
  onHandoverAction,
  onDesignFreezeAction,
}: {
  handovers: PendingHandover[]
  designFreezeProjects: DesignFreezeProject[]
  totalCount: number
  onHandoverAction: (id: string) => void
  onDesignFreezeAction: (id: string) => void
}) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const router = useRouter()

  async function handleAcknowledge(handover: PendingHandover) {
    setLoadingAction(handover.id + "-ack")
    try {
      const sessionRes = await fetch("/api/auth/session")
      const session = sessionRes.ok ? await sessionRes.json() : null
      const userId = session?.user?.id || null

      const res = await fetch(`/api/design/handover/${handover.projectId}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receivedById: userId }),
      })
      if (res.ok) {
        onHandoverAction(handover.id)
        router.refresh()
      }
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleReject(handover: PendingHandover) {
    const reason = prompt("Reason for returning to design:")
    if (!reason) return

    setLoadingAction(handover.id + "-rej")
    try {
      const res = await fetch(`/api/design/handover/${handover.projectId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      })
      if (res.ok) {
        onHandoverAction(handover.id)
        router.refresh()
      }
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleAcceptDesignFreeze(project: DesignFreezeProject) {
    setLoadingAction(project.id + "-accept")
    try {
      const sessionRes = await fetch("/api/auth/session")
      const session = sessionRes.ok ? await sessionRes.json() : null
      const userId = session?.user?.id || null

      // First submit the handover (if no handover exists or status is DRAFT/REJECTED)
      const submitRes = await fetch(`/api/design/handover/${project.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includedProductIds: project.products.map(p => p.id),
          initiatedById: userId,
        }),
      })
      if (!submitRes.ok) {
        const data = await submitRes.json().catch(() => ({}))
        alert(data.error || "Failed to submit handover")
        return
      }

      // Then acknowledge it
      const ackRes = await fetch(`/api/design/handover/${project.id}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receivedById: userId }),
      })
      if (ackRes.ok) {
        onDesignFreezeAction(project.id)
        router.refresh()
      } else {
        const data = await ackRes.json().catch(() => ({}))
        alert(data.error || "Failed to acknowledge handover")
      }
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-amber-200 border-t-4 border-t-amber-500 min-w-[320px] max-w-[360px] bg-amber-50/50 shrink-0">
      <div className="px-3 py-2.5 border-b border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-sm font-semibold text-amber-800">Pending Handover</span>
          </div>
          <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-amber-200 px-1.5 text-[10px] font-semibold text-amber-700">
            {totalCount}
          </span>
        </div>
        <p className="text-[10px] text-amber-500 mt-0.5">From design — review and accept</p>
      </div>

      <div className="flex flex-col gap-2.5 p-2.5 overflow-y-auto max-h-[calc(100vh-220px)] min-h-[120px]">
        {totalCount === 0 && (
          <div className="py-8 text-center text-xs text-amber-400">No pending handovers</div>
        )}

        {/* Formally submitted handovers */}
        {handovers.map((handover) => {
          const isAcking = loadingAction === handover.id + "-ack"
          const isRejecting = loadingAction === handover.id + "-rej"
          const inclProductIds = (handover.includedProductIds || []) as string[]
          const totalProducts = handover.project.products.length
          const includedCount = inclProductIds.length || totalProducts
          const isPartial = inclProductIds.length > 0 && includedCount < totalProducts

          return (
            <div key={handover.id} className="rounded-lg border-l-[3px] border-l-amber-500 border border-amber-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[10px] font-semibold text-red-600">Needs your review</span>
              </div>

              <Link href={`/projects/${handover.project.id}`}>
                <div className="text-[10px] font-mono text-gray-400">{handover.project.projectNumber}</div>
                <div className="text-sm font-medium text-gray-900 truncate hover:text-blue-600">{handover.project.name}</div>
                <div className="text-xs text-gray-500 truncate">{handover.project.customer?.name}</div>
              </Link>

              {handover.initiatedBy && (
                <div className="mt-1.5 text-[10px] text-gray-500">
                  Proposed by: {handover.initiatedBy.name}
                  {handover.initiatedAt && (
                    <span className="ml-1 text-gray-400">
                      {new Date(handover.initiatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              )}

              {/* Products — show included vs excluded for partial handovers */}
              <div className="mt-2 space-y-0.5">
                {handover.project.designCards.slice(0, 5).map((card) => {
                  const included = inclProductIds.length === 0 || inclProductIds.includes(card.product.id)
                  return (
                    <div key={card.id} className="flex items-center gap-1.5 text-[10px]">
                      {included ? (
                        <svg className="w-3 h-3 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="w-3 h-3 flex items-center justify-center text-gray-300 shrink-0">—</span>
                      )}
                      <span className={included ? "text-gray-700 truncate" : "text-gray-400 italic truncate"}>
                        {card.product.partCode || card.product.description}
                      </span>
                    </div>
                  )
                })}
                {handover.project.designCards.length > 5 && (
                  <div className="text-[10px] text-gray-400 pl-4">
                    +{handover.project.designCards.length - 5} more
                  </div>
                )}
              </div>

              {isPartial && (
                <div className="mt-1 text-[10px] text-amber-600 font-medium">
                  Partial: {includedCount}/{totalProducts} products
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleAcknowledge(handover)}
                  disabled={!!loadingAction}
                  className="flex-1 inline-flex items-center justify-center rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isAcking ? "Accepting..." : "Accept"}
                </button>
                <button
                  onClick={() => handleReject(handover)}
                  disabled={!!loadingAction}
                  className="inline-flex items-center justify-center rounded-md border border-red-300 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {isRejecting ? "..." : "Return"}
                </button>
              </div>
            </div>
          )
        })}

        {/* DESIGN_FREEZE projects — design complete, ready for production to accept */}
        {designFreezeProjects.map((project) => {
          const isAccepting = loadingAction === project.id + "-accept"
          const completeCards = project.designCards.filter(c => c.status === "COMPLETE").length
          const totalCards = project.designCards.length

          return (
            <div key={project.id} className="rounded-lg border border-amber-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-semibold text-amber-600">Design complete — ready for production</span>
              </div>

              <Link href={`/projects/${project.id}`}>
                <div className="text-[10px] font-mono text-gray-400">{project.projectNumber}</div>
                <div className="text-sm font-medium text-gray-900 truncate hover:text-blue-600">{project.name}</div>
                <div className="text-xs text-gray-500 truncate">{project.customer?.name}</div>
              </Link>

              {totalCards > 0 && (
                <div className="mt-1.5 text-[10px] text-gray-500">
                  {completeCards}/{totalCards} design cards complete
                </div>
              )}

              {/* Products */}
              <div className="mt-2 space-y-0.5">
                {project.products.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center gap-1.5 text-[10px]">
                    <svg className="w-3 h-3 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700 truncate">{product.description || product.partCode}</span>
                    {product.quantity > 1 && (
                      <span className="text-gray-400">x{product.quantity}</span>
                    )}
                  </div>
                ))}
                {project.products.length > 5 && (
                  <div className="text-[10px] text-gray-400 pl-4">
                    +{project.products.length - 5} more
                  </div>
                )}
              </div>

              {/* Accept action */}
              <div className="mt-3">
                <button
                  onClick={() => handleAcceptDesignFreeze(project)}
                  disabled={!!loadingAction}
                  className="w-full inline-flex items-center justify-center rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isAccepting ? "Accepting..." : "Accept into Production"}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Producing Column ───

function ProducingColumn({ projects, onComplete }: { projects: ProducingProject[]; onComplete: (id: string) => void }) {
  return (
    <div className="flex flex-col rounded-lg border border-blue-200 border-t-4 border-t-blue-500 min-w-[400px] flex-1 bg-blue-50/30 shrink-0">
      <div className="px-3 py-2.5 border-b border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span className="text-sm font-semibold text-blue-800">Producing</span>
          </div>
          <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-blue-200 px-1.5 text-[10px] font-semibold text-blue-700">
            {projects.length}
          </span>
        </div>
        <p className="text-[10px] text-blue-500 mt-0.5">Active production — arrange per product</p>
      </div>

      <div className="flex flex-col gap-2.5 p-2.5 overflow-y-auto max-h-[calc(100vh-220px)] min-h-[120px]">
        {projects.length === 0 && (
          <div className="py-8 text-center text-xs text-blue-400">No active production projects</div>
        )}

        {projects.map((project) => (
          <ProducingProjectCard key={project.id} project={project} onComplete={onComplete} />
        ))}
      </div>
    </div>
  )
}

const ProducingProjectCard = memo(function ProducingProjectCard({ project, onComplete }: { project: ProducingProject; onComplete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  const FINISHED_STAGES = ["PACKING", "DISPATCHED", "COMPLETED", "STORAGE", "N_A"]

  const completedProducts = project.products.filter(
    (p) => FINISHED_STAGES.includes(p.productionStatus || "") || p.productionCompletionDate
  ).length
  const totalProducts = project.products.length

  const allProductsDone = totalProducts > 0 && project.products.every(
    (p) => FINISHED_STAGES.includes(p.productionStatus || "") || p.productionCompletionDate
  )

  const isOverdue = project.targetCompletion && new Date(project.targetCompletion) < new Date()

  // Planned start (earliest across products)
  const startDates = project.products
    .map((p) => p.productionPlannedStart)
    .filter(Boolean) as string[]
  const productionStart = startDates.length > 0 ? new Date(startDates.sort()[0]) : null

  const shortDateFmt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }

  async function handleCompleteProduction() {
    setCompleting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectStatus: "INSTALLATION" }),
      })
      if (res.ok) {
        onComplete(project.id)
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Failed to complete production")
      }
    } catch {
      alert("Failed to complete production")
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setShowDialog(true)} className="min-w-0 flex-1 text-left cursor-pointer">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-mono text-gray-400">{project.projectNumber}</span>
            {project.isICUFlag && (
              <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-red-100 text-red-700">ICU</Badge>
            )}
            {project._count.ncrs > 0 && (
              <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-orange-100 text-orange-700">
                {project._count.ncrs} NCR
              </Badge>
            )}
          </div>
          <div className="text-sm font-medium text-gray-900 truncate hover:text-blue-600">{project.name}</div>
          <div className="text-xs text-gray-500 truncate">{project.customer?.name || "No customer"}</div>
        </button>

        {project.targetCompletion && (
          <div className={`text-[10px] font-medium shrink-0 px-1.5 py-0.5 rounded ${
            isOverdue ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
          }`}>
            {new Date(project.targetCompletion).toLocaleDateString("en-GB", shortDateFmt)}
          </div>
        )}
      </div>

      {/* Start / DDL info line */}
      <div className="mt-1.5 flex items-center gap-3 text-[10px]">
        <span className="text-gray-400">
          Start: <span className={productionStart ? "text-gray-700 font-medium" : "text-orange-500"}>
            {productionStart ? productionStart.toLocaleDateString("en-GB", shortDateFmt) : "Not set"}
          </span>
        </span>
        <span className="text-gray-400">
          DDL: <span className={`font-medium ${isOverdue ? "text-red-600" : "text-gray-700"}`}>
            {project.targetCompletion
              ? new Date(project.targetCompletion).toLocaleDateString("en-GB", shortDateFmt)
              : "Not set"}
          </span>
        </span>
      </div>

      {/* Stage summary bar */}
      <div className="mt-2 flex gap-0.5">
        {project.products.map((product) => {
          const stageColor =
            FINISHED_STAGES.includes(product.productionStatus || "") ? "bg-green-500" :
            product.productionStatus === "PACKING" ? "bg-cyan-500" :
            product.productionStatus === "PAINTING" ? "bg-teal-500" :
            product.productionStatus === "SHOTBLASTING" ? "bg-lime-500" :
            product.productionStatus === "FITTING" ? "bg-yellow-500" :
            product.productionStatus === "FABRICATION" ? "bg-amber-500" :
            product.productionStatus === "CUTTING" ? "bg-orange-500" :
            "bg-gray-200"

          return (
            <div
              key={product.id}
              className={`h-2 flex-1 rounded-full ${stageColor}`}
              title={`${product.description}: ${STAGE_DISPLAY_NAMES[product.productionStatus || ""] || product.productionStatus || "Awaiting"}`}
            />
          )
        })}
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[10px] text-gray-500">
          {completedProducts}/{totalProducts} products
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
        >
          {expanded ? "Hide" : "Show"} products
        </button>
      </div>

      {/* Expanded product list */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-2.5">
          {project.products.map((product) => {
            const stageName = STAGE_DISPLAY_NAMES[product.productionStatus || ""] || product.productionStatus || "Awaiting"
            const stageColor =
              product.productionStatus === "PACKING" ? "bg-cyan-100 text-cyan-700" :
              product.productionStatus === "PAINTING" ? "bg-teal-100 text-teal-700" :
              product.productionStatus === "SHOTBLASTING" ? "bg-lime-100 text-lime-700" :
              product.productionStatus === "FITTING" ? "bg-yellow-100 text-yellow-700" :
              product.productionStatus === "FABRICATION" ? "bg-amber-100 text-amber-700" :
              product.productionStatus === "CUTTING" ? "bg-orange-100 text-orange-700" :
              FINISHED_STAGES.includes(product.productionStatus || "") ? "bg-green-100 text-green-700" :
              "bg-gray-100 text-gray-600"

            return (
              <div key={product.id}>
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <div className="min-w-0 flex-1">
                    <span className="text-gray-700 truncate block">{product.description}</span>
                    <span className="text-gray-400 font-mono">{product.partCode}</span>
                  </div>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium ${stageColor}`}>
                    {stageName}
                  </span>
                </div>
                <ProductActionRow
                  productId={product.id}
                  projectId={project.id}
                  currentStage={product.productionStatus}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Complete Production button — only when all products done */}
      {allProductsDone ? (
        <div className="mt-3 pt-2 border-t border-gray-200">
          <button
            onClick={handleCompleteProduction}
            disabled={completing}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 bg-green-600 text-white hover:bg-green-700"
          >
            {completing ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {completing ? "Completing..." : "Complete — wait for handover"}
          </button>
        </div>
      ) : (
        <div className="mt-3 pt-2 border-t border-gray-200">
          <div className="w-full inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-gray-400 bg-gray-100">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {completedProducts}/{totalProducts} products completed
          </div>
        </div>
      )}

      {/* Schedule dialog */}
      <ProjectScheduleDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        project={project}
      />
    </div>
  )
})

// ─── Handover / Complete Column ───

function HandoverCompleteColumn({ projects }: { projects: CompleteProject[] }) {
  return (
    <div className="flex flex-col rounded-lg border border-green-200 border-t-4 border-t-green-500 min-w-[320px] max-w-[360px] bg-green-50/30 shrink-0">
      <div className="px-3 py-2.5 border-b border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-green-800">Handover</span>
          </div>
          <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-green-200 px-1.5 text-[10px] font-semibold text-green-700">
            {projects.length}
          </span>
        </div>
        <p className="text-[10px] text-green-500 mt-0.5">Production complete — handed over</p>
      </div>

      <div className="flex flex-col gap-2.5 p-2.5 overflow-y-auto max-h-[calc(100vh-220px)] min-h-[120px]">
        {projects.length === 0 && (
          <div className="py-8 text-center text-xs text-green-400">No completed projects</div>
        )}

        {projects.map((project) => {
          const statusLabel =
            project.projectStatus === "INSTALLATION" ? "Installation" :
            project.projectStatus === "REVIEW" ? "Review" :
            "Complete"
          const statusColor =
            project.projectStatus === "INSTALLATION" ? "bg-purple-100 text-purple-700" :
            project.projectStatus === "REVIEW" ? "bg-amber-100 text-amber-700" :
            "bg-green-100 text-green-700"

          return (
            <div key={project.id} className="rounded-lg border border-green-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-mono text-gray-400">{project.projectNumber}</span>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>

              <Link href={`/projects/${project.id}`}>
                <div className="text-sm font-medium text-gray-900 truncate hover:text-blue-600">{project.name}</div>
                <div className="text-xs text-gray-500 truncate">{project.customer?.name}</div>
              </Link>

              <div className="mt-2 text-[10px] text-gray-500">
                {project._count.products} product{project._count.products !== 1 ? "s" : ""}
              </div>

              {project.actualCompletion && (
                <div className="mt-1 text-[10px] text-gray-400">
                  Completed: {new Date(project.actualCompletion).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
