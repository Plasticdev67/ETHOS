"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { generateDayColumns } from "@/lib/planning-utils"
import {
  Factory,
  Loader2,
} from "lucide-react"

type ScheduledTask = {
  taskId: string
  productId: string
  productName: string
  projectId: string
  projectNumber: string
  projectName: string
  customerName: string
  stage: string
  stageLabel: string
  status: string
  estimatedMins: number
  actualMins: number | null
  queuePosition: number
  assignedTo: string | null
  scheduledStart: string
  scheduledEnd: string
  isICU: boolean
  priority: string
  targetDate: string | null
}

type StageInfo = { id: string; label: string }
type WorkerInfo = { id: string; name: string; role: string }

const STAGE_COLORS: Record<string, string> = {
  CUTTING: "bg-orange-400",
  FABRICATION: "bg-amber-400",
  FITTING: "bg-yellow-400",
  SHOTBLASTING: "bg-lime-400",
  PAINTING: "bg-teal-400",
  PACKING: "bg-cyan-400",
}

export default function ShopFloorPage() {
  const [horizonWeeks, setHorizonWeeks] = useState("2")
  const [viewMode, setViewMode] = useState<"product" | "stage">("product")
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [stages, setStages] = useState<StageInfo[]>([])
  const [, setWorkers] = useState<WorkerInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/planning/shopfloor?weeks=${horizonWeeks}&view=${viewMode}`)
      .then(r => r.json())
      .then(data => {
        setTasks(data.scheduled || [])
        setStages(data.stages || [])
        setWorkers(data.workers || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [horizonWeeks, viewMode])

  // Generate day columns
  const days = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return generateDayColumns(today, parseInt(horizonWeeks) * 7)
  }, [horizonWeeks])

  // Group tasks by product or stage
  const groupedRows = useMemo(() => {
    if (viewMode === "product") {
      const byProduct: Record<string, { label: string; sublabel: string; isICU: boolean; tasks: ScheduledTask[] }> = {}
      for (const task of tasks) {
        if (!byProduct[task.productId]) {
          byProduct[task.productId] = {
            label: task.productName,
            sublabel: `${task.projectNumber} — ${task.projectName}`,
            isICU: task.isICU,
            tasks: [],
          }
        }
        byProduct[task.productId].tasks.push(task)
      }
      return Object.entries(byProduct).map(([id, data]) => ({ id, ...data }))
    } else {
      return stages.map(stage => ({
        id: stage.id,
        label: stage.label,
        sublabel: `${tasks.filter(t => t.stage === stage.id).length} tasks`,
        isICU: false,
        tasks: tasks.filter(t => t.stage === stage.id),
      }))
    }
  }, [tasks, stages, viewMode])

  // Helper: which day column does a datetime fall into?
  function getDayIndex(dateStr: string): number {
    const d = new Date(dateStr)
    for (let i = 0; i < days.length; i++) {
      const dayStart = days[i].date
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      if (d >= dayStart && d < dayEnd) return i
    }
    if (d < days[0].date) return 0
    return days.length - 1
  }

  // Build bar segments for a row
  function getRowBars(rowTasks: ScheduledTask[]): Array<{
    startIdx: number
    endIdx: number
    stage: string
    color: string
    task: ScheduledTask
  }> {
    return rowTasks.map(task => ({
      startIdx: getDayIndex(task.scheduledStart),
      endIdx: getDayIndex(task.scheduledEnd),
      stage: task.stage,
      color: STAGE_COLORS[task.stage] || "bg-gray-400",
      task,
    }))
  }

  const activeCount = tasks.filter(t => t.status === "IN_PROGRESS").length
  const pendingCount = tasks.filter(t => t.status === "PENDING").length
  const icuCount = tasks.filter(t => t.isICU).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Factory className="h-6 w-6 text-blue-600" />
            Shop Floor Schedule
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Product-level production scheduling across workshop stages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={v => setViewMode(v as "product" | "stage")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product">By Product</SelectItem>
              <SelectItem value="stage">By Stage</SelectItem>
            </SelectContent>
          </Select>
          <Select value={horizonWeeks} onValueChange={setHorizonWeeks}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 week</SelectItem>
              <SelectItem value="2">2 weeks</SelectItem>
              <SelectItem value="4">4 weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-2 h-8 rounded bg-blue-500" />
            <div>
              <div className="text-xs text-gray-500">Active</div>
              <div className="text-lg font-semibold">{activeCount}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-2 h-8 rounded bg-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Pending</div>
              <div className="text-lg font-semibold">{pendingCount}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-2 h-8 rounded bg-red-500" />
            <div>
              <div className="text-xs text-gray-500">ICU / Urgent</div>
              <div className="text-lg font-semibold">{icuCount}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
        {stages.map(s => (
          <div key={s.id} className="flex items-center gap-1">
            <div className={cn("w-3 h-3 rounded", STAGE_COLORS[s.id] || "bg-gray-400")} />
            {s.label}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-500 min-w-[240px] border-r border-border">
                      {viewMode === "product" ? "Product" : "Stage"}
                    </th>
                    {days.map((d, i) => (
                      <th
                        key={i}
                        className={cn(
                          "px-0.5 py-2 text-center font-medium min-w-[56px] border-r border-border/50",
                          d.isToday ? "bg-blue-50 text-blue-600" :
                          d.isWeekend ? "bg-gray-100 text-gray-300" : "text-gray-400"
                        )}
                      >
                        <div className="text-[9px] leading-none">{d.label}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupedRows.map(row => {
                    const bars = getRowBars(row.tasks)

                    return (
                      <tr key={row.id} className="border-b border-border/50 hover:bg-gray-50/50 group">
                        {/* Row label (sticky) */}
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 px-3 py-2 border-r border-border">
                          <div className="flex items-center gap-1.5">
                            {row.isICU && (
                              <Badge className="bg-red-100 text-red-700 text-[8px] px-1 py-0">ICU</Badge>
                            )}
                            <span className="font-medium text-gray-900 truncate text-[11px]">
                              {row.label}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400 truncate mt-0.5">
                            {row.sublabel}
                          </div>
                        </td>

                        {/* Day cells */}
                        {days.map((d, di) => {
                          const cellBars = bars.filter(b => di >= b.startIdx && di <= b.endIdx)
                          const todayIdx = days.findIndex(dd => dd.isToday)

                          return (
                            <td
                              key={di}
                              className={cn(
                                "px-0 py-1 border-r border-border/30 relative",
                                d.isToday && "bg-blue-50/30",
                                d.isWeekend && "bg-gray-50/50"
                              )}
                            >
                              {/* "Now" line */}
                              {d.isToday && di === todayIdx && (
                                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-red-400 z-10" />
                              )}

                              {/* Task bars */}
                              <div className="flex flex-col gap-px min-h-[20px]">
                                {cellBars.map((bar, bi) => {
                                  const isStart = di === bar.startIdx
                                  const isEnd = di === bar.endIdx

                                  return (
                                    <div
                                      key={bi}
                                      className={cn(
                                        "h-4 flex items-center justify-center",
                                        bar.color,
                                        bar.task.status === "IN_PROGRESS" && "ring-1 ring-blue-500",
                                        isStart && "rounded-l ml-0.5",
                                        isEnd && "rounded-r mr-0.5"
                                      )}
                                      title={`${bar.task.stageLabel}: ${bar.task.productName}\n${bar.task.scheduledStart} → ${bar.task.scheduledEnd}\n${bar.task.estimatedMins} min est.${bar.task.assignedTo ? `\nAssigned: ${bar.task.assignedTo}` : ""}`}
                                    >
                                      {isStart && (
                                        <span className="text-[7px] font-bold text-white truncate px-0.5">
                                          {viewMode === "product" ? bar.task.stageLabel.slice(0, 3) : bar.task.projectNumber}
                                        </span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}

                  {groupedRows.length === 0 && (
                    <tr>
                      <td colSpan={days.length + 1} className="text-center py-12 text-gray-400">
                        <Factory className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                        No production tasks scheduled in this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workstation Summary (below Gantt) */}
      {tasks.length > 0 && viewMode === "product" && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Stage Queue Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {stages.map(stage => {
                const stageTasks = tasks.filter(t => t.stage === stage.id)
                const active = stageTasks.filter(t => t.status === "IN_PROGRESS").length
                const pending = stageTasks.filter(t => t.status === "PENDING").length
                const totalMins = stageTasks.reduce((s, t) => s + t.estimatedMins, 0)

                return (
                  <div key={stage.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={cn("w-2 h-2 rounded-full", STAGE_COLORS[stage.id])} />
                      <span className="text-xs font-medium text-gray-700">{stage.label}</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">{stageTasks.length}</div>
                    <div className="text-[10px] text-gray-400 space-y-0.5">
                      <div>{active} active, {pending} queued</div>
                      <div>{Math.round(totalMins / 60)} hrs total</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
