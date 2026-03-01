"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Badge } from "@/components/ui/badge"
import {
  formatCurrency,
  cn,
} from "@/lib/utils"

export type DeptProject = {
  id: string
  projectNumber: string
  name: string
  projectStatus: string
  departmentStatus: string
  priority: string
  customer: { name: string } | null
  coordinator: { name: string } | null
  projectManager: { name: string } | null
  contractValue: string | number | null
  targetCompletion: string | null
  p2Date: string | null
  p3Date: string | null
  p4Date: string | null
  assignees?: string[]
}

const COLUMNS = [
  { id: "TODO", label: "To Do", borderColor: "border-t-gray-400", bgColor: "bg-gray-50/30" },
  { id: "ONGOING", label: "Ongoing", borderColor: "border-t-blue-400", bgColor: "bg-blue-50/30" },
  { id: "REVIEW", label: "Review", borderColor: "border-t-amber-400", bgColor: "bg-amber-50/30" },
  { id: "DONE", label: "Done", borderColor: "border-t-green-400", bgColor: "bg-green-50/30" },
] as const

const cardStatusColor: Record<string, string> = {
  TODO: "border-l-gray-300 bg-white",
  ONGOING: "border-l-blue-400 bg-blue-50/30",
  REVIEW: "border-l-amber-400 bg-amber-50/30",
  DONE: "border-l-green-400 bg-green-50/30",
}

const priorityBadge: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  NORMAL: "bg-gray-100 text-gray-600",
  LOW: "bg-blue-100 text-blue-600",
}

function groupByDeptStatus(projects: DeptProject[]) {
  const grouped: Record<string, DeptProject[]> = {}
  for (const col of COLUMNS) {
    grouped[col.id] = []
  }
  for (const p of projects) {
    if (grouped[p.departmentStatus]) {
      grouped[p.departmentStatus].push(p)
    } else {
      grouped["TODO"].push(p)
    }
  }
  return grouped
}

export function DepartmentBoard(props: {
  projects: DeptProject[]
  departmentLabel: string
  doneLabel: string
}) {
  const { projects: initialProjects, doneLabel } = props
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)

  const grouped = groupByDeptStatus(projects)

  async function handleDragEnd(result: DropResult) {
    const { draggableId, destination, source } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatus = destination.droppableId
    const project = projects.find((p) => p.id === draggableId)

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => (p.id === draggableId ? { ...p, departmentStatus: newStatus } : p))
    )

    // If moving to DONE, remove from this board after a brief delay (project moves to next department)
    if (newStatus === "DONE") {
      setTimeout(() => {
        setProjects((prev) => prev.filter((p) => p.id !== draggableId))
      }, 1500)
    }

    try {
      const res = await fetch(`/api/projects/${draggableId}/department-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentStatus: newStatus }),
      })
      if (!res.ok) {
        // Revert on failure
        if (project) {
          setProjects((prev) =>
            prev.map((p) => (p.id === draggableId ? { ...p, departmentStatus: project.departmentStatus } : p))
          )
        }
      } else {
        router.refresh()
      }
    } catch {
      if (project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === draggableId ? { ...p, departmentStatus: project.departmentStatus } : p))
        )
      }
    }
  }

  const columns = COLUMNS.map((col) =>
    col.id === "DONE" ? { ...col, label: doneLabel } : col
  )

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colProjects = grouped[col.id]
          const total = colProjects.reduce(
            (sum, p) => sum + (p.contractValue ? parseFloat(String(p.contractValue)) : 0),
            0
          )

          return (
            <Droppable key={col.id} droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-col rounded-lg border border-border ${col.borderColor} border-t-4 min-w-[280px] max-w-[320px] flex-1 shrink-0 ${
                    snapshot.isDraggingOver ? "bg-blue-50/50" : "bg-gray-50/50"
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                      <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-gray-200 px-1.5 text-[10px] font-semibold text-gray-600">
                        {colProjects.length}
                      </span>
                    </div>
                    {total > 0 && (
                      <span className="text-xs font-mono text-gray-500">
                        {formatCurrency(total)}
                      </span>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[80px]">
                    {colProjects.map((project, index) => (
                      <Draggable key={project.id} draggableId={project.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={dragSnapshot.isDragging ? "opacity-90 rotate-1" : ""}
                          >
                            <Link href={`/projects/${project.id}`}>
                              <div
                                className={cn(
                                  "rounded-lg border border-border border-l-4 p-3 shadow-sm hover:shadow-md transition-all cursor-pointer",
                                  cardStatusColor[project.departmentStatus] || "border-l-gray-300 bg-white"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-xs font-mono text-gray-400">
                                        {project.projectNumber}
                                      </span>
                                      {project.priority !== "NORMAL" && (
                                        <Badge
                                          variant="secondary"
                                          className={cn(
                                            "text-[8px] px-1 py-0 leading-tight",
                                            priorityBadge[project.priority] || ""
                                          )}
                                        >
                                          {project.priority}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                      {project.name}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-xs text-gray-500 truncate">
                                  {project.customer?.name || "No customer"}
                                </div>

                                {project.contractValue && (
                                  <div className="text-sm font-mono font-medium text-gray-900 mt-1.5">
                                    {formatCurrency(parseFloat(String(project.contractValue)))}
                                  </div>
                                )}

                                {project.assignees && project.assignees.length > 0 && (
                                  <div className="flex items-center gap-1 mt-1.5 text-[10px] text-indigo-600">
                                    <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                    <span className="truncate">{project.assignees.join(", ")}</span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between mt-1.5 text-[10px] text-gray-400">
                                  <span>{project.coordinator?.name || project.projectManager?.name || "Unassigned"}</span>
                                  {project.targetCompletion && (
                                    <span>
                                      Due {new Date(project.targetCompletion).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {colProjects.length === 0 && !snapshot.isDraggingOver && (
                      <div className="py-6 text-center text-xs text-gray-400">
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
  )
}
