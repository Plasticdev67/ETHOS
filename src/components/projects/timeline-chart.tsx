"use client"

import { useRef } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  getProjectStatusColor,
  prettifyEnum,
  formatDateShort,
  cn,
} from "@/lib/utils"
import type { TimelineProjectData } from "./timeline-view"

const ROW_HEIGHT = 72
const LEFT_PANEL_WIDTH = 260
const DAY_WIDTH = 4 // pixels per day — controls zoom

export function TimelineChart({ projects }: { projects: TimelineProjectData[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

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
  }

  const minTime = Math.min(...allDates)
  const maxTime = Math.max(...allDates)

  // Add padding: 30 days before, 60 days after
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

  const todayPx = Math.round((now.getTime() - timelineStart.getTime()) / 86400000 * DAY_WIDTH)

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      {/* Container: fixed left + scrollable right */}
      <div className="flex" style={{ height: `${Math.min(projects.length * ROW_HEIGHT + 40, 600)}px` }}>
        {/* Fixed left panel */}
        <div
          className="shrink-0 border-r border-border bg-white z-10 overflow-y-auto"
          style={{ width: LEFT_PANEL_WIDTH }}
          onScroll={(e) => {
            // Sync vertical scroll with chart
            if (scrollRef.current) {
              scrollRef.current.scrollTop = e.currentTarget.scrollTop
            }
          }}
        >
          {/* Header */}
          <div className="sticky top-0 z-20 bg-gray-50 border-b border-border px-3 py-2 text-xs font-semibold text-gray-500" style={{ height: 40 }}>
            Project
          </div>
          {/* Rows */}
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex flex-col justify-center px-3 border-b border-border hover:bg-blue-50/50 transition-colors"
              style={{ height: ROW_HEIGHT }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-mono text-gray-400">
                  {project.projectNumber}
                </span>
                <Badge
                  variant="secondary"
                  className={`${getProjectStatusColor(project.projectStatus)} text-[8px] px-1 py-0 leading-tight`}
                >
                  {prettifyEnum(project.projectStatus)}
                </Badge>
              </div>
              <div className="text-sm font-medium text-gray-800 truncate leading-tight">
                {project.name}
              </div>
              <div className="text-[10px] text-gray-400 truncate mt-0.5">
                {project.customer?.name || "No customer"}
                {project.coordinator?.name && ` · ${project.coordinator.name}`}
              </div>
            </Link>
          ))}
        </div>

        {/* Scrollable chart area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          onScroll={() => {
            // Could sync left panel scroll here if needed
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
              <div
                className="absolute top-0 h-full z-20"
                style={{ left: todayPx }}
              >
                <div className="w-px h-full bg-red-500" />
                <span className="absolute top-0.5 -translate-x-1/2 text-[9px] font-bold text-red-600 bg-red-50 px-1 rounded border border-red-200">
                  Today
                </span>
              </div>
            </div>

            {/* Project rows */}
            {projects.map((project) => {
              const orderPx = dateToPx(project.orderReceived)
              const enquiryPx = dateToPx(project.enquiryReceived)
              const targetPx = dateToPx(project.targetCompletion)
              const actualPx = dateToPx(project.actualCompletion)
              const p2Px = dateToPx(project.p2Date)
              const p3Px = dateToPx(project.p3Date)
              const p4Px = dateToPx(project.p4Date)

              // Overall project bar: from order (or enquiry) to target (or actual)
              const overallStart = orderPx ?? enquiryPx ?? 0
              const overallEnd = actualPx ?? targetPx ?? todayPx
              const overallWidth = Math.max(overallEnd - overallStart, 4)

              // Design bar: p2 → p3 (or ongoing if no p3)
              const designStart = p2Px
              const designEnd = p3Px ?? (["DESIGN"].includes(project.projectStatus) ? todayPx : null)

              // Production bar: p3 → p4 (or ongoing if no p4)
              const prodStart = p3Px
              const prodEnd = p4Px ?? (["MANUFACTURE"].includes(project.projectStatus) ? todayPx : null)

              const isOverdue = project.targetCompletion && !project.actualCompletion && new Date(project.targetCompletion) < now

              return (
                <div
                  key={project.id}
                  className="relative border-b border-border"
                  style={{ height: ROW_HEIGHT }}
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

                  {/* Overall project bar (background) */}
                  <div
                    className={cn(
                      "absolute rounded-md border",
                      isOverdue
                        ? "bg-red-50 border-red-300"
                        : "bg-gray-100 border-gray-300"
                    )}
                    style={{
                      left: overallStart,
                      width: overallWidth,
                      top: 8,
                      height: ROW_HEIGHT - 16,
                    }}
                  >
                    <span className="absolute right-1.5 top-0.5 text-[9px] text-gray-400 font-mono whitespace-nowrap">
                      {project.projectNumber}
                    </span>
                    {/* Date labels */}
                    <span className="absolute left-1 bottom-0.5 text-[8px] text-gray-400 whitespace-nowrap">
                      {formatDateShort(project.orderReceived || project.enquiryReceived)}
                    </span>
                    <span className="absolute right-1 bottom-0.5 text-[8px] text-gray-400 whitespace-nowrap">
                      {formatDateShort(project.targetCompletion)}
                    </span>
                  </div>

                  {/* Design phase bar */}
                  {designStart != null && designEnd != null && (
                    <div
                      className="absolute bg-indigo-400 rounded-sm z-[2]"
                      style={{
                        left: designStart,
                        width: Math.max(designEnd - designStart, 4),
                        top: 14,
                        height: 20,
                      }}
                      title={`Design: ${formatDateShort(project.p2Date)} → ${project.p3Date ? formatDateShort(project.p3Date) : "Ongoing"}`}
                    >
                      <span className="px-1.5 text-[10px] font-medium text-white truncate leading-5 block drop-shadow-sm">
                        Design
                      </span>
                    </div>
                  )}

                  {/* Production phase bar */}
                  {prodStart != null && prodEnd != null && (
                    <div
                      className="absolute bg-orange-400 rounded-sm z-[2]"
                      style={{
                        left: prodStart,
                        width: Math.max(prodEnd - prodStart, 4),
                        top: 38,
                        height: 20,
                      }}
                      title={`Production: ${formatDateShort(project.p3Date)} → ${project.p4Date ? formatDateShort(project.p4Date) : "Ongoing"}`}
                    >
                      <span className="px-1.5 text-[10px] font-medium text-white truncate leading-5 block drop-shadow-sm">
                        Production
                      </span>
                    </div>
                  )}

                  {/* Overdue indicator */}
                  {isOverdue && targetPx != null && (
                    <div
                      className="absolute top-2 bottom-2 w-0.5 bg-red-500 z-[3] rounded-full"
                      style={{ left: targetPx }}
                      title="Target completion date (overdue)"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
