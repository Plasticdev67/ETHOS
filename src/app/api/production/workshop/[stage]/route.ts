import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { WORKSHOP_STAGES, ALL_PRODUCTION_STAGES } from "@/lib/production-utils"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ stage: string }> }
) {
  const { stage } = await params

  if (!WORKSHOP_STAGES.includes(stage as any)) {
    return NextResponse.json(
      { error: `Invalid stage: ${stage}` },
      { status: 400 }
    )
  }

  // Get all tasks at this stage
  const tasks = await prisma.productionTask.findMany({
    where: { stage: stage as any },
    include: {
      product: {
        select: {
          id: true,
          partCode: true,
          description: true,
          productJobNumber: true,
          quantity: true,
          productionStatus: true,
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
          ragStatus: true,
          contractValue: true,
          customer: { select: { name: true } },
          projectManager: { select: { name: true } },
        },
      },
    },
    orderBy: { queuePosition: "asc" },
  })

  // Split into queue (active work) and completed (awaiting handover)
  const queue = tasks.filter(
    (t) => t.status !== "COMPLETED" || t.inspectionStatus === "PENDING"
  )
  const completed = tasks.filter(
    (t) => t.status === "COMPLETED" && t.inspectionStatus === "PENDING"
  )
  const active = tasks.filter((t) => t.status === "IN_PROGRESS")
  const pending = tasks.filter(
    (t) => t.status === "PENDING" || t.status === "REWORK"
  )

  // Get unique projects at this stage
  const projectMap = new Map<string, any>()
  for (const task of tasks) {
    if (!projectMap.has(task.projectId)) {
      projectMap.set(task.projectId, {
        ...task.project,
        productCount: 0,
        taskStatuses: [],
      })
    }
    const proj = projectMap.get(task.projectId)!
    proj.productCount++
    proj.taskStatuses.push(task.status)
  }
  const projects = Array.from(projectMap.values())

  // Calculate stats
  const completedToday = tasks.filter((t) => {
    if (!t.completedAt) return false
    const today = new Date()
    const completed = new Date(t.completedAt)
    return (
      completed.getFullYear() === today.getFullYear() &&
      completed.getMonth() === today.getMonth() &&
      completed.getDate() === today.getDate()
    )
  })

  const completedWithMins = tasks.filter((t) => t.actualMins && t.actualMins > 0)
  const avgMins =
    completedWithMins.length > 0
      ? Math.round(
          completedWithMins.reduce((s, t) => s + (t.actualMins || 0), 0) /
            completedWithMins.length
        )
      : 0

  const stats = {
    totalTasks: tasks.length,
    activeCount: active.length,
    pendingCount: pending.length,
    completedTodayCount: completedToday.length,
    awaitingHandoverCount: completed.length,
    avgProcessingMins: avgMins,
  }

  // Get products at earlier stages (allocated to this stage but previous process not finished)
  const stageIdx = (ALL_PRODUCTION_STAGES as readonly string[]).indexOf(stage)
  const previousStages = stageIdx > 0
    ? ALL_PRODUCTION_STAGES.slice(0, stageIdx).filter(s => s !== "COMPLETED")
    : []

  const allocatedProducts = previousStages.length > 0
    ? await prisma.product.findMany({
        where: {
          productionStatus: { in: previousStages as string[] },
        },
        select: {
          id: true,
          partCode: true,
          description: true,
          productJobNumber: true,
          quantity: true,
          productionStatus: true,
          productionTargetDate: true,
          project: {
            select: {
              id: true,
              projectNumber: true,
              name: true,
              priority: true,
              isICUFlag: true,
              classification: true,
              targetCompletion: true,
              ragStatus: true,
              contractValue: true,
              customer: { select: { name: true } },
              projectManager: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      })
    : []

  return NextResponse.json({
    projects,
    queue: pending,
    active,
    completed,
    allTasks: tasks,
    allocatedProducts,
    stats,
  })
}
