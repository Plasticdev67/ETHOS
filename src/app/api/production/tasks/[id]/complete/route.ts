import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { requirePermission } from "@/lib/api-auth"
import { revalidatePath } from "next/cache"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("production:manage")
  if (denied) return denied

  const { id } = await params

  const task = await prisma.productionTask.findUnique({ where: { id } })
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  if (task.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: `Cannot complete task: current status is ${task.status}` },
      { status: 400 }
    )
  }

  const now = new Date()
  const actualMins = task.startedAt
    ? Math.round((now.getTime() - task.startedAt.getTime()) / 60000)
    : null

  const updated = await prisma.productionTask.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt: now,
      actualMins,
      inspectionStatus: "PENDING",
    },
  })

  await logAudit({
    action: "UPDATE",
    entity: "ProductionTask",
    entityId: id,
    field: "status",
    oldValue: "IN_PROGRESS",
    newValue: "COMPLETED",
    metadata: JSON.stringify({ stage: task.stage, actualMins }),
  })

  revalidatePath("/production")
  revalidatePath("/production/dashboard")

  return NextResponse.json(updated)
}
