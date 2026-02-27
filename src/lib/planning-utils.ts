import { startOfWeek, addWeeks, addDays, format, isSameDay } from "date-fns"

// ═══════════════════ Types ═══════════════════

export type AtpPhase = {
  name: string
  department: string
  queueWeeks: number
  workWeeks: number
  totalWeeks: number
  startDate: string // ISO date
  endDate: string   // ISO date
  bottleneck: boolean
  notes?: string
}

export type AtpResult = {
  earliestDeliveryDate: string
  totalWeeks: number
  phases: AtpPhase[]
  confidence: number // 0-100
  warnings: string[]
  bufferWeeks: number
  requestedDateFeasible?: boolean
  requestedDateGap?: number // weeks short/ahead
}

export type AtpOrderLine = {
  description: string
  quantity: number
  estimatedHours?: number
}

export type GanttProject = {
  id: string
  projectNumber: string
  name: string
  customerName: string
  deadline: string | null
  priority: string
  isICU: boolean
  classification: string
  status: string
  phases: {
    design?: { start: string; end: string; progress: number }
    production?: { start: string; end: string; progress: number }
    installation?: { start: string; end: string; progress: number }
  }
  totalHours: number
  isAtRisk: boolean
}

export type ShopFloorTask = {
  taskId: string
  productId: string
  productName: string
  projectNumber: string
  projectName: string
  stage: string
  status: string
  estimatedMins: number
  actualMins: number | null
  queuePosition: number
  assignedTo: string | null
  scheduledStart: string
  scheduledEnd: string
  isICU: boolean
  priority: string
}

// ═══════════════════ Week/Day Helpers ═══════════════════

export function getMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export function generateWeekColumns(startDate: Date, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const weekStart = addWeeks(startDate, i)
    return {
      date: weekStart,
      label: format(weekStart, "dd MMM"),
      weekNumber: format(weekStart, "'W'ww"),
      isCurrentWeek: isSameDay(getMonday(new Date()), weekStart),
    }
  })
}

export function generateDayColumns(startDate: Date, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const day = addDays(startDate, i)
    return {
      date: day,
      label: format(day, "EEE dd"),
      isWeekend: day.getDay() === 0 || day.getDay() === 6,
      isToday: isSameDay(day, new Date()),
    }
  })
}

// ═══════════════════ Department Colors ═══════════════════

export const DEPT_COLORS: Record<string, { bg: string; bar: string; barLight: string; text: string }> = {
  DESIGN:       { bg: "bg-blue-50",   bar: "bg-blue-500",   barLight: "bg-blue-200", text: "text-blue-700" },
  OPS:          { bg: "bg-purple-50", bar: "bg-purple-500", barLight: "bg-purple-200", text: "text-purple-700" },
  PROCUREMENT:  { bg: "bg-pink-50",   bar: "bg-pink-500",   barLight: "bg-pink-200", text: "text-pink-700" },
  PRODUCTION:   { bg: "bg-amber-50",  bar: "bg-amber-500",  barLight: "bg-amber-200", text: "text-amber-700" },
  INSTALLATION: { bg: "bg-green-50",  bar: "bg-green-500",  barLight: "bg-green-200", text: "text-green-700" },
  BUFFER:       { bg: "bg-gray-50",   bar: "bg-gray-400",   barLight: "bg-gray-200", text: "text-gray-600" },
}

// ═══════════════════ Confidence Calculation ═══════════════════

export function calculateConfidence(phases: AtpPhase[]): number {
  let confidence = 90
  const bottlenecks = phases.filter(p => p.bottleneck).length
  confidence -= bottlenecks * 5
  const longQueues = phases.filter(p => p.queueWeeks > 2).length
  confidence -= longQueues * 3
  return Math.max(30, Math.min(100, confidence))
}

// ═══════════════════ Utilization Color ═══════════════════

export function getUtilColor(pct: number): string {
  if (pct >= 95) return "bg-red-500 text-white"
  if (pct >= 80) return "bg-orange-400 text-white"
  if (pct >= 60) return "bg-yellow-300 text-yellow-900"
  return "bg-green-200 text-green-900"
}

export function getUtilBgColor(pct: number): string {
  if (pct >= 95) return "bg-red-100"
  if (pct >= 80) return "bg-orange-100"
  if (pct >= 60) return "bg-yellow-100"
  return "bg-green-50"
}
