"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CalendarRange, Loader2, AlertTriangle, ChevronRight } from "lucide-react"
import Link from "next/link"

type PhaseInfo = { start: string; end: string; progress: number; hours: number } | null

type TimelineProject = {
  id: string
  projectNumber: string
  name: string
  customerName: string
  priority: string
  isICU: boolean
  status: string
  deadline: string | null
  productCount: number
  estimated: boolean
  design: PhaseInfo
  production: PhaseInfo
  installation: PhaseInfo
}

type DayCol = {
  date: string
  label: string
  isWeekStart: boolean
  isToday: boolean
  isWeekend: boolean
  monthLabel: string | null
}

type TimelineData = {
  projects: TimelineProject[]
  unscheduled: { id: string; projectNumber: string; name: string }[]
  days: DayCol[]
  weeks: { date: string; label: string; weekNumber: string }[]
  today: string
}

const DAY_WIDTH = 28 // px per day column

export function DashboardTimeline() {
  const [data, setData] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/planning/dashboard-timeline")
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Scroll to "today" on load
  useEffect(() => {
    if (!data || !scrollRef.current) return
    const todayIdx = data.days.findIndex(d => d.isToday)
    if (todayIdx > 0) {
      // Scroll so today is roughly 200px from the left
      scrollRef.current.scrollLeft = Math.max(0, todayIdx * DAY_WIDTH - 200)
    }
  }, [data])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.projects.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-blue-600" />
              Project Timeline
            </CardTitle>
            <Link href="/planning/aggregated" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Full Schedule <ChevronRight className="ml-0.5 inline h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 text-center py-4">No projects with scheduled dates</p>
        </CardContent>
      </Card>
    )
  }

  const { days, projects, unscheduled } = data
  const totalWidth = days.length * DAY_WIDTH

  // Build month header spans
  const monthSpans: { label: string; startIdx: number; span: number }[] = []
  for (let i = 0; i < days.length; i++) {
    if (days[i].monthLabel) {
      if (monthSpans.length > 0) {
        monthSpans[monthSpans.length - 1].span = i - monthSpans[monthSpans.length - 1].startIdx
      }
      monthSpans.push({ label: days[i].monthLabel!, startIdx: i, span: 0 })
    }
  }
  if (monthSpans.length > 0) {
    monthSpans[monthSpans.length - 1].span = days.length - monthSpans[monthSpans.length - 1].startIdx
  }

  function getDayIndex(dateStr: string): number {
    const idx = days.findIndex(d => d.date === dateStr)
    if (idx >= 0) return idx
    // If exact date not found, find closest
    const target = new Date(dateStr).getTime()
    for (let i = 0; i < days.length; i++) {
      if (new Date(days[i].date).getTime() >= target) return i
    }
    return days.length - 1
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-blue-600" />
            Project Timeline
          </CardTitle>
          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-blue-400" />
                Design
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                Production
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-green-400" />
                Installation
              </div>
            </div>
            <Link href="/planning/aggregated" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Full Schedule <ChevronRight className="ml-0.5 inline h-3 w-3" />
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto" ref={scrollRef}>
          <div style={{ minWidth: `${280 + totalWidth}px` }}>
            {/* Month header */}
            <div className="flex border-b border-border">
              <div className="w-[280px] min-w-[280px] shrink-0" />
              <div className="flex">
                {monthSpans.map((m, i) => (
                  <div
                    key={i}
                    className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1 py-1 border-l border-border/50"
                    style={{ width: `${m.span * DAY_WIDTH}px` }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Day header */}
            <div className="flex border-b border-border bg-gray-50/50">
              <div className="w-[280px] min-w-[280px] shrink-0 px-3 py-1 text-[10px] font-medium text-gray-400 uppercase">
                Project
              </div>
              <div className="flex">
                {days.map((day, i) => (
                  <div
                    key={i}
                    className={cn(
                      "text-center text-[9px] py-1 border-l border-border/20",
                      day.isToday && "bg-blue-100 font-bold text-blue-700",
                      day.isWeekend && !day.isToday && "bg-gray-50 text-gray-300",
                      day.isWeekStart && !day.isToday && "border-l-border/60 text-gray-500",
                      !day.isWeekStart && !day.isToday && !day.isWeekend && "text-gray-400"
                    )}
                    style={{ width: `${DAY_WIDTH}px`, minWidth: `${DAY_WIDTH}px` }}
                  >
                    {day.isWeekStart || day.isToday ? day.label : ""}
                  </div>
                ))}
              </div>
            </div>

            {/* Project rows */}
            {projects.map(project => (
              <div key={project.id} className="flex border-b border-border/40 hover:bg-gray-50/50 group">
                {/* Project label (sticky-ish via min-width) */}
                <div className="w-[280px] min-w-[280px] shrink-0 px-3 py-2 border-r border-border">
                  <Link href={`/projects/${project.id}/edit`} className="block">
                    <div className="flex items-center gap-1.5">
                      {project.isICU && (
                        <Badge className="bg-red-100 text-red-700 text-[8px] px-1 py-0">ICU</Badge>
                      )}
                      {project.estimated && (
                        <Badge className="bg-gray-100 text-gray-500 text-[8px] px-1 py-0">Est.</Badge>
                      )}
                      <span className="font-mono text-xs font-medium text-gray-800 truncate">
                        {project.projectNumber}
                      </span>
                      <span className="text-[10px] text-gray-500 truncate flex-1">
                        {project.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">
                      {project.customerName}
                    </div>
                  </Link>
                </div>

                {/* Timeline bars */}
                <div className="relative flex-1" style={{ height: "48px" }}>
                  {/* Weekend shading strips */}
                  {days.map((day, i) => (
                    day.isWeekend ? (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 bg-gray-50/70"
                        style={{ left: `${i * DAY_WIDTH}px`, width: `${DAY_WIDTH}px` }}
                      />
                    ) : null
                  ))}

                  {/* Today line */}
                  {(() => {
                    const todayIdx = days.findIndex(d => d.isToday)
                    if (todayIdx < 0) return null
                    return (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-20"
                        style={{ left: `${todayIdx * DAY_WIDTH + DAY_WIDTH / 2}px` }}
                      />
                    )
                  })()}

                  {/* Deadline marker */}
                  {project.deadline && (() => {
                    const dlIdx = getDayIndex(project.deadline!)
                    return (
                      <div
                        className="absolute top-0 bottom-0 z-10"
                        style={{ left: `${dlIdx * DAY_WIDTH + DAY_WIDTH / 2 - 1}px` }}
                      >
                        <div className="w-0.5 h-full border-l-2 border-dashed border-red-300" />
                      </div>
                    )
                  })()}

                  {/* Phase bars */}
                  {renderPhaseBar(project.design, "bg-blue-400", "Design", days, getDayIndex, 4)}
                  {renderPhaseBar(project.production, "bg-amber-400", "Production", days, getDayIndex, 18)}
                  {renderPhaseBar(project.installation, "bg-green-400", "Installation", days, getDayIndex, 32)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unscheduled projects notice */}
        {unscheduled.length > 0 && (
          <div className="px-3 py-2 bg-amber-50/50 border-t border-amber-200/50">
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              <span className="font-medium">{unscheduled.length} project(s) without scheduled dates</span>
              <span className="text-amber-400 ml-1">
                {unscheduled.slice(0, 5).map(p => p.projectNumber).join(", ")}
                {unscheduled.length > 5 && ` +${unscheduled.length - 5} more`}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function renderPhaseBar(
  phase: PhaseInfo,
  colorClass: string,
  label: string,
  days: DayCol[],
  getDayIndex: (date: string) => number,
  topPx: number
) {
  if (!phase) return null

  const startIdx = getDayIndex(phase.start)
  const endIdx = getDayIndex(phase.end)
  const barLeft = startIdx * DAY_WIDTH
  const barWidth = Math.max((endIdx - startIdx + 1) * DAY_WIDTH, 6)

  return (
    <div
      className={cn(
        "absolute rounded-sm flex items-center overflow-hidden group/bar cursor-default",
        colorClass
      )}
      style={{
        left: `${barLeft}px`,
        width: `${barWidth}px`,
        top: `${topPx}px`,
        height: "12px",
      }}
      title={`${label}: ${phase.start} → ${phase.end} (${phase.progress}% done${phase.hours ? `, ${phase.hours}h est.` : ""})`}
    >
      {/* Progress fill (darker overlay) */}
      {phase.progress > 0 && phase.progress < 100 && (
        <div
          className="absolute inset-y-0 left-0 bg-black/15 rounded-l-sm"
          style={{ width: `${phase.progress}%` }}
        />
      )}
      {/* Label (only if bar is wide enough) */}
      {barWidth > 50 && (
        <span className="text-[8px] font-medium text-white px-1 truncate relative z-10">
          {label}
          {phase.progress > 0 && ` ${phase.progress}%`}
        </span>
      )}
    </div>
  )
}
