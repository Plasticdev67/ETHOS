import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const stage = searchParams.get("stage")
  const projectId = searchParams.get("projectId")
  const status = searchParams.get("status")
  const productId = searchParams.get("productId")

  const where: Record<string, unknown> = {}
  if (stage) where.stage = stage
  if (projectId) where.projectId = projectId
  if (status) where.status = status
  if (productId) where.productId = productId

  const tasks = await prisma.productionTask.findMany({
    where,
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
          customer: { select: { name: true } },
        },
      },
    },
    orderBy: { queuePosition: "asc" },
  })

  return NextResponse.json(tasks)
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("production:manage")
  if (denied) return denied

  const body = await request.json()
  const { productId, projectId, stage, estimatedMins, assignedTo, notes } = body

  if (!productId || !projectId || !stage) {
    return NextResponse.json(
      { error: "productId, projectId, and stage are required" },
      { status: 400 }
    )
  }

  // Auto-set queue position to max + 1
  try {
    const maxPos = await prisma.productionTask.findFirst({
      where: { stage },
      orderBy: { queuePosition: "desc" },
      select: { queuePosition: true },
    })
    const queuePosition = (maxPos?.queuePosition ?? -1) + 1

    const task = await prisma.productionTask.create({
      data: {
        productId,
        projectId,
        stage,
        queuePosition,
        estimatedMins: estimatedMins || null,
        assignedTo: assignedTo || null,
        notes: notes || null,
      },
    })

    await logAudit({
      action: "CREATE",
      entity: "ProductionTask",
      entityId: task.id,
      field: "stage",
      newValue: stage,
    })

    revalidatePath("/production")
    revalidatePath("/production/dashboard")

    return NextResponse.json(task, { status: 201 })

  } catch (error) {
    console.error("POST /api/production/tasks error:", error)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}
