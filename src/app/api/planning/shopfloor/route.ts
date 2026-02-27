import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { addDays, addMinutes, format, startOfDay } from "date-fns"

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

// Working hours per day (8am-4pm)
const WORK_HOURS_PER_DAY = 8
const WORK_START_HOUR = 8

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const horizonWeeks = parseInt(searchParams.get("weeks") || "2")
  const view = searchParams.get("view") || "product"
  const projectFilter = searchParams.get("projectId") || undefined

  const horizonEnd = addDays(new Date(), horizonWeeks * 7)

  // Fetch production tasks
  const where: Record<string, unknown> = {
    status: { in: ["PENDING", "IN_PROGRESS", "BLOCKED"] },
  }
  if (projectFilter) where.projectId = projectFilter

  const tasks = await prisma.productionTask.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          partCode: true,
          description: true,
          quantity: true,
          productionTargetDate: true,
        },
      },
      project: {
        select: {
          id: true,
          projectNumber: true,
          name: true,
          priority: true,
          isICUFlag: true,
          classification: true,
          targetCompletion: true,
          customer: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { stage: "asc" },
      { queuePosition: "asc" },
    ],
  })

  // Also fetch recently completed tasks (last 2 days) for context
  const twoDaysAgo = addDays(new Date(), -2)
  const completedTasks = await prisma.productionTask.findMany({
    where: {
      status: "COMPLETED",
      completedAt: { gte: twoDaysAgo },
      ...(projectFilter ? { projectId: projectFilter } : {}),
    },
    include: {
      product: {
        select: { id: true, partCode: true, description: true, quantity: true },
      },
      project: {
        select: {
          id: true, projectNumber: true, name: true, priority: true,
          isICUFlag: true, classification: true,
        },
      },
    },
    orderBy: { completedAt: "desc" },
    take: 50,
  })

  // Fetch department capacity for production
  const prodCapacity = await prisma.departmentCapacity.findFirst({
    where: { department: "PRODUCTION" },
  })
  const totalProdHoursPerWeek = Number(prodCapacity?.hoursPerWeek || 200)
  const hoursPerStagePerDay = (totalProdHoursPerWeek / WORKSHOP_STAGES.length) / 5 // 5 working days

  // ── Forward Scheduling Algorithm ──
  // Sort tasks by priority: ICU first, then by project deadline (earliest first), then queue position
  const sortedTasks = [...tasks].sort((a, b) => {
    // ICU first
    if (a.project.isICUFlag && !b.project.isICUFlag) return -1
    if (!a.project.isICUFlag && b.project.isICUFlag) return 1
    // Earlier deadline first
    const aDeadline = a.project.targetCompletion?.getTime() || Infinity
    const bDeadline = b.project.targetCompletion?.getTime() || Infinity
    if (aDeadline !== bDeadline) return aDeadline - bDeadline
    // Same-stage queue position
    return a.queuePosition - b.queuePosition
  })

  // Track workstation availability per stage (minutes from "now")
  const stageAvailability: Record<string, number> = {}
  for (const stage of WORKSHOP_STAGES) {
    stageAvailability[stage] = 0 // Minutes from now when this stage is next free
  }

  // Track per-product: when does the product finish its previous stage?
  const productPreviousStageEnd: Record<string, number> = {} // productId -> minutes from now

  // Already in-progress tasks occupy time from now
  for (const task of sortedTasks) {
    if (task.status === "IN_PROGRESS") {
      const remaining = Math.max(0, (task.estimatedMins || 60) - (task.actualMins || 0))
      stageAvailability[task.stage] = Math.max(stageAvailability[task.stage] || 0, remaining)
    }
  }

  const now = startOfDay(new Date())
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()

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

  const scheduled: ScheduledTask[] = []

  for (const task of sortedTasks) {
    const estMins = task.estimatedMins || 60
    const stage = task.stage

    // Earliest this task can start:
    // 1. When the stage workstation is free
    const stageReady = stageAvailability[stage] || 0
    // 2. When the product has finished its previous stage (precedence constraint)
    const prevEnd = productPreviousStageEnd[task.productId] || 0
    const earliestStart = Math.max(stageReady, prevEnd)

    // Convert minutes offset to actual date/time
    const startDate = addMinutes(new Date(), earliestStart)
    const endDate = addMinutes(startDate, estMins)

    // Update stage availability (this workstation is occupied until task ends)
    stageAvailability[stage] = earliestStart + estMins

    // Update product precedence (this product can't start next stage until this one ends)
    productPreviousStageEnd[task.productId] = earliestStart + estMins

    scheduled.push({
      taskId: task.id,
      productId: task.productId,
      productName: `${task.product.partCode} — ${task.product.description}`,
      projectId: task.projectId,
      projectNumber: task.project.projectNumber,
      projectName: task.project.name,
      customerName: task.project.customer?.name || "—",
      stage: task.stage,
      stageLabel: STAGE_LABELS[task.stage] || task.stage,
      status: task.status,
      estimatedMins: estMins,
      actualMins: task.actualMins,
      queuePosition: task.queuePosition,
      assignedTo: task.assignedTo,
      scheduledStart: format(startDate, "yyyy-MM-dd'T'HH:mm"),
      scheduledEnd: format(endDate, "yyyy-MM-dd'T'HH:mm"),
      isICU: task.project.isICUFlag,
      priority: task.project.priority,
      targetDate: task.product.productionTargetDate
        ? format(task.product.productionTargetDate, "yyyy-MM-dd")
        : null,
    })
  }

  // Filter to horizon
  const filteredScheduled = scheduled.filter(t => {
    const start = new Date(t.scheduledStart)
    return start < horizonEnd
  })

  // Build "by product" grouping
  const byProduct: Record<string, ScheduledTask[]> = {}
  for (const task of filteredScheduled) {
    const key = task.productId
    if (!byProduct[key]) byProduct[key] = []
    byProduct[key].push(task)
  }

  // Build "by stage" grouping
  const byStage: Record<string, ScheduledTask[]> = {}
  for (const stage of WORKSHOP_STAGES) {
    byStage[stage] = filteredScheduled.filter(t => t.stage === stage)
  }

  // Workers
  const workers = await prisma.worker.findMany({
    where: { isAvailable: true },
    orderBy: { role: "asc" },
  })

  return NextResponse.json({
    scheduled: filteredScheduled,
    byProduct,
    byStage,
    stages: WORKSHOP_STAGES.map(s => ({ id: s, label: STAGE_LABELS[s] })),
    workers: workers.map(w => ({ id: w.id, name: w.name, role: w.role })),
    completedRecently: completedTasks.map(t => ({
      taskId: t.id,
      productName: `${t.product.partCode} — ${t.product.description}`,
      projectNumber: t.project.projectNumber,
      stage: t.stage,
      stageLabel: STAGE_LABELS[t.stage] || t.stage,
      completedAt: t.completedAt ? format(t.completedAt, "yyyy-MM-dd'T'HH:mm") : null,
      actualMins: t.actualMins,
    })),
    horizonDays: horizonWeeks * 7,
  })
}
