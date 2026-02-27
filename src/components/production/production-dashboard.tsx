"use client"

import { useState, useMemo, useCallback, memo } from "react"
import Link from "next/link"
import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import {
  WORKSHOP_STAGES,
  PRODUCT_LANES,
  getProductLane,
  calculateDashboardStats,
  STAGE_DISPLAY_NAMES,
} from "@/lib/production-utils"
import { ProductionToolbar } from "./production-toolbar"
import { ProductionStatsBar } from "./production-stats-bar"
import { ProjectDetailPanel } from "./project-detail-panel"
import { SubContractSection } from "./sub-contract-section"
import { ProductLaneRow } from "./product-lane"
import type { FlatProduct } from "./production-product-card"
import { Badge } from "@/components/ui/badge"
import { ProductActionRow } from "./product-action-row"
import { ProjectScheduleDialog } from "./project-schedule-dialog"

export type ProductionProject = {
  id: string
  projectNumber: string
  name: string
  projectStatus: string
  departmentStatus: string
  priority: string
  isICUFlag: boolean
  classification: string
  ragStatus: string | null
  contractValue: string | number | null
  estimatedValue: string | number | null
  ncrCost: string | number | null
  targetCompletion: string | null
  orderReceived: string | null
  actualCompletion: string | null
  customer: { id: string; name: string } | null
  coordinator: { id: string; name: string } | null
  projectManager: { id: string; name: string } | null
  products: Array<{
    id: string
    partCode: string
    description: string
    quantity: number
    productionStatus: string | null
    productionPlannedStart?: string | null
    productionTargetDate: string | null
    productionCompletionDate: string | null
    currentDepartment?: string | null
    designCompletionDate?: string | null
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

export type DesignCompleteProject = {
  id: string
  projectNumber: string
  name: string
  projectStatus: string
  targetCompletion: string | null
  priority: string
  isICUFlag: boolean
  customer: { name: string } | null
  products: Array<{ id: string; partCode: string; description: string }>
  designCards: Array<{ id: string; status: string }>
  designHandover: { id: string; status: string } | null
  _count: { products: number }
}

export type PendingHandover = {
  id: string
  projectId: string
  status: string
  checklist: { item: string; checked: boolean }[]
  designNotes: string | null
  includedProductIds: string[]
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
    products: Array<{ id: string; partCode: string; description: string }>
    designCards: Array<{
      id: string
      status: string
      product: { id: string; description: string; partCode: string }
      jobCards: Array<{ jobType: string; status: string }>
    }>
  }
}

type Filters = {
  classification: string
  status: string
  pm: string
  client: string
  search: string
  timeHorizon: string
}

export function ProductionDashboard({
  initialProjects,
  designCompleteProjects = [],
  pendingHandovers = [],
}: {
  initialProjects: ProductionProject[]
  designCompleteProjects?: DesignCompleteProject[]
  pendingHandovers?: PendingHandover[]
}) {
  const [projects, setProjects] = useState(initialProjects)
  const [localHandovers, setLocalHandovers] = useState(pendingHandovers)
  const [filters, setFilters] = useState<Filters>({
    classification: "ALL",
    status: "ALL",
    pm: "ALL",
    client: "ALL",
    search: "",
    timeHorizon: "ALL",
  })
  const [viewMode, setViewMode] = useState<"compact" | "full">("full")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  // Get unique filter options from data
  const filterOptions = useMemo(() => {
    const pms = new Set<string>()
    const clients = new Set<string>()
    projects.forEach((p) => {
      if (p.projectManager?.name) pms.add(p.projectManager.name)
      if (p.customer?.name) clients.add(p.customer.name)
    })
    return {
      pms: Array.from(pms).sort(),
      clients: Array.from(clients).sort(),
    }
  }, [projects])

  // Apply filters (project-level)
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (p.classification === "SUB_CONTRACT") return false

      if (filters.search) {
        const q = filters.search.toLowerCase()
        const match =
          p.projectNumber.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.customer?.name.toLowerCase().includes(q) ||
          p.products.some(
            (prod) =>
              prod.description.toLowerCase().includes(q) ||
              prod.partCode.toLowerCase().includes(q)
          )
        if (!match) return false
      }

      if (filters.classification !== "ALL") {
        if (filters.classification === "ICU" && !p.isICUFlag) return false
        if (filters.classification === "MEGA" && p.classification !== "MEGA") return false
        if (filters.classification === "NORMAL" && (p.classification !== "NORMAL" || p.isICUFlag)) return false
      }

      if (filters.status !== "ALL") {
        const now = new Date()
        const target = p.targetCompletion ? new Date(p.targetCompletion) : null
        if (filters.status === "OVERDUE" && (!target || target >= now)) return false
        if (filters.status === "AT_RISK" && (!target || Math.ceil((target.getTime() - now.getTime()) / 86400000) > 7)) return false
        if (filters.status === "ON_TRACK" && target && Math.ceil((target.getTime() - now.getTime()) / 86400000) <= 7) return false
      }

      if (filters.pm !== "ALL" && p.projectManager?.name !== filters.pm) return false
      if (filters.client !== "ALL" && p.customer?.name !== filters.client) return false

      if (filters.timeHorizon !== "ALL" && p.targetCompletion) {
        const target = new Date(p.targetCompletion)
        const now = new Date()
        if (filters.timeHorizon === "THIS_WEEK") {
          const endOfWeek = new Date(now)
          endOfWeek.setDate(now.getDate() + (7 - now.getDay()))
          if (target > endOfWeek) return false
        } else if (filters.timeHorizon === "THIS_MONTH") {
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          if (target > endOfMonth) return false
        }
      }

      return true
    })
  }, [projects, filters])

  // Sub-contract projects
  const subContractProjects = useMemo(
    () => projects.filter((p) => p.classification === "SUB_CONTRACT"),
    [projects]
  )

  // Stats
  const stats = useMemo(
    () => calculateDashboardStats(filteredProjects),
    [filteredProjects]
  )

  // Flatten projects → individual products with parent project context
  const flatProducts = useMemo(() => {
    const result: FlatProduct[] = []
    for (const project of filteredProjects) {
      for (const product of project.products) {
        result.push({
          id: product.id,
          partCode: product.partCode,
          description: product.description,
          quantity: product.quantity,
          productionStatus: product.productionStatus,
          productionTargetDate: product.productionTargetDate,
          productionCompletionDate: product.productionCompletionDate,
          project: {
            id: project.id,
            projectNumber: project.projectNumber,
            name: project.name,
            priority: project.priority,
            isICUFlag: project.isICUFlag,
            classification: project.classification,
            customer: project.customer,
            projectManager: project.projectManager,
            targetCompletion: project.targetCompletion,
            ncrCount: project._count.ncrs,
          },
        })
      }
    }
    return result
  }, [filteredProjects])

  // Group products by lane (NORMAL / MEGA) and stage
  const productsByLaneAndStage = useMemo(() => {
    const map: Record<string, Record<string, FlatProduct[]>> = {}
    for (const lane of PRODUCT_LANES) {
      map[lane] = {}
      for (const stage of WORKSHOP_STAGES) {
        map[lane][stage] = []
      }
    }
    for (const product of flatProducts) {
      const lane = getProductLane(product.project)
      const stage = product.productionStatus
      if (stage && map[lane]?.[stage]) {
        map[lane][stage].push(product)
      }
    }
    return map
  }, [flatProducts])

  // Build a lookup from product ID → parent project (for drag handling)
  const productToProject = useMemo(() => {
    const lookup: Record<string, ProductionProject> = {}
    for (const project of projects) {
      for (const product of project.products) {
        lookup[product.id] = project
      }
    }
    return lookup
  }, [projects])

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { draggableId, destination, source } = result
    if (!destination || destination.droppableId === source.droppableId) return

    const [destStage] = destination.droppableId.split(":")
    const [srcStage] = source.droppableId.split(":")

    const parentProject = productToProject[draggableId]
    if (!parentProject) return

    if (destStage !== srcStage) {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== parentProject.id) return p
          return {
            ...p,
            products: p.products.map((prod) =>
              prod.id === draggableId
                ? { ...prod, productionStatus: destStage }
                : prod
            ),
          }
        })
      )

      try {
        const res = await fetch(
          `/api/production/products/${draggableId}/move`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productionStatus: destStage }),
          }
        )

        if (!res.ok) {
          setProjects(initialProjects)
        }
      } catch {
        setProjects(initialProjects)
      }
    }
  }, [productToProject, initialProjects])

  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId) || null
    : null

  return (
    <div className="space-y-4">
      <ProductionStatsBar stats={stats} />

      <ProductionToolbar
        filters={filters}
        onFiltersChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pmOptions={filterOptions.pms}
        clientOptions={filterOptions.clients}
        projectCount={filteredProjects.length}
      />

      {/* New: Design-side columns (Design Complete + Pending Handover) */}
      {(designCompleteProjects.length > 0 || localHandovers.length > 0) && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {/* Design Complete Column — read-only */}
          <DesignCompleteColumn projects={designCompleteProjects} />

          {/* Dashed blue divider */}
          <div className="flex items-stretch shrink-0">
            <div className="w-0 border-l-2 border-dashed border-blue-400" />
          </div>

          {/* Pending Handover Column */}
          <PendingHandoverColumn handovers={localHandovers} onHandoverAction={(id) => setLocalHandovers(prev => prev.filter(h => h.id !== id))} />
        </div>
      )}

      {/* Active Projects — with Complete button */}
      <ActiveProjectsSection projects={filteredProjects} onComplete={(id) => setProjects(prev => prev.filter(p => p.id !== id))} />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          <ProductLaneRow
            lane="NORMAL"
            productsByStage={productsByLaneAndStage["NORMAL"]}
            compact={viewMode === "compact"}
          />

          <ProductLaneRow
            lane="MEGA"
            productsByStage={productsByLaneAndStage["MEGA"]}
            compact={viewMode === "compact"}
          />
        </div>
      </DragDropContext>

      {subContractProjects.length > 0 && (
        <SubContractSection projects={subContractProjects} />
      )}

      <ProjectDetailPanel
        project={selectedProject}
        onClose={() => setSelectedProjectId(null)}
      />
    </div>
  )
}

// ─── Design Complete Column (Read-Only for Production) ───

function DesignCompleteColumn({ projects }: { projects: DesignCompleteProject[] }) {
  if (projects.length === 0) return null

  return (
    <div className="flex flex-col rounded-lg border border-blue-200 border-t-4 border-t-blue-400 min-w-[280px] bg-blue-50/70 shrink-0">
      <div className="px-3 py-2.5 border-b border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-xs font-semibold uppercase text-blue-700">Design Complete</span>
          </div>
          <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-blue-200 px-1.5 text-[10px] font-semibold text-blue-700">
            {projects.length}
          </span>
        </div>
        <p className="text-[10px] text-blue-500 mt-0.5">Coming from Design (read-only)</p>
      </div>

      <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[400px]">
        {projects.map((project) => {
          const completeCards = project.designCards.filter((c) => c.status === "COMPLETE").length
          const totalCards = project.designCards.length
          const hasHandover = project.designHandover?.status === "SUBMITTED"

          return (
            <div key={project.id} className="rounded-lg border border-blue-200 bg-white p-3 opacity-80">
              <Link href={`/projects/${project.id}`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-mono text-gray-400">{project.projectNumber}</span>
                  {project.isICUFlag && (
                    <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-red-100 text-red-700">ICU</Badge>
                  )}
                </div>
                <div className="text-sm font-medium text-gray-900 truncate">{project.name}</div>
                <div className="text-xs text-gray-500 truncate">{project.customer?.name || "No customer"}</div>
              </Link>

              <div className="mt-2 text-[10px] text-gray-600">
                {completeCards}/{totalCards} products designed
              </div>
              <div className="mt-1 text-[10px] text-gray-400">
                {hasHandover ? "Handover proposed" : "Not yet proposed for handover"}
              </div>

              <div className="mt-2 px-2 py-1.5 rounded bg-blue-50 border border-blue-200 text-center">
                <span className="text-[10px] text-blue-600 font-medium">View Only — Awaiting Design</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Pending Handover Column ───

function PendingHandoverColumn({ handovers, onHandoverAction }: { handovers: PendingHandover[]; onHandoverAction: (id: string) => void }) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

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
      if (res.ok) onHandoverAction(handover.id)
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleReject(handover: PendingHandover) {
    const reason = prompt("Rejection reason:")
    if (!reason) return

    setLoadingAction(handover.id + "-rej")
    try {
      const res = await fetch(`/api/design/handover/${handover.projectId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      })
      if (res.ok) onHandoverAction(handover.id)
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-amber-200 border-t-4 border-t-amber-500 min-w-[300px] bg-amber-50/70 shrink-0">
      <div className="px-3 py-2.5 border-b border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs font-semibold uppercase text-amber-700">Pending Handover</span>
          </div>
          <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-amber-200 px-1.5 text-[10px] font-semibold text-amber-700">
            {handovers.length}
          </span>
        </div>
        <p className="text-[10px] text-amber-500 mt-0.5">Review and decide</p>
      </div>

      <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[400px]">
        {handovers.length === 0 && (
          <div className="py-6 text-center text-xs text-amber-400">No pending handovers</div>
        )}

        {handovers.map((handover) => {
          const isAcking = loadingAction === handover.id + "-ack"
          const isRejecting = loadingAction === handover.id + "-rej"
          const inclProductIds = (handover.includedProductIds || []) as string[]
          const totalProducts = handover.project.products.length
          const includedCount = inclProductIds.length || totalProducts
          const isPartial = includedCount < totalProducts && inclProductIds.length > 0

          return (
            <div key={handover.id} className="rounded-lg border-l-[3px] border-l-amber-500 border border-amber-200 bg-white p-3">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[10px] font-semibold text-red-600">Needs your review</span>
              </div>

              <Link href={`/projects/${handover.project.id}`}>
                <div className="text-xs font-mono text-gray-400">{handover.project.projectNumber}</div>
                <div className="text-sm font-medium text-gray-900 truncate">{handover.project.name}</div>
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

              {/* Products included */}
              <div className="mt-2 space-y-0.5">
                {handover.project.designCards.slice(0, 4).map((card) => {
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
                      <span className={included ? "text-gray-700" : "text-gray-400 italic"}>
                        {card.product.partCode || card.product.description}
                      </span>
                    </div>
                  )
                })}
              </div>

              {isPartial && (
                <div className="mt-1 text-[10px] text-amber-600 font-medium">
                  Partial: {includedCount}/{totalProducts} products
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleAcknowledge(handover)}
                  disabled={!!loadingAction}
                  className="flex-1 inline-flex items-center justify-center rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {isAcking ? "..." : "Accept"}
                </button>
                <button
                  onClick={() => handleReject(handover)}
                  disabled={!!loadingAction}
                  className="inline-flex items-center justify-center rounded-md border border-red-300 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {isRejecting ? "..." : "Return"}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Active Projects Section (with Complete button) ───

const FINISHED_STAGES = ["PACKING", "DISPATCHED", "COMPLETED", "STORAGE", "N_A"]

function ActiveProjectsSection({ projects, onComplete }: { projects: ProductionProject[]; onComplete: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState(false)

  if (projects.length === 0) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>Active Projects</span>
          <span className="text-xs text-gray-400">({projects.length})</span>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="border-t border-gray-100 px-4 py-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <ActiveProjectCard key={project.id} project={project} onComplete={onComplete} />
          ))}
        </div>
      )}
    </div>
  )
}

const ActiveProjectCard = memo(function ActiveProjectCard({ project, onComplete }: { project: ProductionProject; onComplete: (id: string) => void }) {
  const [completing, setCompleting] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

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
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
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
          {expanded ? "Hide" : "Manage"} products
        </button>
      </div>

      {/* Expanded product list with action rows */}
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

      {/* Complete button — only when all products done */}
      {allProductsDone ? (
        <button
          onClick={handleCompleteProduction}
          disabled={completing}
          className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 bg-green-600 text-white hover:bg-green-700"
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
      ) : (
        <div className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-400 bg-gray-100">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {completedProducts}/{totalProducts} products completed
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
