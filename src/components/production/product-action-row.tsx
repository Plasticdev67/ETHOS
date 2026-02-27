"use client"

import { useState, useEffect } from "react"
import { ALL_PRODUCTION_STAGES, ALL_STAGE_DISPLAY_NAMES, STAGE_WORKER_ROLES } from "@/lib/production-utils"

type Worker = {
  id: string
  name: string
  role: string
  isAvailable: boolean
}

type ProductActionRowProps = {
  productId: string
  projectId: string
  currentStage: string | null
  onStageChange?: (newStage: string) => void
}

export function ProductActionRow({ productId, projectId, currentStage, onStageChange }: ProductActionRowProps) {
  const [stage, setStage] = useState(currentStage || "AWAITING")
  const [workers, setWorkers] = useState<Worker[]>([])
  const [selectedWorker, setSelectedWorker] = useState("")
  const [updatingStage, setUpdatingStage] = useState(false)
  const [assigningWorker, setAssigningWorker] = useState(false)
  const [loadingWorkers, setLoadingWorkers] = useState(false)

  // Fetch relevant workers when stage changes
  useEffect(() => {
    const role = STAGE_WORKER_ROLES[stage]
    if (!role) {
      setWorkers([])
      return
    }
    setLoadingWorkers(true)
    fetch(`/api/production/workers?role=${role}`)
      .then((res) => res.json())
      .then((data) => setWorkers(Array.isArray(data) ? data : []))
      .catch(() => setWorkers([]))
      .finally(() => setLoadingWorkers(false))
  }, [stage])

  async function handleStageChange(newStage: string) {
    if (newStage === stage) return
    setUpdatingStage(true)
    try {
      const res = await fetch(`/api/production/products/${productId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productionStatus: newStage }),
      })
      if (res.ok) {
        setStage(newStage)
        onStageChange?.(newStage)
      }
    } finally {
      setUpdatingStage(false)
    }
  }

  async function handleAssignWorker() {
    if (!selectedWorker) return
    setAssigningWorker(true)
    try {
      await fetch("/api/production/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          projectId,
          stage,
          assignedTo: selectedWorker,
        }),
      })
      setSelectedWorker("")
    } finally {
      setAssigningWorker(false)
    }
  }

  const workerRole = STAGE_WORKER_ROLES[stage]

  return (
    <div className="flex items-center gap-2 mt-1">
      {/* Stage dropdown */}
      <select
        value={stage}
        onChange={(e) => handleStageChange(e.target.value)}
        disabled={updatingStage}
        className="text-[10px] border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50 min-w-[90px]"
      >
        {ALL_PRODUCTION_STAGES.map((s) => (
          <option key={s} value={s}>
            {ALL_STAGE_DISPLAY_NAMES[s]}
          </option>
        ))}
      </select>

      {/* Worker assignment (only for workshop stages) */}
      {workerRole && (
        <>
          <select
            value={selectedWorker}
            onChange={(e) => setSelectedWorker(e.target.value)}
            disabled={loadingWorkers || assigningWorker}
            className="text-[10px] border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50 min-w-[90px]"
          >
            <option value="">
              {loadingWorkers ? "Loading..." : "Assign worker"}
            </option>
            {workers.map((w) => (
              <option key={w.id} value={w.name}>
                {w.name} {!w.isAvailable ? "(busy)" : ""}
              </option>
            ))}
          </select>
          {selectedWorker && (
            <button
              onClick={handleAssignWorker}
              disabled={assigningWorker}
              className="text-[10px] px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {assigningWorker ? "..." : "Assign"}
            </button>
          )}
        </>
      )}
    </div>
  )
}
