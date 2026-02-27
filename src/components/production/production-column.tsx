"use client"

import { Droppable, Draggable } from "@hello-pangea/dnd"
import {
  SWIM_LANE_ORDER,
  SWIM_LANE_LABELS,
  SWIM_LANE_COLORS,
  STAGE_BORDER_COLORS,
  STAGE_BG_COLORS,
} from "@/lib/production-utils"
import { ProductionProjectCard } from "./production-project-card"
import type { ProductionProject } from "./production-dashboard"

export function ProductionColumn({
  stage,
  stageName,
  projects,
  productCount,
  viewMode,
  onCardClick,
}: {
  stage: string
  stageName: string
  projects: Record<string, ProductionProject[]>
  productCount: number
  viewMode: "compact" | "full"
  onCardClick: (id: string) => void
}) {
  const totalProjects = Object.values(projects).reduce((s, arr) => s + arr.length, 0)
  const borderColor = STAGE_BORDER_COLORS[stage] || "border-t-gray-400"
  const bgColor = STAGE_BG_COLORS[stage] || "bg-gray-50"

  return (
    <div
      className={`flex-shrink-0 w-[280px] rounded-lg border border-gray-200 ${borderColor} border-t-4 bg-white flex flex-col`}
    >
      {/* Column Header */}
      <div className={`px-3 py-2.5 border-b border-gray-100 ${bgColor}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">{stageName}</h3>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
            {totalProjects}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          <span>{productCount} products</span>
          {/* Capacity indicator */}
          <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                totalProjects > 5
                  ? "bg-red-500"
                  : totalProjects > 3
                    ? "bg-amber-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${Math.min(100, (totalProjects / 6) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Swim Lanes */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
        {SWIM_LANE_ORDER.map((lane) => (
          <Droppable key={`${stage}:${lane}`} droppableId={`${stage}:${lane}`}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[60px] px-2 py-2 border-b last:border-b-0 ${
                  SWIM_LANE_COLORS[lane]
                } ${snapshot.isDraggingOver ? "ring-2 ring-blue-300 ring-inset" : ""}`}
              >
                {/* Lane label */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  {lane === "ICU" && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider ${
                      lane === "ICU" ? "text-red-600" : "text-gray-400"
                    }`}
                  >
                    {SWIM_LANE_LABELS[lane]}
                  </span>
                  {projects[lane]?.length > 0 && (
                    <span className="text-[10px] text-gray-400">
                      ({projects[lane].length})
                    </span>
                  )}
                </div>

                {/* Project Cards */}
                {projects[lane]?.map((project, index) => (
                  <Draggable
                    key={project.id}
                    draggableId={project.id}
                    index={index}
                  >
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className={`mb-1.5 ${
                          dragSnapshot.isDragging ? "rotate-2 shadow-lg" : ""
                        }`}
                      >
                        <ProductionProjectCard
                          project={project}
                          viewMode={viewMode}
                          onClick={() => onCardClick(project.id)}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </div>
  )
}
