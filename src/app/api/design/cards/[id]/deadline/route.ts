import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"

// PATCH /api/design/cards/:id/deadline — Update deadline for a design card
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let targetEndDate: string | null
  try {
    const body = await request.json()
    targetEndDate = body.targetEndDate ?? null
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const card = await prisma.productDesignCard.findUnique({
    where: { id },
    select: { id: true, targetEndDate: true },
  })

  if (!card) {
    return NextResponse.json({ error: "Design card not found" }, { status: 404 })
  }

  const newEnd = targetEndDate ? new Date(targetEndDate) : null
  if (targetEndDate && (!newEnd || isNaN(newEnd.getTime()))) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
  }

  const updated = await prisma.productDesignCard.update({
    where: { id },
    data: { targetEndDate: newEnd },
  })

  await logAudit({
    action: "UPDATE",
    entity: "ProductDesignCard",
    entityId: id,
    field: "targetEndDate",
    oldValue: card.targetEndDate ? card.targetEndDate.toISOString() : null,
    newValue: newEnd ? newEnd.toISOString() : null,
  })

  return NextResponse.json(updated)
}
