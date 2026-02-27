import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"

// PATCH /api/design/cards/:id/schedule — Update target dates for a design card
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let targetStartDate: string
  let targetEndDate: string
  try {
    const body = await request.json()
    targetStartDate = body.targetStartDate
    targetEndDate = body.targetEndDate
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!targetStartDate || !targetEndDate) {
    return NextResponse.json(
      { error: "targetStartDate and targetEndDate are required" },
      { status: 400 }
    )
  }

  const newStart = new Date(targetStartDate)
  const newEnd = new Date(targetEndDate)

  if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
  }

  if (newEnd <= newStart) {
    return NextResponse.json(
      { error: "End date must be after start date" },
      { status: 400 }
    )
  }

  const card = await prisma.productDesignCard.findUnique({
    where: { id },
    select: {
      id: true,
      assignedDesignerId: true,
      targetStartDate: true,
      targetEndDate: true,
    },
  })

  if (!card) {
    return NextResponse.json({ error: "Design card not found" }, { status: 404 })
  }

  // Server-side overlap check for same designer
  if (card.assignedDesignerId) {
    const overlapping = await prisma.productDesignCard.findFirst({
      where: {
        id: { not: id },
        assignedDesignerId: card.assignedDesignerId,
        status: { notIn: ["COMPLETE", "ON_HOLD"] },
        targetStartDate: { lt: newEnd },
        targetEndDate: { gt: newStart },
      },
      select: {
        id: true,
        product: { select: { productJobNumber: true, description: true } },
        project: { select: { name: true } },
      },
    })

    if (overlapping) {
      const label = overlapping.product.productJobNumber || overlapping.product.description
      return NextResponse.json(
        { error: `Schedule conflict: overlaps with "${overlapping.project.name} — ${label}"` },
        { status: 409 }
      )
    }
  }

  const updated = await prisma.productDesignCard.update({
    where: { id },
    data: {
      targetStartDate: newStart,
      targetEndDate: newEnd,
    },
  })

  await logAudit({
    action: "UPDATE",
    entity: "ProductDesignCard",
    entityId: id,
    field: "schedule",
    oldValue: JSON.stringify({
      targetStartDate: card.targetStartDate,
      targetEndDate: card.targetEndDate,
    }),
    newValue: JSON.stringify({
      targetStartDate: newStart,
      targetEndDate: newEnd,
    }),
  })

  return NextResponse.json(updated)
}
