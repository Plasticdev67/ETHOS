import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { addDays, format, startOfDay, getDay } from "date-fns"
import {
  WORKSHOP_STAGES,
  GRID_STAGES,
  STATION_COUNTS,
  STATION_LABELS,
  GRID_STAGE_DISPLAY_NAMES,
  DEFAULT_STAGE_HOURS,
} from "@/lib/production-utils"

const WORK_HOURS_PER_DAY = 8

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const horizonDays = parseInt(searchParams.get("days") || "60")
  const pastDays = parseInt(searchParams.get("past") || "7")

  // ── 1. Fetch designers ──
  const designers = await prisma.user.findMany({
    where: { role: { in: ["DESIGN_ENGINEER", "ENGINEERING_MANAGER", "R_AND_D_MANAGER"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  // Build designer index: id → stationIdx, and labels
  const designerStationMap: Record<string, number> = {}
  const designerLabels: string[] = []

  // Fallback: if no designers in DB, create 7 default slots
  const designerCount = designers.length > 0 ? designers.length : 7

  if (designers.length > 0) {
    designers.forEach((d, i) => {
      designerStationMap[d.id] = i
      const parts = (d.name || "").split(" ")
      const initials = parts.map(p => p.charAt(0).toUpperCase()).join("")
      designerLabels.push(initials || `D${i + 1}`)
    })
  } else {
    // No designers found in DB — use known designer initials
    const fallbackInitials = ["SR", "AR", "DH", "RH", "SG", "GH", "KT"]
    for (const initials of fallbackInitials) {
      designerLabels.push(initials)
    }
  }

  // ── 2. Fetch projects with products ──
  const projects = await prisma.project.findMany({
    where: {
      projectStatus: { notIn: ["COMPLETE", "OPPORTUNITY"] },
    },
    include: {
      customer: { select: { name: true } },
      products: {
        select: {
          id: true,
          partCode: true,
          description: true,
          productJobNumber: true,
          currentDepartment: true,
          productionStatus: true,
          designEstimatedHours: true,
          productionEstimatedHours: true,
          designCompletionDate: true,
          productionCompletionDate: true,
          allocatedDesignerId: true,
          designCard: {
            select: {
              estimatedHours: true,
              status: true,
              assignedDesignerId: true,
            },
          },
          productionTasks: {
            where: { status: { in: ["PENDING", "IN_PROGRESS", "BLOCKED"] } },
            select: {
              stage: true,
              estimatedMins: true,
              queuePosition: true,
            },
            orderBy: { queuePosition: "asc" },
          },
        },
      },
    },
    orderBy: [
      { isICUFlag: "desc" },
      { targetCompletion: "asc" },
      { createdAt: "asc" },
    ],
  })

  // ── 3. Build product entries ──
  type ProductEntry = {
    productId: string
    projectId: string
    projectNumber: string
    projectName: string
    customerName: string
    productJobNumber: string
    partCode: string
    description: string
    isICU: boolean
    deadline: Date | null
    designerId: string | null
    designHours: number
    stageHours: Record<string, number>
    designComplete: boolean
    productionComplete: boolean
    currentStageIndex: number
  }

  const productEntries: ProductEntry[] = []

  for (const project of projects) {
    for (const product of project.products) {
      const designDone = !!product.designCompletionDate ||
        (product.currentDepartment !== "DESIGN" && product.currentDepartment !== "PLANNING")

      // Design hours
      let designHours = 0
      if (!designDone) {
        const est = product.designCard?.estimatedHours
          ? Number(product.designCard.estimatedHours)
          : product.designEstimatedHours
            ? Number(product.designEstimatedHours)
            : 0
        designHours = est > 0 ? est : DEFAULT_STAGE_HOURS.DESIGN
      }

      // Production stage hours
      const stageHours: Record<string, number> = {}
      const totalProdHours = Number(product.productionEstimatedHours || 0)

      for (const stage of WORKSHOP_STAGES) {
        const task = product.productionTasks.find(t => t.stage === stage)
        if (task?.estimatedMins) {
          stageHours[stage] = task.estimatedMins / 60
        } else if (totalProdHours > 0) {
          stageHours[stage] = totalProdHours / WORKSHOP_STAGES.length
        } else {
          stageHours[stage] = DEFAULT_STAGE_HOURS[stage] || 16
        }
      }

      const designerId = product.designCard?.assignedDesignerId
        || product.allocatedDesignerId
        || null

      const currentStageIdx = product.productionStatus
        ? WORKSHOP_STAGES.indexOf(product.productionStatus as typeof WORKSHOP_STAGES[number])
        : -1

      // Shortened product number: strip project prefix if present
      let shortJobNum = product.productJobNumber || product.partCode || product.id.slice(-6)
      if (shortJobNum.startsWith(project.projectNumber)) {
        shortJobNum = shortJobNum.slice(project.projectNumber.length).replace(/^-/, "")
      }

      productEntries.push({
        productId: product.id,
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectName: project.name,
        customerName: project.customer?.name || "—",
        productJobNumber: shortJobNum,
        partCode: product.partCode,
        description: product.description,
        isICU: project.isICUFlag,
        deadline: project.targetCompletion,
        designerId,
        designHours,
        stageHours,
        designComplete: designDone,
        productionComplete: !!product.productionCompletionDate,
        currentStageIndex: currentStageIdx,
      })
    }
  }

  // Sort by priority
  productEntries.sort((a, b) => {
    if (a.isICU && !b.isICU) return -1
    if (!a.isICU && b.isICU) return 1
    const aD = a.deadline?.getTime() || Infinity
    const bD = b.deadline?.getTime() || Infinity
    if (aD !== bD) return aD - bD
    return 0
  })

  // ── 4. Forward Scheduling (in working HOURS) ──
  // Station availability: next free working hour per station
  const stageStationHours: Record<string, number[]> = {}
  for (const stage of GRID_STAGES) {
    const count = stage === "DESIGN" ? designerCount : (STATION_COUNTS[stage] || 1)
    stageStationHours[stage] = new Array(count).fill(0)
  }

  // Per product: when it finishes previous stage (working hours)
  const productPrevEnd: Record<string, number> = {}

  type ScheduledSlot = {
    productId: string
    projectId: string
    stage: string
    stationIdx: number
    startHour: number
    endHour: number
  }
  const scheduledSlots: ScheduledSlot[] = []

  for (const entry of productEntries) {
    if (entry.productionComplete) continue

    const stages: string[] = []
    if (!entry.designComplete) stages.push("DESIGN")
    for (let i = 0; i < WORKSHOP_STAGES.length; i++) {
      if (entry.currentStageIndex >= 0 && i < entry.currentStageIndex) continue
      stages.push(WORKSHOP_STAGES[i])
    }

    for (const stage of stages) {
      const durationHours = stage === "DESIGN"
        ? entry.designHours
        : (entry.stageHours[stage] || DEFAULT_STAGE_HOURS[stage] || 16)

      if (durationHours <= 0) continue

      // For DESIGN: prefer the assigned designer's station
      let bestStation = 0
      const stations = stageStationHours[stage]

      if (stage === "DESIGN" && entry.designerId && designerStationMap[entry.designerId] !== undefined) {
        bestStation = designerStationMap[entry.designerId]
      } else {
        // Find earliest free station
        let minHour = Infinity
        for (let i = 0; i < stations.length; i++) {
          if (stations[i] < minHour) {
            minHour = stations[i]
            bestStation = i
          }
        }
      }

      const prevEnd = productPrevEnd[entry.productId] || 0
      const startHour = Math.max(stations[bestStation], prevEnd)
      const endHour = startHour + durationHours

      scheduledSlots.push({
        productId: entry.productId,
        projectId: entry.projectId,
        stage,
        stationIdx: bestStation,
        startHour,
        endHour,
      })

      stations[bestStation] = endHour
      productPrevEnd[entry.productId] = endHour
    }
  }

  // ── 5. Map working hours → calendar dates & build grid ──
  const today = startOfDay(new Date())

  // Build working-day-index → calendar-date mapping
  const maxWorkDay = Math.ceil(
    Math.max(0, ...scheduledSlots.map(s => s.endHour)) / WORK_HOURS_PER_DAY
  )
  const workDayToDate: Date[] = []
  {
    let startDate = today
    // If today is weekend, find next Monday
    while (getDay(startDate) === 0 || getDay(startDate) === 6) {
      startDate = addDays(startDate, 1)
    }
    workDayToDate[0] = startDate
    let calOffset = 0
    let wdCount = 0
    while (wdCount < maxWorkDay + 5) {
      calOffset++
      const d = addDays(startDate, calOffset)
      if (getDay(d) !== 0 && getDay(d) !== 6) {
        wdCount++
        workDayToDate[wdCount] = d
      }
    }
  }

  // For each slot, expand into day-level cell entries
  // Key: "date|stage|stationIdx" → CellEntry[]
  type CellEntry = {
    blockId: string
    productId: string
    projectId: string
    label: string
    colorIndex: number
    projectNumber: string
    productDesc: string
    isBlockStart: boolean
    isBlockEnd: boolean
  }
  const cellMap = new Map<string, CellEntry[]>()

  // Project color assignment
  const uniqueProjectIds = [...new Set(productEntries.map(e => e.projectId))]
  const projectColorMap: Record<string, number> = {}
  uniqueProjectIds.forEach((pid, i) => {
    projectColorMap[pid] = i % 20
  })

  for (const slot of scheduledSlots) {
    const entry = productEntries.find(e => e.productId === slot.productId)
    if (!entry) continue

    const startDay = Math.floor(slot.startHour / WORK_HOURS_PER_DAY)
    const endDay = Math.ceil(slot.endHour / WORK_HOURS_PER_DAY) - 1
    const blockId = `${slot.productId}:${slot.stage}`

    for (let wd = startDay; wd <= endDay; wd++) {
      const calDate = workDayToDate[wd]
      if (!calDate) continue
      const dateStr = format(calDate, "yyyy-MM-dd")
      const key = `${dateStr}|${slot.stage}|${slot.stationIdx}`

      const arr = cellMap.get(key) || []
      arr.push({
        blockId,
        productId: slot.productId,
        projectId: slot.projectId,
        label: entry.productJobNumber,
        colorIndex: projectColorMap[slot.projectId] ?? 0,
        projectNumber: entry.projectNumber,
        productDesc: entry.description,
        isBlockStart: wd === startDay,
        isBlockEnd: wd === endDay,
      })
      cellMap.set(key, arr)
    }
  }

  // ── 6. Build stage columns (with designer names) ──
  const stageColumns: Array<{
    stageId: string
    stageLabel: string
    stations: Array<{ stationIdx: number; label: string; designerId?: string }>
  }> = []

  for (const stage of GRID_STAGES) {
    if (stage === "DESIGN") {
      const designStations = designers.length > 0
        ? designers.map((d, i) => ({
            stationIdx: i,
            label: designerLabels[i],
            designerId: d.id,
          }))
        : Array.from({ length: 7 }, (_, i) => ({
            stationIdx: i,
            label: designerLabels[i],
          }))

      stageColumns.push({
        stageId: "DESIGN",
        stageLabel: "Design",
        stations: designStations,
      })
    } else {
      const count = STATION_COUNTS[stage] || 1
      const labels = STATION_LABELS[stage] || Array.from({ length: count }, (_, i) => `${i + 1}`)
      stageColumns.push({
        stageId: stage,
        stageLabel: GRID_STAGE_DISPLAY_NAMES[stage] || stage,
        stations: labels.map((label, idx) => ({ stationIdx: idx, label })),
      })
    }
  }

  // ── 7. Compute project end dates (last day any product finishes) ──
  const projectLastHour: Record<string, number> = {}
  for (const slot of scheduledSlots) {
    const prev = projectLastHour[slot.projectId] || 0
    if (slot.endHour > prev) {
      projectLastHour[slot.projectId] = slot.endHour
    }
  }

  const projectEndDates: Record<string, string> = {}
  for (const [pid, endHour] of Object.entries(projectLastHour)) {
    const endWorkDay = Math.ceil(endHour / WORK_HOURS_PER_DAY) - 1
    const endDate = workDayToDate[endWorkDay]
    if (endDate) {
      projectEndDates[pid] = format(endDate, "yyyy-MM-dd")
    }
  }

  type EndMarker = { projectId: string; projectNumber: string; colorIndex: number }
  const endMarkersByDate: Record<string, EndMarker[]> = {}
  for (const [pid, dateStr] of Object.entries(projectEndDates)) {
    if (!endMarkersByDate[dateStr]) endMarkersByDate[dateStr] = []
    const entry = productEntries.find(x => x.projectId === pid)
    if (entry) {
      endMarkersByDate[dateStr].push({
        projectId: pid,
        projectNumber: entry.projectNumber,
        colorIndex: projectColorMap[pid] ?? 0,
      })
    }
  }

  // ── 8. Build rows ──
  const gridStart = addDays(today, -pastDays)
  const lastScheduleDate = maxWorkDay > 0 && workDayToDate[maxWorkDay]
    ? workDayToDate[maxWorkDay]
    : today
  const gridEnd = new Date(Math.max(
    addDays(today, horizonDays).getTime(),
    lastScheduleDate.getTime()
  ))

  const todayStr = format(today, "yyyy-MM-dd")

  type GridRow = {
    date: string
    label: string
    dayName: string
    isToday: boolean
    isWeekend: boolean
    isMonday: boolean
    cells: Record<string, CellEntry[][]>
    endMarkers: EndMarker[]
  }

  const rows: GridRow[] = []
  let todayIndex = -1
  let current = gridStart

  while (current <= gridEnd) {
    const dateStr = format(current, "yyyy-MM-dd")
    const dow = getDay(current)
    const isToday = dateStr === todayStr
    if (isToday) todayIndex = rows.length

    const cells: Record<string, CellEntry[][]> = {}
    for (const sc of stageColumns) {
      cells[sc.stageId] = sc.stations.map(s => {
        const key = `${dateStr}|${sc.stageId}|${s.stationIdx}`
        return cellMap.get(key) || []
      })
    }

    rows.push({
      date: dateStr,
      label: format(current, "d MMM"),
      dayName: format(current, "EEE"),
      isToday,
      isWeekend: dow === 0 || dow === 6,
      isMonday: dow === 1,
      cells,
      endMarkers: endMarkersByDate[dateStr] || [],
    })

    current = addDays(current, 1)
  }

  // ── 9. Build legend ──
  const projectProducts: Record<string, Array<{ label: string; partCode: string; desc: string }>> = {}
  for (const e of productEntries) {
    if (!projectProducts[e.projectId]) projectProducts[e.projectId] = []
    projectProducts[e.projectId].push({
      label: e.productJobNumber,
      partCode: e.partCode,
      desc: e.description,
    })
  }

  const legend = uniqueProjectIds.map(pid => {
    const e = productEntries.find(x => x.projectId === pid)!
    return {
      projectId: pid,
      projectNumber: e.projectNumber,
      projectName: e.projectName,
      customerName: e.customerName,
      colorIndex: projectColorMap[pid],
      isICU: e.isICU,
      deadline: e.deadline ? format(e.deadline, "yyyy-MM-dd") : null,
      products: projectProducts[pid] || [],
    }
  })

  return NextResponse.json({
    rows,
    stages: stageColumns,
    legend,
    todayIndex,
  })
}
