"use client"

import { useState, memo } from "react"
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd"
import { GripVertical, Lock } from "lucide-react"
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from "@/lib/production-utils"
import { TaskActionButtons } from "./task-action-buttons"
import type { WorkshopTask, WorkshopWorker } from "./workshop-view"

export function ProductQueueRail({
  activeTasks,
  blockedTasks = [],
  queuedTasks: initialQueued,
  completedTasks,
  inspectedTasks,
  projectIds,
  workers,
  stage,
  onAction,
}: {
  activeTasks: WorkshopTask[]
  blockedTasks?: WorkshopTask[]
  queuedTasks: WorkshopTask[]
  completedTasks: WorkshopTask[]
  inspectedTasks: WorkshopTask[]
  projectIds: Set<string>
  workers: WorkshopWorker[]
  stage: string
  onAction: () => Promise<void>
}) {
  const [queuedTasks, setQueuedTasks] = useState(initialQueued)

  // Sync when props change
  if (initialQueued !== queuedTasks && initialQueued.length !== queuedTasks.length) {
    setQueuedTasks(initialQueued)
  }

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source } = result
    if (!destination || destination.index === source.index) return

    const reordered = [...queuedTasks]
    const [moved] = reordered.splice(source.index, 1)
    reordered.splice(destination.index, 0, moved)
    setQueuedTasks(reordered)

    // Persist reorder
    try {
      await fetch("/api/production/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: reordered.map((t) => t.id) }),
      })
    } catch {
      setQueuedTasks(initialQueued)
    }
  }

  return (
    <div className="space-y-4">
      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <TaskSection
          title="Active"
          titleColor="text-blue-700"
          bgColor="bg-blue-50/50"
        >
          {activeTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectInRail={projectIds.has(task.projectId)}
              workers={workers}
              onAction={onAction}
            />
          ))}
        </TaskSection>
      )}

      {/* Blocked Tasks */}
      {blockedTasks.length > 0 && (
        <TaskSection
          title="Blocked — Awaiting Design Release"
          titleColor="text-gray-600"
          bgColor="bg-gray-100/50"
        >
          {blockedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectInRail={projectIds.has(task.projectId)}
              workers={workers}
              onAction={onAction}
            />
          ))}
        </TaskSection>
      )}

      {/* Queued Tasks (draggable) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-0.5 flex-1 bg-gray-300" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Lower Rail: Product Queue
          </span>
          <div className="h-0.5 flex-1 bg-gray-300" />
        </div>

        {queuedTasks.length === 0 && activeTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">
              No products queued at this stage
            </p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="queue">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 min-h-[60px] rounded-lg p-2 ${
                    snapshot.isDraggingOver ? "bg-blue-50" : "bg-gray-50"
                  }`}
                >
                  {queuedTasks.map((task, index) => (
                    <Draggable
                      key={task.id}
                      draggableId={task.id}
                      index={index}
                    >
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={dragSnapshot.isDragging ? "shadow-lg" : ""}
                        >
                          <TaskCard
                            task={task}
                            projectInRail={projectIds.has(task.projectId)}
                            workers={workers}
                            onAction={onAction}
                            dragHandleProps={dragProvided.dragHandleProps}
                            queuePosition={index + 1}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Completed — Awaiting Handover */}
      {completedTasks.length > 0 && (
        <TaskSection
          title="Completed — Awaiting Handover"
          titleColor="text-amber-700"
          bgColor="bg-amber-50/50"
        >
          {completedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectInRail={projectIds.has(task.projectId)}
              workers={workers}
              onAction={onAction}
            />
          ))}
        </TaskSection>
      )}

      {/* Already Inspected */}
      {inspectedTasks.length > 0 && (
        <TaskSection
          title="Inspected & Transferred"
          titleColor="text-green-700"
          bgColor="bg-green-50/50"
        >
          {inspectedTasks.slice(0, 5).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectInRail={projectIds.has(task.projectId)}
              workers={workers}
              onAction={onAction}
            />
          ))}
          {inspectedTasks.length > 5 && (
            <p className="text-xs text-gray-500 text-center py-1">
              +{inspectedTasks.length - 5} more
            </p>
          )}
        </TaskSection>
      )}
    </div>
  )
}

function TaskSection({
  title,
  titleColor,
  bgColor,
  children,
}: {
  title: string
  titleColor: string
  bgColor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-0.5 flex-1 bg-gray-200" />
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${titleColor}`}
        >
          {title}
        </span>
        <div className="h-0.5 flex-1 bg-gray-200" />
      </div>
      <div className={`space-y-2 rounded-lg p-2 ${bgColor}`}>
        {children}
      </div>
    </div>
  )
}

const TaskCard = memo(function TaskCard({
  task,
  projectInRail,
  workers,
  onAction,
  dragHandleProps,
  queuePosition,
}: {
  task: WorkshopTask
  projectInRail: boolean
  workers: WorkshopWorker[]
  onAction: () => Promise<void>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragHandleProps?: any
  queuePosition?: number
}) {
  const statusLabel = TASK_STATUS_LABELS[task.status] || task.status
  const statusColor = TASK_STATUS_COLORS[task.status] || "bg-gray-100 text-gray-700"

  const isRework = task.status === "REWORK"
  const isBlocked = task.status === "BLOCKED"
  const isOnHold = task.status === "ON_HOLD"
  const hasNcr = !!task.ncrId

  return (
    <div
      className={`rounded-lg border p-3 ${
        isBlocked
          ? "border-gray-300 bg-gray-100/80 opacity-75"
          : isRework
            ? "border-red-300 bg-red-50/30"
            : task.status === "IN_PROGRESS"
              ? "border-blue-300 bg-blue-50/30"
              : task.status === "COMPLETED"
                ? "border-green-300 bg-white"
                : isOnHold
                  ? "border-amber-300 bg-amber-50/30"
                  : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        {dragHandleProps && !isBlocked && (
          <div
            {...dragHandleProps}
            className="mt-0.5 cursor-grab text-gray-400 hover:text-gray-600"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        {/* Lock icon for blocked tasks (replaces drag handle) */}
        {isBlocked && (
          <div className="mt-0.5 text-gray-400">
            <Lock className="h-4 w-4" />
          </div>
        )}

        {/* Queue position */}
        {queuePosition !== undefined && !isBlocked && (
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
            {queuePosition}
          </span>
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2">
            {isBlocked ? (
              <span className="flex items-center gap-1 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                <Lock className="h-2.5 w-2.5" />
                BLOCKED
              </span>
            ) : (
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColor}`}>
                {statusLabel}
              </span>
            )}
            {hasNcr && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                NCR
              </span>
            )}
            <span className={`text-xs font-semibold ${isBlocked ? "text-gray-500" : "text-gray-700"}`}>
              {task.project.projectNumber}
            </span>
          </div>

          {/* Product info */}
          <div className={`mt-1 text-sm font-medium ${isBlocked ? "text-gray-500" : "text-gray-800"}`}>
            {task.product.description}
          </div>
          <div className={`text-xs ${isBlocked ? "text-gray-400" : "text-gray-500"}`}>
            {task.product.partCode}
            {task.product.quantity > 1 && ` (Qty: ${task.product.quantity})`}
          </div>

          {/* Blocked reason */}
          {isBlocked && (
            <div className="mt-1.5 flex items-center gap-1.5 rounded bg-gray-200/70 px-2 py-1">
              <Lock className="h-3 w-3 text-gray-500 shrink-0" />
              <span className="text-[10px] text-gray-600">
                {task.notes || "This stage is blocked. Design needs to release it."}
              </span>
            </div>
          )}

          {/* Details row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-500">
            {task.estimatedMins && (
              <span>Est: {formatMins(task.estimatedMins)}</span>
            )}
            {task.assignedTo && <span>Worker: {task.assignedTo}</span>}
            {task.startedAt && (
              <span>Started: {new Date(task.startedAt).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            )}
            {task.completedAt && (
              <span>Done: {new Date(task.completedAt).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            )}
            {task.actualMins && <span>Actual: {formatMins(task.actualMins)}</span>}
            {task.inspectedBy && <span>Inspector: {task.inspectedBy}</span>}
          </div>

          {!isBlocked && task.notes && (
            <div className="mt-1 text-[10px] text-gray-400 italic truncate">
              {task.notes}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0">
          <TaskActionButtons
            task={task}
            projectInRail={projectInRail}
            workers={workers}
            onAction={onAction}
          />
        </div>
      </div>
    </div>
  )
})

function formatMins(mins: number): string {
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remaining = mins % 60
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
}
