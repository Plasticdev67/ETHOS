import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

// POST /api/design/handover/[projectId]/acknowledge — Production Manager acknowledges handover
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  try {
    const body = await request.json()
    const { receivedById } = body

    // Fetch existing handover (includes product IDs)
    const handover = await prisma.designHandover.findUnique({
      where: { projectId },
    })

    if (!handover) {
      return NextResponse.json(
        { error: "No handover found for this project" },
        { status: 404 }
      )
    }

    if (handover.status !== "SUBMITTED") {
      return NextResponse.json(
        {
          error: `Handover status is ${handover.status}, only SUBMITTED handovers can be acknowledged`,
        },
        { status: 400 }
      )
    }

    const now = new Date()

    // Update handover to ACKNOWLEDGED
    const updatedHandover = await prisma.designHandover.update({
      where: { projectId },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedAt: now,
        receivedById: receivedById || null,
      },
      include: {
        initiatedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
      },
    })

    // Check if all products in this project will be in production after this acknowledgement
    const allProjectProducts = await prisma.product.findMany({
      where: { projectId },
      select: { id: true, productionStatus: true },
    })

    const includedProductIds = (handover.includedProductIds || []) as string[]
    const allInProduction = allProjectProducts.every(
      (p) => p.productionStatus !== null || includedProductIds.includes(p.id)
    )

    // Only advance project to MANUFACTURE when ALL products have been handed over
    if (allInProduction) {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          p3Date: now,
          projectStatus: "MANUFACTURE",
          departmentStatus: "TODO",
        },
      })
    }

    // ── Create initial CUTTING tasks for all products in this handover ──
    // If handover has specific product IDs, use those; otherwise get all project products
    const products = includedProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: includedProductIds } },
          select: { id: true },
        })
      : await prisma.product.findMany({
          where: { projectId },
          select: { id: true },
        })

    // Get max queue position for CUTTING stage
    const maxPos = await prisma.productionTask.findFirst({
      where: { stage: "CUTTING" },
      orderBy: { queuePosition: "desc" },
      select: { queuePosition: true },
    })
    let queuePosition = (maxPos?.queuePosition ?? -1) + 1

    for (const product of products) {
      // Only create if no CUTTING task already exists for this product
      const existingTask = await prisma.productionTask.findFirst({
        where: { productId: product.id, stage: "CUTTING" },
      })

      if (!existingTask) {
        await prisma.productionTask.create({
          data: {
            productId: product.id,
            projectId,
            stage: "CUTTING",
            status: "PENDING",
            queuePosition: queuePosition++,
          },
        })

        // Set product's production status to CUTTING
        await prisma.product.update({
          where: { id: product.id },
          data: {
            productionStatus: "CUTTING",
            currentDepartment: "PRODUCTION",
          },
        })
      }
    }

    // Log audit for handover acknowledgement
    await logAudit({
      userId: receivedById,
      action: "UPDATE",
      entity: "DesignHandover",
      entityId: updatedHandover.id,
      field: "status",
      oldValue: "SUBMITTED",
      newValue: "ACKNOWLEDGED",
      metadata: JSON.stringify({ projectId }),
    })

    // Log audit for project status advancement (only if fully handed over)
    if (allInProduction) {
      await logAudit({
        userId: receivedById,
        action: "UPDATE",
        entity: "Project",
        entityId: projectId,
        field: "projectStatus",
        oldValue: "DESIGN",
        newValue: "MANUFACTURE",
        metadata: JSON.stringify({
          trigger: "DesignHandover acknowledged (all products)",
          handoverId: updatedHandover.id,
          productsInitialized: products.length,
        }),
      })
    } else {
      await logAudit({
        userId: receivedById,
        action: "UPDATE",
        entity: "Project",
        entityId: projectId,
        field: "partialHandover",
        oldValue: null,
        newValue: `${products.length} products to production`,
        metadata: JSON.stringify({
          trigger: "Partial design handover acknowledged",
          handoverId: updatedHandover.id,
          productsInitialized: products.length,
          remainingInDesign: allProjectProducts.length - products.length,
        }),
      })
    }

    revalidatePath("/production")
    revalidatePath("/production/dashboard")
    revalidatePath("/design")

    return NextResponse.json(JSON.parse(JSON.stringify(updatedHandover)))
  } catch (error) {
    console.error("Failed to acknowledge design handover:", error)
    return NextResponse.json(
      { error: "Failed to acknowledge design handover" },
      { status: 500 }
    )
  }
}
