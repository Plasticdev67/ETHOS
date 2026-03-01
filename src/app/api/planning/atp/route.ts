import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { addWeeks, format } from "date-fns"
import { requireAuth, requirePermission } from "@/lib/api-auth"

const WORKSHOP_STAGES = [
  "CUTTING",
  "FABRICATION",
  "FITTING",
  "SHOTBLASTING",
  "PAINTING",
  "PACKING",
] as const

const STAGE_LABELS: Record<string, string> = {
  CUTTING: "Cutting",
  FABRICATION: "Weld/Fab",
  FITTING: "Pre-Fit",
  SHOTBLASTING: "Shotblast",
  PAINTING: "Painting",
  PACKING: "Packing",
}

type OrderLine = {
  description: string
  quantity: number
  estimatedHours?: number
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("production:manage")
  if (denied) return denied

  const body = await request.json()
  const lines: OrderLine[] = body.lines || []
  const requestedDate = body.requestedDate ? new Date(body.requestedDate) : null

  if (!lines.length) {
    return NextResponse.json({ error: "At least one product line is required" }, { status: 400 })
  }

  // ── 1. Fetch department capacities ──
  try {
    const capacities = await prisma.departmentCapacity.findMany()
    const capMap: Record<string, number> = {}
    for (const c of capacities) {
      capMap[c.department] = Number(c.hoursPerWeek)
    }
    const designCap = capMap["DESIGN"] || 120
    const productionCap = capMap["PRODUCTION"] || 200
    const installCap = capMap["INSTALLATION"] || 160
    const productionCapPerStage = productionCap / WORKSHOP_STAGES.length

    // ── 2. Design queue depth ──
    const designQueue = await prisma.productDesignCard.count({
      where: { status: { in: ["QUEUED", "IN_PROGRESS"] } },
    })

    const designAvg = await prisma.productDesignCard.aggregate({
      _avg: { estimatedHours: true },
      where: { status: { in: ["QUEUED", "IN_PROGRESS"] } },
    })
    const avgDesignHoursPerCard = Number(designAvg._avg.estimatedHours || 12)

    // ── 3. Production queue per stage ──
    const prodQueues = await prisma.productionTask.groupBy({
      by: ["stage"],
      _sum: { estimatedMins: true },
      where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
    })
    const stageBacklog: Record<string, number> = {} // minutes
    for (const q of prodQueues) {
      stageBacklog[q.stage] = Number(q._sum.estimatedMins || 0)
    }

    // ── 4. Installation backlog ──
    const installQueue = await prisma.product.count({
      where: {
        currentDepartment: "INSTALLATION",
        installCompletionDate: null,
      },
    })

    // ── 5. Calculate total hours for this order ──
    const totalProductionHours = lines.reduce(
      (s, l) => s + (l.estimatedHours || 8) * l.quantity,
      0
    )
    const totalDesignHours = lines.reduce(
      (s, l) => s + Math.max(4, (l.estimatedHours || 8) * 0.3) * l.quantity,
      0
    ) // design ~30% of production hours, min 4h per product
    const totalInstallHours = lines.reduce(
      (s, l) => s + Math.max(2, (l.estimatedHours || 8) * 0.15) * l.quantity,
      0
    ) // install ~15% of production hours, min 2h per product

    // ── 6. Build phase timeline ──
    const phases: Array<{
      name: string
      department: string
      queueWeeks: number
      workWeeks: number
      totalWeeks: number
      startDate: Date
      endDate: Date
      bottleneck: boolean
      notes?: string
    }> = []

    const warnings: string[] = []
    let cursor = new Date() // "now" — the starting point

    // — DESIGN PHASE —
    const designQueueWait = (designQueue * avgDesignHoursPerCard) / designCap
    const designWork = totalDesignHours / designCap
    const designTotal = designQueueWait + designWork

    if (designQueueWait > 2) {
      warnings.push(`Design: ${designQueue} cards ahead — ${designQueueWait.toFixed(1)} week wait`)
    }

    phases.push({
      name: "Design",
      department: "DESIGN",
      queueWeeks: Math.round(designQueueWait * 10) / 10,
      workWeeks: Math.round(designWork * 10) / 10,
      totalWeeks: Math.round(designTotal * 10) / 10,
      startDate: new Date(cursor),
      endDate: addWeeks(cursor, designTotal),
      bottleneck: designQueueWait > 3,
      notes: designQueue > 0 ? `${designQueue} projects in design queue` : undefined,
    })
    cursor = addWeeks(cursor, designTotal)

    // — PROCUREMENT PHASE (parallel with design but sets a floor for production start) —
    const procurementWeeks = 3 // Default lead time — could be refined from PO data
    const procurementEnd = addWeeks(new Date(), procurementWeeks)
    // If procurement finishes after design, push production start
    if (procurementEnd > cursor) {
      phases.push({
        name: "Procurement",
        department: "PROCUREMENT",
        queueWeeks: 0,
        workWeeks: procurementWeeks,
        totalWeeks: procurementWeeks,
        startDate: new Date(),
        endDate: procurementEnd,
        bottleneck: false,
        notes: "Materials lead time (runs parallel to design)",
      })
      cursor = procurementEnd
    }

    // — PRODUCTION PHASES (one per workshop stage) —
    let hasProductionBottleneck = false
    for (const stage of WORKSHOP_STAGES) {
      const backlogMins = stageBacklog[stage] || 0
      const backlogHours = backlogMins / 60
      const stageQueueWeeks = backlogHours / productionCapPerStage
      const hoursPerStage = totalProductionHours / WORKSHOP_STAGES.length
      const stageWorkWeeks = hoursPerStage / productionCapPerStage

      const stageTotal = stageQueueWeeks + stageWorkWeeks
      const isBottleneck = stageQueueWeeks > 2
      if (isBottleneck) hasProductionBottleneck = true

      const utilisation = ((backlogHours + hoursPerStage) / productionCapPerStage) * 100
      if (utilisation > 90) {
        warnings.push(`${STAGE_LABELS[stage]}: ${utilisation.toFixed(0)}% utilisation — potential bottleneck`)
      }

      phases.push({
        name: STAGE_LABELS[stage] || stage,
        department: "PRODUCTION",
        queueWeeks: Math.round(stageQueueWeeks * 10) / 10,
        workWeeks: Math.round(stageWorkWeeks * 10) / 10,
        totalWeeks: Math.round(stageTotal * 10) / 10,
        startDate: new Date(cursor),
        endDate: addWeeks(cursor, stageTotal),
        bottleneck: isBottleneck,
      })
      cursor = addWeeks(cursor, stageTotal)
    }

    // — INSTALLATION PHASE —
    const installQueueWeeks = (installQueue * 8) / installCap // Assume ~8h per install job
    const installWorkWeeks = totalInstallHours / installCap
    const installTotal = installQueueWeeks + installWorkWeeks

    if (installQueueWeeks > 1) {
      warnings.push(`Installation: ${installQueue} jobs ahead — ${installQueueWeeks.toFixed(1)} week wait`)
    }

    phases.push({
      name: "Installation",
      department: "INSTALLATION",
      queueWeeks: Math.round(installQueueWeeks * 10) / 10,
      workWeeks: Math.round(installWorkWeeks * 10) / 10,
      totalWeeks: Math.round(installTotal * 10) / 10,
      startDate: new Date(cursor),
      endDate: addWeeks(cursor, installTotal),
      bottleneck: installQueueWeeks > 2,
    })
    cursor = addWeeks(cursor, installTotal)

    // — BUFFER —
    const totalProjectWeeks = (cursor.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000)
    let bufferPct = 0.10
    if (hasProductionBottleneck) bufferPct = 0.20
    if (lines.some(l => (l.estimatedHours || 0) > 40)) bufferPct = Math.max(bufferPct, 0.15)
    const bufferWeeks = Math.round(totalProjectWeeks * bufferPct * 10) / 10

    phases.push({
      name: "Buffer",
      department: "BUFFER",
      queueWeeks: 0,
      workWeeks: bufferWeeks,
      totalWeeks: bufferWeeks,
      startDate: new Date(cursor),
      endDate: addWeeks(cursor, bufferWeeks),
      bottleneck: false,
      notes: `${(bufferPct * 100).toFixed(0)}% safety buffer`,
    })
    cursor = addWeeks(cursor, bufferWeeks)

    // ── 7. Confidence ──
    let confidence = 90
    confidence -= phases.filter(p => p.bottleneck).length * 5
    confidence -= phases.filter(p => p.queueWeeks > 2).length * 3
    confidence = Math.max(30, Math.min(100, confidence))

    // ── 8. Requested date check ──
    let requestedDateFeasible: boolean | undefined
    let requestedDateGap: number | undefined
    if (requestedDate) {
      const gapMs = requestedDate.getTime() - cursor.getTime()
      const gapWeeks = Math.round((gapMs / (7 * 24 * 60 * 60 * 1000)) * 10) / 10
      requestedDateFeasible = gapWeeks >= 0
      requestedDateGap = gapWeeks
      if (!requestedDateFeasible) {
        warnings.push(`Requested date is ${Math.abs(gapWeeks)} weeks before earliest delivery`)
      }
    }

    const totalWeeks = Math.round(
      ((cursor.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000)) * 10
    ) / 10

    return NextResponse.json({
      earliestDeliveryDate: format(cursor, "yyyy-MM-dd"),
      totalWeeks,
      phases: phases.map(p => ({
        ...p,
        startDate: format(p.startDate, "yyyy-MM-dd"),
        endDate: format(p.endDate, "yyyy-MM-dd"),
      })),
      confidence,
      warnings,
      bufferWeeks,
      requestedDateFeasible,
      requestedDateGap,
    })

  } catch (error) {
    console.error("POST /api/planning/atp error:", error)
    return NextResponse.json({ error: "Failed to update ATP schedule" }, { status: 500 })
  }
}
