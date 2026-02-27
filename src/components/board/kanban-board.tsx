"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { ProjectCard } from "./project-card"

type BoardProduct = {
  id: string
  description: string
  partCode: string
  productJobNumber: string | null
  quantity: number
  productionStatus: string | null
}

type BoardProject = {
  id: string
  projectNumber: string
  name: string
  projectStatus: string
  customer: { name: string } | null
  priority: string
  isICUFlag: boolean
  classification: string
  ragStatus: string | null
  estimatedValue: string | number | null
  contractValue: string | number | null
  targetCompletion: string | null
  projectManager: { name: string } | null
  installManager: { name: string } | null
  coordinator: { name: string } | null
  products: BoardProduct[]
  designCards: { id: string; status: string }[]
  _count: { products: number; designCards: number }
}

const BOARD_COLUMNS = [
  "OPPORTUNITY",
  "QUOTATION",
  "DESIGN",
  "DESIGN_FREEZE",
  "MANUFACTURE",
  "INSTALLATION",
  "REVIEW",
] as const

const columnColors: Record<string, string> = {
  OPPORTUNITY: "border-t-gray-400",
  QUOTATION: "border-t-blue-400",
  DESIGN: "border-t-indigo-500",
  DESIGN_FREEZE: "border-t-rose-500 border-t-[6px]",
  MANUFACTURE: "border-t-amber-500",
  INSTALLATION: "border-t-green-500",
  REVIEW: "border-t-purple-500",
}

const columnLabels: Record<string, string> = {
  OPPORTUNITY: "Sales / Opportunity",
  QUOTATION: "Quotation",
  DESIGN: "Design",
  DESIGN_FREEZE: "Design Freeze Window",
  MANUFACTURE: "Production",
  INSTALLATION: "Installation",
  REVIEW: "Review",
}

function groupByStatus(projects: BoardProject[]) {
  const grouped: Record<string, BoardProject[]> = {}
  for (const status of BOARD_COLUMNS) {
    grouped[status] = []
  }
  for (const project of projects) {
    const status = project.projectStatus as string
    if (grouped[status]) {
      grouped[status].push(project)
    } else {
      grouped["OPPORTUNITY"].push(project)
    }
  }
  return grouped
}

// Allowed forward transitions — projects must follow the proper workflow.
// Moves not listed here are blocked with a message directing the user to the right page.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  // OPPORTUNITY → can only go to QUOTATION if products exist (checked at drag time)
  OPPORTUNITY: [],                  // blocked by default — must go through CRM
  QUOTATION: ["DESIGN"],
  DESIGN: ["DESIGN_FREEZE"],
  DESIGN_FREEZE: ["MANUFACTURE"],
  MANUFACTURE: ["INSTALLATION"],
  INSTALLATION: ["REVIEW"],
  REVIEW: [],                       // end state (or manual COMPLETE)
}

// Message shown when a blocked transition is attempted
const BLOCKED_MESSAGES: Record<string, string> = {
  OPPORTUNITY:
    "To move a project to Quotation, add products via the CRM Quote Builder first.",
  DESIGN_TO_FREEZE:
    "All design cards must be completed before entering Design Freeze. Please complete outstanding design work first.",
  MANUFACTURE_TO_INSTALL:
    "All products must complete production before moving to Installation. Check the Production board for outstanding items.",
  INSTALL_TO_REVIEW:
    "Installation must be signed off before moving to Review. Please confirm installation is complete on the project page.",
}

export function KanbanBoard({ initialProjects }: { initialProjects: BoardProject[] }) {
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)
  const [filterClassification, setFilterClassification] = useState("ALL")
  const [filterPriority, setFilterPriority] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [toast, setToast] = useState<{
    message: string
    projectId?: string
    crmLink?: string
  } | null>(null)

  const filteredProjects = projects.filter((p) => {
    if (filterClassification !== "ALL" && p.classification !== filterClassification) return false
    if (filterPriority !== "ALL" && p.priority !== filterPriority) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!p.name.toLowerCase().includes(q) &&
          !p.projectNumber.toLowerCase().includes(q) &&
          !(p.customer?.name || "").toLowerCase().includes(q)) return false
    }
    return true
  })

  const grouped = groupByStatus(filteredProjects)

  function showToast(message: string, projectId?: string, crmLink?: string) {
    setToast({ message, projectId, crmLink })
    setTimeout(() => setToast(null), 6000)
  }

  async function handleDragEnd(result: DropResult) {
    const { draggableId, destination, source } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId) return

    const fromStatus = source.droppableId
    const toStatus = destination.droppableId
    const project = projects.find((p) => p.id === draggableId)
    if (!project) return

    // Check if this transition is allowed
    const allowed = ALLOWED_TRANSITIONS[fromStatus]
    if (allowed !== undefined && !allowed.includes(toStatus)) {
      // Special case: OPPORTUNITY → QUOTATION requires products
      if (fromStatus === "OPPORTUNITY" && toStatus === "QUOTATION") {
        if (project._count.products > 0) {
          // Has products — allow the move
        } else {
          showToast(
            BLOCKED_MESSAGES["OPPORTUNITY"],
            project.id,
            "/crm"
          )
          return
        }
      } else {
        showToast(
          `Cannot move directly from ${columnLabels[fromStatus]} to ${columnLabels[toStatus]}. Projects must follow the workflow sequence.`
        )
        return
      }
    }

    // Gate: DESIGN → DESIGN_FREEZE — all design cards must be COMPLETE
    if (fromStatus === "DESIGN" && toStatus === "DESIGN_FREEZE") {
      const totalCards = project._count.designCards
      const completedCards = project.designCards.filter(
        (dc) => dc.status === "COMPLETE"
      ).length
      if (totalCards === 0 || completedCards < totalCards) {
        showToast(
          BLOCKED_MESSAGES["DESIGN_TO_FREEZE"],
          project.id,
          `/projects/${project.id}`
        )
        return
      }
    }

    // Gate: MANUFACTURE → INSTALLATION — all products must have production completed (PACKING stage)
    if (fromStatus === "MANUFACTURE" && toStatus === "INSTALLATION") {
      const allProductsDone = project.products.length > 0 && project.products.every(
        (prod) => prod.productionStatus === "PACKING" || prod.productionStatus === "COMPLETE"
      )
      if (!allProductsDone) {
        showToast(
          BLOCKED_MESSAGES["MANUFACTURE_TO_INSTALL"],
          project.id,
          "/production"
        )
        return
      }
    }

    // Gate: INSTALLATION → REVIEW — all products must be through production
    if (fromStatus === "INSTALLATION" && toStatus === "REVIEW") {
      const allProductsDone = project.products.length > 0 && project.products.every(
        (prod) => prod.productionStatus === "PACKING" || prod.productionStatus === "COMPLETE"
      )
      if (!allProductsDone) {
        showToast(
          BLOCKED_MESSAGES["INSTALL_TO_REVIEW"],
          project.id,
          `/projects/${project.id}`
        )
        return
      }
    }

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) =>
        p.id === draggableId ? { ...p, projectStatus: toStatus } : p
      )
    )

    // Persist to server
    try {
      const res = await fetch(`/api/projects/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectStatus: toStatus }),
      })
      if (!res.ok) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === draggableId
              ? { ...p, projectStatus: source.droppableId }
              : p
          )
        )
      }
    } catch {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === draggableId
            ? { ...p, projectStatus: source.droppableId }
            : p
        )
      )
    }
  }

  const selectClass = "rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"

  return (
    <>
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Board Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          type="text"
          placeholder="Search board..."
          className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs w-48 focus:border-blue-500 focus:outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select className={selectClass} value={filterClassification} onChange={(e) => setFilterClassification(e.target.value)}>
          <option value="ALL">All Types</option>
          <option value="NORMAL">Normal</option>
          <option value="MEGA">Mega</option>
          <option value="SUB_CONTRACT">Sub-contract</option>
        </select>
        <select className={selectClass} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="ALL">All Priorities</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">
          {filteredProjects.length} of {projects.length} projects
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {BOARD_COLUMNS.map((status) => {
          const color = columnColors[status] || "border-t-gray-300"
          const label = columnLabels[status] || status
          const colProjects = grouped[status]

          return (
            <Droppable key={status} droppableId={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-col rounded-lg border ${status === "DESIGN_FREEZE" ? "border-rose-200 ring-1 ring-rose-200" : "border-border"} ${color} border-t-4 min-w-[260px] max-w-[300px] ${
                    snapshot.isDraggingOver ? "bg-blue-50/50" : status === "DESIGN_FREEZE" ? "bg-rose-50/60" : "bg-gray-50/50"
                  }`}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                    <h3 className={`text-xs font-semibold uppercase ${status === "DESIGN_FREEZE" ? "text-rose-700" : "text-gray-700"}`}>{label}</h3>
                    <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-gray-200 px-1.5 text-[10px] font-semibold text-gray-600">
                      {colProjects.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-220px)] min-h-[100px]">
                    {colProjects.map((project, index) => (
                      <Draggable key={project.id} draggableId={project.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={dragSnapshot.isDragging ? "opacity-90 rotate-1" : ""}
                          >
                            <ProjectCard project={project} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {colProjects.length === 0 && !snapshot.isDraggingOver && (
                      <div className="py-8 text-center text-xs text-gray-400">
                        No projects
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          )
        })}
      </div>
    </DragDropContext>

    {/* Blocked transition toast */}
    {toast && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg max-w-lg">
          <svg className="h-5 w-5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-amber-800">{toast.message}</p>
          </div>
          {toast.crmLink && (
            <button
              onClick={() => {
                router.push(toast.crmLink!)
                setToast(null)
              }}
              className="shrink-0 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
            >
              {toast.crmLink.startsWith("/crm") ? "Go to CRM" :
               toast.crmLink.startsWith("/production") ? "Go to Production" :
               "View Project"}
            </button>
          )}
          <button
            onClick={() => setToast(null)}
            className="shrink-0 text-amber-400 hover:text-amber-600"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      </div>
    )}
    </>
  )
}
