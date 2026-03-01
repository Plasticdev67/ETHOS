import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { requirePermission } from "@/lib/api-auth"
import { revalidatePath } from "next/cache"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("production:manage")
  if (denied) return denied

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { assignedTo } = body as { assignedTo?: string }

  try {
    const task = await prisma.productionTask.findUnique({ where: { id } })
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    if (task.status !== "PENDING" && task.status !== "REWORK") {
      return NextResponse.json(
        { error: `Cannot start task: current status is ${task.status}` },
        { status: 400 }
      )
    }

    const now = new Date()
    const updated = await prisma.productionTask.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        startedAt: now,
        assignedTo: assignedTo || task.assignedTo || null,
      },
    })

    // Update product's productionStatus to this stage
    await prisma.product.update({
      where: { id: task.productId },
      data: {
        productionStatus: task.stage,
        currentDepartment: "PRODUCTION",
      },
    })

    await logAudit({
      action: "UPDATE",
      entity: "ProductionTask",
      entityId: id,
      field: "status",
      oldValue: task.status,
      newValue: "IN_PROGRESS",
      metadata: JSON.stringify({ stage: task.stage, assignedTo: assignedTo || task.assignedTo }),
    })

    revalidatePath("/production")
    revalidatePath("/production/dashboard")

    return NextResponse.json(updated)

  } catch (error) {
    console.error("POST /api/production/tasks/[id]/start error:", error)
    return NextResponse.json({ error: "Failed to start task" }, { status: 500 })
  }
}
