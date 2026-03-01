import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { requirePermission } from "@/lib/api-auth"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const task = await prisma.productionTask.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          partCode: true,
          description: true,
          productJobNumber: true,
          quantity: true,
          productionStatus: true,
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
  })

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  return NextResponse.json(task)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("production:manage")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()

  try {
    const task = await prisma.productionTask.findUnique({ where: { id } })
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const allowedFields = [
      "status",
      "assignedTo",
      "queuePosition",
      "notes",
      "estimatedMins",
    ]
    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field]
      }
    }

    const updated = await prisma.productionTask.update({
      where: { id },
      data,
    })

    if (data.status) {
      await logAudit({
        action: "UPDATE",
        entity: "ProductionTask",
        entityId: id,
        field: "status",
        oldValue: task.status,
        newValue: data.status as string,
      })
    }

    return NextResponse.json(updated)

  } catch (error) {
    console.error("PATCH /api/production/tasks/[id] error:", error)
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}
