"use client"

import { useRef } from "react"
import Link from "next/link"
import {
  formatDateShort,
  cn,
} from "@/lib/utils"
import type { TimelineProjectData } from "./timeline-view"

const LANE_HEIGHT = 48
const DEPT_HEADER_HEIGHT = 32
const LEFT_PANEL_WIDTH = 200
const DAY_WIDTH = 4
const LANES_PER_DEPT = 3

type DeptDef = {
  id: string
  label: string
  color: string
  barClass: string
  getStart: (p: TimelineProjectData) => string | null
  getEnd: (p: TimelineProjectData) => string | null
  ongoingStatuses: string[]
}

const DEPARTMENTS: DeptDef[] = [
  {
    id: "design",
    label: "Design",
    color: "bg-indigo-400",
    barClass: "bg-indigo-400 border-indigo-500",
    getStart: (p) => p.p2Date,
    getEnd: (p) => p.p3Date,
    ongoingStatuses: ["DESIGN"],
  },
  {
    id: "production",
    label: "Production",
    color: "bg-orange-400",
    barClass: "bg-orange-400 border-orange-500",
    getStart: (p) => p.p3Date,
    getEnd: (p) => p.p4Date,
    ongoingStatuses: ["MANUFACTURE"],
  },
  {
    id: "installation",
    label: "Installation",
    color: "bg-emerald-400",
    barClass: "bg-emerald-400 border-emerald-500",
    getStart: (p) => p.p4Date,
    getEnd: (p) => p.p5Date ?? p.targetCompletion,
    ongoingStatuses: ["INSTALLATION"],
  },
]

type LaneAssignment = {
  project: TimelineProjectData
  startPx: number
  endPx: number
  startDate: string
  endDate: string | null
  ongoing: boolean
}

export function DepartmentalChart({ projects }: { projects: TimelineProjectData[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)

  const now = new Date()

  // Gather all dates to compute range
  const allDates: number[] = [now.getTime()]
  for (const p of projects) {
    if (p.enquiryReceived) allDates.push(new Date(p.enquiryReceived).getTime())
    if (p.orderReceived) allDates.push(new Date(p.orderReceived).getTime())
    if (p.targetCompletion) allDates.push(new Date(p.targetCompletion).getTime())
    if (p.actualCompletion) allDates.push(new Date(p.actualCompletion).getTime())
    if (p.p2Date) allDates.push(new Date(p.p2Date).getTime())
    if (p.p3Date) allDates.push(new Date(p.p3Date).getTime())
    if (p.p4Date) allDates.push(new Date(p.p4Date).getTime())
    if (p.p5Date) allDates.push(new Date(p.p5Date).getTime())
  }

  const minTime = Math.min(...allDates)
  const maxTime = Math.max(...allDates)

  const timelineStart = new Date(minTime - 30 * 86400000)
  const timelineEnd = new Date(maxTime + 60 * 86400000)
  const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / 86400000)
  const chartWidth = totalDays * DAY_WIDTH

  function dateToPx(dateStr: string | null): number | null {
    if (!dateStr) return null
    const d = new Date(dateStr)
    const days = (d.getTime() - timelineStart.getTime()) / 86400000
    return Math.round(days * DAY_WIDTH)
  }

  const todayPx = Math.round((now.getTime() - timelineStart.getTime()) / 86400000 * DAY_WIDTH)

  // Month markers
  const months: { label: string; px: number }[] = []
  const cursor = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1)
  while (cursor <= timelineEnd) {
    const days = (cursor.getTime() - timelineStart.getTime()) / 86400000
    months.push({
      label: cursor.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      px: Math.round(days * DAY_WIDTH),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  // Assign projects to lanes for each department
  const deptLanes: Map<string, LaneAssignment[][]> = new Map()

  for (const dept of DEPARTMENTS) {
    const lanes: LaneAssignment[][] = Array.from({ length: LANES_PER_DEPT }, () => [])

    // Get projects that have dates for this department
    const deptProjects: {
      project: TimelineProjectData
      startDate: string
      endDate: string | null
      ongoing: boolean
      startTime: number
      endTime: number
    }[] = []

    for (const p of projects) {
      const startDate = dept.getStart(p)
      if (!startDate) continue

      const endDate = dept.getEnd(p)
      const ongoing = !endDate && dept.ongoingStatuses.includes(p.projectStatus)

      if (!endDate && !ongoing) continue

      const startTime = new Date(startDate).getTime()
      const endTime = endDate ? new Date(endDate).getTime() : now.getTime()

      deptProjects.push({ project: p, startDate, endDate, ongoing, startTime, endTime })
    }

    // Sort by start date
    deptProjects.sort((a, b) => a.startTime - b.startTime)

    // Greedy lane assignment
    for (const item of deptProjects) {
      let assigned = false
      for (let laneIdx = 0; laneIdx < LANES_PER_DEPT; laneIdx++) {
        const lane = lanes[laneIdx]
        // Check if this project overlaps with any existing in this lane
        const overlaps = lane.some(
          (existing) => item.startTime < (existing.endDate ? new Date(existing.endDate).getTime() : now.getTime()) &&
            item.endTime > new Date(existing.startDate).getTime()
        )
        if (!overlaps) {
          const startPx = dateToPx(item.startDate) ?? 0
          const endPx = item.endDate ? (dateToPx(item.endDate) ?? todayPx) : todayPx
          lane.push({
            project: item.project,
            startPx,
            endPx,
            startDate: item.startDate,
            endDate: item.endDate,
            ongoing: item.ongoing,
          })
          assigned = true
          break
        }
      }
      // If not assigned (all lanes full), skip — overflow
      if (!assigned) {
        // Could add overflow handling here
      }
    }

    deptLanes.set(dept.id, lanes)
  }

  // Calculate total height
  const totalRows = DEPARTMENTS.length * LANES_PER_DEPT
  const totalSectionHeaders = DEPARTMENTS.length
  const contentHeight = totalRows * LANE_HEIGHT + totalSectionHeaders * DEPT_HEADER_HEIGHT + 40

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <div className="flex" style={{ height: `${Math.min(contentHeight, 600)}px` }}>
        {/* Fixed left panel */}
        <div
          ref={leftRef}
          className="shrink-0 border-r border-border bg-white z-10 overflow-y-auto"
          style={{ width: LEFT_PANEL_WIDTH }}
          onScroll={(e) => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = e.currentTarget.scrollTop
            }
          }}
        >
          {/* Header */}
          <div
            className="sticky top-0 z-20 bg-gray-50 border-b border-border px-3 py-2 text-xs font-semibold text-gray-500"
            style={{ height: 40 }}
          >
            Department / Lane
          </div>

          {/* Department sections */}
          {DEPARTMENTS.map((dept) => (
            <div key={dept.id}>
              {/* Department header */}
              <div
                className="flex items-center gap-2 px-3 bg-gray-50 border-b border-border"
                style={{ height: DEPT_HEADER_HEIGHT }}
              >
                <span className={cn("w-3 h-3 rounded-sm", dept.color)} />
                <span className="text-xs font-semibold text-gray-700">{dept.label}</span>
                <span className="text-[10px] text-gray-400 ml-auto">
                  {(deptLanes.get(dept.id) ?? []).reduce((sum, lane) => sum + lane.length, 0)} projects
                </span>
              </div>
              {/* Lanes */}
              {Array.from({ length: LANES_PER_DEPT }, (_, i) => (
                <div
                  key={i}
                  className="flex items-center px-3 border-b border-border text-xs text-gray-400"
                  style={{ height: LANE_HEIGHT }}
                >
                  Slot {i + 1}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Scrollable chart area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          onScroll={(e) => {
            if (leftRef.current) {
              leftRef.current.scrollTop = e.currentTarget.scrollTop
            }
          }}
        >
          <div style={{ width: chartWidth, minHeight: "100%" }} className="relative">
            {/* Month header row */}
            <div className="sticky top-0 z-10 bg-gray-50 border-b border-border" style={{ height: 40 }}>
              {months.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-l border-gray-200 flex items-center"
                  style={{ left: m.px }}
                >
                  <span className="text-[10px] text-gray-400 font-medium pl-1.5 whitespace-nowrap">
                    {m.label}
                  </span>
                </div>
              ))}
              {/* Today marker in header */}
              <div className="absolute top-0 h-full z-20" style={{ left: todayPx }}>
                <div className="w-px h-full bg-red-500" />
                <span className="absolute top-0.5 -translate-x-1/2 text-[9px] font-bold text-red-600 bg-red-50 px-1 rounded border border-red-200">
                  Today
                </span>
              </div>
            </div>

            {/* Department sections */}
            {DEPARTMENTS.map((dept) => {
              const lanes = deptLanes.get(dept.id) ?? []
              return (
                <div key={dept.id}>
                  {/* Department header row */}
                  <div
                    className="relative bg-gray-50 border-b border-border"
                    style={{ height: DEPT_HEADER_HEIGHT }}
                  >
                    {/* Month grid lines */}
                    {months.map((m, i) => (
                      <div
                        key={i}
                        className="absolute top-0 h-full border-l border-gray-100"
                        style={{ left: m.px }}
                      />
                    ))}
                    {/* Today line */}
                    <div
                      className="absolute top-0 h-full w-px bg-red-300 z-[1]"
                      style={{ left: todayPx }}
                    />
                  </div>

                  {/* Lane rows */}
                  {Array.from({ length: LANES_PER_DEPT }, (_, laneIdx) => {
                    const laneData = lanes[laneIdx] ?? []
                    return (
                      <div
                        key={laneIdx}
                        className="relative border-b border-border"
                        style={{ height: LANE_HEIGHT }}
                      >
                        {/* Month grid lines */}
                        {months.map((m, i) => (
                          <div
                            key={i}
                            className="absolute top-0 h-full border-l border-gray-50"
                            style={{ left: m.px }}
                          />
                        ))}

                        {/* Today line */}
                        <div
                          className="absolute top-0 h-full w-px bg-red-200 z-[1]"
                          style={{ left: todayPx }}
                        />

                        {/* Project bars in this lane */}
                        {laneData.map((assignment) => {
                          const barWidth = Math.max(assignment.endPx - assignment.startPx, 4)
                          return (
                            <Link
                              key={assignment.project.id}
                              href={`/projects/${assignment.project.id}`}
                              className={cn(
                                "absolute rounded-md border z-[2] flex items-center overflow-hidden cursor-pointer hover:brightness-110 transition-all",
                                dept.barClass
                              )}
                              style={{
                                left: assignment.startPx,
                                width: barWidth,
                                top: 6,
                                height: LANE_HEIGHT - 12,
                              }}
                              title={`${assignment.project.projectNumber} - ${assignment.project.name}\n${dept.label}: ${formatDateShort(assignment.startDate)} → ${assignment.endDate ? formatDateShort(assignment.endDate) : "Ongoing"}`}
                            >
                              <div className="flex items-center gap-1.5 px-2 min-w-0">
                                <span className="text-[10px] font-bold text-white whitespace-nowrap drop-shadow-sm">
                                  {assignment.project.projectNumber}
                                </span>
                                {barWidth > 100 && (
                                  <span className="text-[10px] text-white/80 truncate drop-shadow-sm">
                                    {assignment.project.name}
                                  </span>
                                )}
                              </div>
                              {barWidth > 60 && (
                                <span className="absolute right-1.5 text-[8px] text-white/70 whitespace-nowrap">
                                  {formatDateShort(assignment.startDate)} → {assignment.endDate ? formatDateShort(assignment.endDate) : "Now"}
                                </span>
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
