import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import type { ProductionStage } from "@/generated/prisma/client"
import { requireAuth, requirePermission } from "@/lib/api-auth"

const WORKSHOP_STAGES: ProductionStage[] = ["CUTTING", "FABRICATION", "FITTING", "SHOTBLASTING", "PAINTING", "PACKING"]

// POST /api/production/sync-tasks — Create missing production tasks for products at workshop stages
export async function POST() {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("production:manage")
  if (denied) return denied

  try {
    // Find all products at a workshop stage
    const products = await prisma.product.findMany({
      where: {
        productionStatus: { in: WORKSHOP_STAGES },
      },
      select: { id: true, productionStatus: true, projectId: true },
    })

    let created = 0
    for (const product of products) {
      if (!product.productionStatus) continue

      // Check if a task already exists at this stage
      const existingTask = await prisma.productionTask.findFirst({
        where: {
          productId: product.id,
          stage: product.productionStatus as ProductionStage,
          status: { in: ["PENDING", "IN_PROGRESS", "REWORK"] },
        },
      })

      if (!existingTask) {
        // Get max queue position
        const maxPos = await prisma.productionTask.findFirst({
          where: { stage: product.productionStatus as ProductionStage },
          orderBy: { queuePosition: "desc" },
          select: { queuePosition: true },
        })
        const queuePosition = (maxPos?.queuePosition ?? -1) + 1

        await prisma.productionTask.create({
          data: {
            productId: product.id,
            projectId: product.projectId,
            stage: product.productionStatus as ProductionStage,
            status: "PENDING",
            queuePosition,
          },
        })
        created++
      }
    }

    revalidatePath("/production")

    return NextResponse.json({
      ok: true,
      productsChecked: products.length,
      tasksCreated: created,
    })
  } catch (error) {
    console.error("Failed to sync production tasks:", error)
    return NextResponse.json({ error: "Failed to sync tasks" }, { status: 500 })
  }
}
