"use client"

import { useState } from "react"
import { Play, CheckCircle2, Pause, RotateCcw, Eye, XCircle, Lock } from "lucide-react"
import { NcrRejectDialog } from "./ncr-reject-dialog"
import { usePermissions } from "@/hooks/use-permissions"
import type { WorkshopTask, WorkshopWorker } from "./workshop-view"

export function TaskActionButtons({
  task,
  projectInRail,
  workers,
  onAction,
}: {
  task: WorkshopTask
  projectInRail: boolean
  workers: WorkshopWorker[]
  onAction: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [showWorkerSelect, setShowWorkerSelect] = useState(false)
  const [showNcrDialog, setShowNcrDialog] = useState(false)
  const { can } = usePermissions()
  const canManage = can("production:manage")
  const canInspect = can("production:inspect")

  const callApi = async (url: string, body?: Record<string, unknown>) => {
    setLoading(true)
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      })
      if (res.ok) {
        await onAction()
      }
    } catch (err) {
      console.error("Action failed:", err)
    } finally {
      setLoading(false)
      setShowWorkerSelect(false)
    }
  }

  const callPatch = async (url: string, body: Record<string, unknown>) => {
    setLoading(true)
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        await onAction()
      }
    } catch (err) {
      console.error("Action failed:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  // BLOCKED — show disabled "Cannot Start" button with lock icon
  if (task.status === "BLOCKED") {
    return (
      <div
        title="This stage is blocked. Design needs to release it."
        className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-400 cursor-not-allowed"
      >
        <Lock className="h-3 w-3" />
        Cannot Start
      </div>
    )
  }

  // PENDING or REWORK — show Start button (only for users with production:manage)
  if (task.status === "PENDING" || task.status === "REWORK") {
    if (!canManage) return null

    const canStart = projectInRail

    if (showWorkerSelect) {
      return (
        <div className="flex flex-col gap-1">
          <select
            autoFocus
            className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:border-blue-500"
            onChange={(e) => {
              if (e.target.value) {
                callApi(`/api/production/tasks/${task.id}/start`, {
                  assignedTo: e.target.value,
                })
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Assign worker...
            </option>
            {workers.map((w) => (
              <option key={w.id} value={w.name}>
                {w.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowWorkerSelect(false)}
            className="text-[10px] text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )
    }

    return (
      <button
        onClick={() => setShowWorkerSelect(true)}
        disabled={!canStart}
        title={
          canStart
            ? "Start work"
            : "Cannot start: project tracker not present in upper rail"
        }
        className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
          canStart
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        <Play className="h-3 w-3" />
        Start
      </button>
    )
  }

  // IN_PROGRESS — show Complete and Hold buttons (only for users with production:manage)
  if (task.status === "IN_PROGRESS") {
    if (!canManage) return null
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={() => callApi(`/api/production/tasks/${task.id}/complete`)}
          className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          <CheckCircle2 className="h-3 w-3" />
          Complete
        </button>
        <button
          onClick={() =>
            callPatch(`/api/production/tasks/${task.id}`, {
              status: "ON_HOLD",
            })
          }
          className="flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200"
        >
          <Pause className="h-3 w-3" />
          Hold
        </button>
      </div>
    )
  }

  // COMPLETED + inspection PENDING — show Inspect & Accept / Reject (only for users with production:inspect)
  if (task.status === "COMPLETED" && task.inspectionStatus === "PENDING") {
    if (!canInspect) return null
    return (
      <>
        <div className="flex flex-col gap-1">
          <button
            onClick={() =>
              callApi(`/api/production/tasks/${task.id}/inspect`, {
                decision: "ACCEPTED",
              })
            }
            className="flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
          >
            <Eye className="h-3 w-3" />
            Accept
          </button>
          <button
            onClick={() => setShowNcrDialog(true)}
            className="flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
          >
            <XCircle className="h-3 w-3" />
            Reject
          </button>
        </div>

        {showNcrDialog && (
          <NcrRejectDialog
            task={task}
            onSubmit={async (ncrData) => {
              await callApi(`/api/production/tasks/${task.id}/inspect`, {
                decision: "REJECTED",
                ...ncrData,
              })
              setShowNcrDialog(false)
            }}
            onCancel={() => setShowNcrDialog(false)}
          />
        )}
      </>
    )
  }

  // ON_HOLD — show Resume (only for users with production:manage)
  if (task.status === "ON_HOLD") {
    if (!canManage) return null
    return (
      <button
        onClick={() =>
          callPatch(`/api/production/tasks/${task.id}`, {
            status: "IN_PROGRESS",
          })
        }
        className="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
      >
        <RotateCcw className="h-3 w-3" />
        Resume
      </button>
    )
  }

  return null
}
