import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

const WORKSHOP_STAGES = ["CUTTING", "FABRICATION", "FITTING", "SHOTBLASTING", "PAINTING", "PACKING"]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("production:manage")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()
  const { productionStatus } = body

  if (!productionStatus) {
    return NextResponse.json(
      { error: "productionStatus is required" },
      { status: 400 }
    )
  }

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, productionStatus: true, projectId: true },
  })

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 })
  }

  await prisma.product.update({
    where: { id },
    data: { productionStatus },
  })

  // If moving to a workshop stage, create a task if none exists
  if (WORKSHOP_STAGES.includes(productionStatus)) {
    const existingTask = await prisma.productionTask.findFirst({
      where: { productId: id, stage: productionStatus },
    })

    if (!existingTask) {
      const maxPos = await prisma.productionTask.findFirst({
        where: { stage: productionStatus },
        orderBy: { queuePosition: "desc" },
        select: { queuePosition: true },
      })
      const queuePosition = (maxPos?.queuePosition ?? -1) + 1

      await prisma.productionTask.create({
        data: {
          productId: id,
          projectId: product.projectId,
          stage: productionStatus,
          status: "PENDING",
          queuePosition,
        },
      })
    }
  }

  await logAudit({
    action: "UPDATE",
    entity: "Product",
    entityId: id,
    field: "productionStatus",
    oldValue: product.productionStatus,
    newValue: productionStatus,
  })

  revalidatePath("/production")

  return NextResponse.json({ success: true })
}
