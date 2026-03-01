import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// PATCH: Update a product's schedule position (from drag-and-drop)
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { productId, stage, newStartDate, designerId } = body as {
    productId: string
    stage: string
    newStartDate: string
    designerId?: string
  }

  if (!productId || !stage || !newStartDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const startDate = new Date(newStartDate)

  if (stage === "DESIGN") {
    // Update design planned start
    await prisma.product.update({
      where: { id: productId },
      data: { designPlannedStart: startDate },
    })

    // If designer changed, update the design card
    if (designerId) {
      await prisma.productDesignCard.updateMany({
        where: { productId },
        data: { assignedDesignerId: designerId },
      })
    }
  } else {
    // For production stages, update the product's production planned start
    // This is a hint for the scheduler
    await prisma.product.update({
      where: { id: productId },
      data: { productionPlannedStart: startDate },
    })
  }

  return NextResponse.json({ ok: true })
}
