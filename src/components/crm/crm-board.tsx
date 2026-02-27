"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { OpportunityCard } from "./opportunity-card"
import { NewOpportunityDialog } from "./new-opportunity-dialog"
import { EditOpportunityDialog } from "./edit-opportunity-dialog"
import { Badge } from "@/components/ui/badge"
import { getProspectStatusColor } from "@/lib/utils"
import { Pencil } from "lucide-react"

type Prospect = {
  id: string
  companyName: string
  contactName: string | null
  sector: string | null
  source: string
  status: string
  _count: { opportunities: number }
}

type Opportunity = {
  id: string
  prospectId: string
  name: string
  description: string | null
  estimatedValue: string | number | null
  contactPerson: string | null
  leadSource: string
  status: string
  expectedCloseDate: string | null
  notes: string | null
  sortOrder: number
  convertedProjectId?: string | null
}

type Props = {
  initialProspects: Prospect[]
  initialOpportunities: Opportunity[]
}

function EditableColumnName({ prospect, onRename }: { prospect: Prospect; onRename: (id: string, name: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(prospect.companyName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function handleSave() {
    const trimmed = value.trim()
    if (trimmed && trimmed !== prospect.companyName) {
      onRename(prospect.id, trimmed)
    } else {
      setValue(prospect.companyName)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave()
          if (e.key === "Escape") { setValue(prospect.companyName); setEditing(false) }
        }}
        className="text-sm font-semibold text-gray-900 bg-white border border-blue-400 rounded px-1.5 py-0.5 w-full outline-none ring-1 ring-blue-400"
      />
    )
  }

  return (
    <div className="group flex items-center gap-1.5 min-w-0">
      <Link
        href={`/crm/${prospect.id}`}
        className="text-sm font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors"
        title="View prospect details"
      >
        {prospect.companyName}
      </Link>
      <button
        onClick={(e) => { e.stopPropagation(); setEditing(true) }}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200"
        title="Rename"
      >
        <Pencil className="h-3 w-3 text-gray-400" />
      </button>
    </div>
  )
}

export function CrmBoard({ initialProspects, initialOpportunities }: Props) {
  const [prospects, setProspects] = useState(initialProspects)
  const [opportunities, setOpportunities] = useState(initialOpportunities)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)

  const filteredOpps = statusFilter === "ALL"
    ? opportunities
    : opportunities.filter((o) => o.status === statusFilter)

  // Group opportunities by prospect
  const grouped: Record<string, Opportunity[]> = {}
  for (const prospect of prospects) {
    grouped[prospect.id] = []
  }
  for (const opp of filteredOpps) {
    if (grouped[opp.prospectId]) {
      grouped[opp.prospectId].push(opp)
    }
  }
  for (const prospectId in grouped) {
    grouped[prospectId].sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async function handleRenameProspect(prospectId: string, newName: string) {
    // Optimistic update
    setProspects((prev) =>
      prev.map((p) => p.id === prospectId ? { ...p, companyName: newName } : p)
    )

    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: newName }),
      })
      if (!res.ok) {
        // Revert on failure
        setProspects((prev) =>
          prev.map((p) => p.id === prospectId ? { ...p, companyName: initialProspects.find((ip) => ip.id === prospectId)?.companyName || newName } : p)
        )
      }
    } catch {
      setProspects((prev) =>
        prev.map((p) => p.id === prospectId ? { ...p, companyName: initialProspects.find((ip) => ip.id === prospectId)?.companyName || newName } : p)
      )
    }
  }

  async function handleDragEnd(result: DropResult) {
    const { draggableId, destination, source } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newProspectId = destination.droppableId

    // Optimistic update
    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === draggableId ? { ...o, prospectId: newProspectId } : o
      )
    )

    // Persist to server
    try {
      const res = await fetch(`/api/opportunities/${draggableId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: newProspectId }),
      })
      if (!res.ok) {
        setOpportunities((prev) =>
          prev.map((o) =>
            o.id === draggableId ? { ...o, prospectId: source.droppableId } : o
          )
        )
      }
    } catch {
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === draggableId ? { ...o, prospectId: source.droppableId } : o
        )
      )
    }
  }

  const filterOptions = [
    { value: "ALL", label: "All" },
    { value: "ACTIVE_LEAD", label: "Active Lead" },
    { value: "QUOTED", label: "Quoted" },
    { value: "WON", label: "Won" },
    { value: "LOST", label: "Lost" },
  ]

  return (
    <>
      {/* Filter Bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-1 rounded-lg border border-border bg-white p-1">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-blue-100 text-blue-800"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">
          Showing {filteredOpps.length} opportunities across {prospects.length} prospects
        </span>
      </div>

      {/* Board */}
      {prospects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-2">No prospects yet.</p>
          <p className="text-sm text-gray-400">Click &quot;New Prospect&quot; to start building your pipeline.</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {prospects.map((prospect) => {
              const prospectOpps = grouped[prospect.id] || []

              return (
                <Droppable key={prospect.id} droppableId={prospect.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex flex-col rounded-lg border border-border border-t-4 border-t-blue-400 min-w-[280px] max-w-[320px] shrink-0 ${
                        snapshot.isDraggingOver ? "bg-blue-50/50" : "bg-gray-50/50"
                      }`}
                    >
                      {/* Column Header */}
                      <div className="flex flex-col gap-1.5 px-3 py-2.5 border-b border-border">
                        <div className="flex items-center justify-between gap-2">
                          <EditableColumnName prospect={prospect} onRename={handleRenameProspect} />
                          <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-gray-200 px-1.5 text-[10px] font-semibold text-gray-600 shrink-0">
                            {prospectOpps.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={getProspectStatusColor(prospect.status) + " text-[10px] px-1.5 py-0"}>
                            {prospect.status}
                          </Badge>
                          {prospect.sector && (
                            <span className="text-[10px] text-gray-400 truncate">{prospect.sector}</span>
                          )}
                        </div>
                        <NewOpportunityDialog prospectId={prospect.id} prospectName={prospect.companyName} />
                      </div>

                      {/* Cards */}
                      <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[80px]">
                        {prospectOpps.map((opp, index) => (
                          <Draggable key={opp.id} draggableId={opp.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={dragSnapshot.isDragging ? "opacity-90 rotate-1" : ""}
                              >
                                <OpportunityCard
                                  opportunity={opp}
                                  onClick={() => setSelectedOpp(opp)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {prospectOpps.length === 0 && !snapshot.isDraggingOver && (
                          <div className="py-6 text-center text-xs text-gray-400">
                            No opportunities
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
      )}

      {/* Edit Dialog */}
      {selectedOpp && (
        <EditOpportunityDialog
          opportunity={selectedOpp}
          open={!!selectedOpp}
          onOpenChange={(open) => { if (!open) setSelectedOpp(null) }}
          onUpdate={(updated) => {
            setOpportunities((prev) => prev.map((o) => o.id === updated.id ? { ...updated } : o))
            setSelectedOpp(null)
          }}
        />
      )}
    </>
  )
}
