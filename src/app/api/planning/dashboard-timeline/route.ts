import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { format, startOfWeek, addWeeks, addDays } from "date-fns"

// Phase split ratios by project status (what % of timeline is each phase)
// e.g. DESIGN project: design is 40% of time, production 45%, install 15%
const PHASE_RATIOS: Record<string, { design: number; production: number; installation: number }> = {
  QUOTATION:     { design: 0.40, production: 0.45, installation: 0.15 },
  DESIGN:        { design: 0.35, production: 0.45, installation: 0.20 },
  DESIGN_FREEZE: { design: 0.30, production: 0.50, installation: 0.20 },
  REVIEW:        { design: 0.25, production: 0.50, installation: 0.25 },
  MANUFACTURE:   { design: 0.00, production: 0.60, installation: 0.40 },
  INSTALLATION:  { design: 0.00, production: 0.00, installation: 1.00 },
}

// How far through each phase a project is by status
const STATUS_PROGRESS: Record<string, { design: number; production: number; installation: number }> = {
  QUOTATION:     { design: 0,   production: 0,   installation: 0 },
  DESIGN:        { design: 30,  production: 0,   installation: 0 },
  DESIGN_FREEZE: { design: 90,  production: 0,   installation: 0 },
  REVIEW:        { design: 100, production: 10,  installation: 0 },
  MANUFACTURE:   { design: 100, production: 50,  installation: 0 },
  INSTALLATION:  { design: 100, production: 100, installation: 30 },
}

export async function GET() {
  const projects = await prisma.project.findMany({
    where: {
      projectStatus: { notIn: ["COMPLETE", "OPPORTUNITY"] },
    },
    include: {
      customer: { select: { name: true } },
      resourceEstimates: true,
      products: {
        select: {
          id: true,
          designPlannedStart: true,
          designTargetDate: true,
          designCompletionDate: true,
          productionPlannedStart: true,
          productionTargetDate: true,
          productionCompletionDate: true,
          installPlannedStart: true,
          installTargetDate: true,
          installCompletionDate: true,
        },
      },
      _count: { select: { products: true } },
    },
    orderBy: [
      { isICUFlag: "desc" },
      { targetCompletion: "asc" },
    ],
  })

  const now = new Date()

  const timelineProjects = projects.map(project => {
    const products = project.products
    const estimates = project.resourceEstimates

    // Try to get phase dates from products first
    const designStarts = products.map(p => p.designPlannedStart).filter(Boolean) as Date[]
    const designEnds = products.map(p => p.designTargetDate).filter(Boolean) as Date[]
    const prodStarts = products.map(p => p.productionPlannedStart).filter(Boolean) as Date[]
    const prodEnds = products.map(p => p.productionTargetDate).filter(Boolean) as Date[]
    const installStarts = products.map(p => p.installPlannedStart).filter(Boolean) as Date[]
    const installEnds = products.map(p => p.installTargetDate).filter(Boolean) as Date[]

    // Progress
    const designDone = products.filter(p => p.designCompletionDate).length
    const prodDone = products.filter(p => p.productionCompletionDate).length
    const installDone = products.filter(p => p.installCompletionDate).length
    const total = products.length || 1

    const designEst = estimates.find(e => e.department === "DESIGN")
    const prodEst = estimates.find(e => e.department === "PRODUCTION")
    const installEst = estimates.find(e => e.department === "INSTALLATION")

    type PhaseInfo = { start: string; end: string; progress: number; hours: number } | null

    function buildPhaseFromDates(
      starts: Date[], ends: Date[],
      est: typeof designEst,
      done: number
    ): PhaseInfo {
      if (starts.length > 0 && ends.length > 0) {
        return {
          start: format(new Date(Math.min(...starts.map(d => d.getTime()))), "yyyy-MM-dd"),
          end: format(new Date(Math.max(...ends.map(d => d.getTime()))), "yyyy-MM-dd"),
          progress: Math.round((done / total) * 100),
          hours: est ? Number(est.estimatedHours) : 0,
        }
      }
      if (est?.plannedStart && est?.plannedEnd) {
        return {
          start: format(est.plannedStart, "yyyy-MM-dd"),
          end: format(est.plannedEnd, "yyyy-MM-dd"),
          progress: Math.round((done / total) * 100),
          hours: Number(est.estimatedHours),
        }
      }
      return null
    }

    let design = buildPhaseFromDates(designStarts, designEnds, designEst, designDone)
    let production = buildPhaseFromDates(prodStarts, prodEnds, prodEst, prodDone)
    let installation = buildPhaseFromDates(installStarts, installEnds, installEst, installDone)

    // If no explicit dates anywhere, auto-estimate from project status + targetCompletion
    const hasAnyDates = design || production || installation
    if (!hasAnyDates && project.targetCompletion) {
      const deadline = new Date(project.targetCompletion)
      const status = project.projectStatus
      const ratios = PHASE_RATIOS[status] || PHASE_RATIOS.DESIGN
      const progress = STATUS_PROGRESS[status] || STATUS_PROGRESS.DESIGN

      // Calculate total project duration: from createdAt (or now) to targetCompletion
      const projectStart = new Date(project.createdAt)
      const totalMs = deadline.getTime() - projectStart.getTime()
      const totalDays = Math.max(14, totalMs / (1000 * 60 * 60 * 24)) // At least 2 weeks

      // Split timeline into phases
      let cursor = projectStart

      if (ratios.design > 0) {
        const designDays = Math.round(totalDays * ratios.design)
        const designEnd = addDays(cursor, designDays)
        design = {
          start: format(cursor, "yyyy-MM-dd"),
          end: format(designEnd, "yyyy-MM-dd"),
          progress: progress.design,
          hours: 0,
        }
        cursor = designEnd
      }

      if (ratios.production > 0) {
        const prodDays = Math.round(totalDays * ratios.production)
        const prodEnd = addDays(cursor, prodDays)
        production = {
          start: format(cursor, "yyyy-MM-dd"),
          end: format(prodEnd, "yyyy-MM-dd"),
          progress: progress.production,
          hours: 0,
        }
        cursor = prodEnd
      }

      if (ratios.installation > 0) {
        const installDays = Math.round(totalDays * ratios.installation)
        const installEnd = addDays(cursor, installDays)
        installation = {
          start: format(cursor, "yyyy-MM-dd"),
          end: format(installEnd, "yyyy-MM-dd"),
          progress: progress.installation,
          hours: 0,
        }
      }
    }

    return {
      id: project.id,
      projectNumber: project.projectNumber,
      name: project.name,
      customerName: project.customer?.name || "—",
      priority: project.priority,
      isICU: project.isICUFlag,
      status: project.projectStatus,
      deadline: project.targetCompletion ? format(project.targetCompletion, "yyyy-MM-dd") : null,
      productCount: project._count.products,
      estimated: !hasAnyDates, // Flag to show this is auto-estimated
      design,
      production,
      installation,
    }
  })

  const withDates = timelineProjects.filter(p => p.design || p.production || p.installation)
  const withoutDates = timelineProjects.filter(p => !p.design && !p.production && !p.installation)

  // Calculate how far back we need to go based on project phase dates
  const allDates = withDates.flatMap(p => {
    const dates: string[] = []
    if (p.design) dates.push(p.design.start)
    if (p.production) dates.push(p.production.start)
    if (p.installation) dates.push(p.installation.start)
    return dates
  }).filter(Boolean)

  const today = startOfWeek(new Date(), { weekStartsOn: 1 })
  const horizonWeeks = 16
  let pastDays = 7 // default 1 week back

  if (allDates.length > 0) {
    const earliest = new Date(Math.min(...allDates.map(d => new Date(d).getTime())))
    const daysBack = Math.ceil((today.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24))
    pastDays = Math.max(7, Math.min(daysBack + 7, 365)) // cap at 1 year back
  }

  const days: Array<{ date: string; label: string; isWeekStart: boolean; isToday: boolean; isWeekend: boolean; monthLabel: string | null }> = []

  const nowStr = format(now, "yyyy-MM-dd")
  let lastMonth = ""

  for (let i = -pastDays; i < horizonWeeks * 7; i++) {
    const d = addDays(today, i)
    const dateStr = format(d, "yyyy-MM-dd")
    const dayOfWeek = d.getDay()
    const monthStr = format(d, "MMM yyyy")

    days.push({
      date: dateStr,
      label: format(d, "d"),
      isWeekStart: dayOfWeek === 1,
      isToday: dateStr === nowStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      monthLabel: monthStr !== lastMonth ? monthStr : null,
    })
    lastMonth = monthStr
  }

  const weeks: Array<{ date: string; label: string; weekNumber: string }> = []
  for (let i = -Math.ceil(pastDays / 7); i < horizonWeeks; i++) {
    const ws = addWeeks(today, i)
    weeks.push({
      date: format(ws, "yyyy-MM-dd"),
      label: format(ws, "dd MMM"),
      weekNumber: format(ws, "'W'ww"),
    })
  }

  return NextResponse.json({
    projects: withDates,
    unscheduled: withoutDates.map(p => ({
      id: p.id,
      projectNumber: p.projectNumber,
      name: p.name,
    })),
    days,
    weeks,
    today: nowStr,
  })
}
