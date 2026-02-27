import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const { id, lineId } = await params
  const body = await request.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {}

  // Basic fields
  if (body.description !== undefined) data.description = body.description
  if (body.type !== undefined) data.type = body.type
  if (body.quantity !== undefined) data.quantity = parseInt(body.quantity)
  if (body.unitCost !== undefined) data.unitCost = parseFloat(body.unitCost)
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
  if (body.classification !== undefined) data.classification = body.classification

  // Product configuration fields
  if (body.variantId !== undefined) data.variantId = body.variantId || null
  if (body.width !== undefined) data.width = body.width || null
  if (body.height !== undefined) data.height = body.height || null
  if (body.depth !== undefined) data.depth = body.depth || null
  if (body.leafCount !== undefined) data.leafCount = body.leafCount || 1
  if (body.openingDirection !== undefined) data.openingDirection = body.openingDirection || null
  if (body.clearOpening !== undefined) data.clearOpening = body.clearOpening || null
  if (body.structuralOpening !== undefined) data.structuralOpening = body.structuralOpening || null
  if (body.estimatedWeight !== undefined) {
    data.estimatedWeight = body.estimatedWeight != null ? parseFloat(String(body.estimatedWeight)) : null
  }

  // JSON configuration fields
  if (body.specSelections !== undefined) data.specSelections = body.specSelections || undefined
  if (body.computedBom !== undefined) data.computedBom = body.computedBom || undefined
  if (body.computedCost !== undefined) {
    data.computedCost = body.computedCost != null ? parseFloat(String(body.computedCost)) : null
  }
  if (body.transomeConfig !== undefined) data.transomeConfig = body.transomeConfig || undefined
  if (body.ventConfig !== undefined) data.ventConfig = body.ventConfig || undefined
  if (body.lockConfig !== undefined) data.lockConfig = body.lockConfig || undefined
  if (body.finishConfig !== undefined) data.finishConfig = body.finishConfig || undefined
  if (body.featureTags !== undefined) data.featureTags = body.featureTags || undefined

  // Recalculate totalCost if quantity or unitCost changed
  if (body.quantity !== undefined || body.unitCost !== undefined) {
    const existing = await prisma.opportunityQuoteLine.findUnique({
      where: { id: lineId },
    })
    if (existing) {
      const qty = body.quantity !== undefined ? parseInt(body.quantity) : existing.quantity
      const cost = body.unitCost !== undefined ? parseFloat(body.unitCost) : Number(existing.unitCost)
      data.totalCost = qty * cost
    }
  }

  const line = await prisma.opportunityQuoteLine.update({
    where: { id: lineId },
    data,
  })

  // Recompute hasItoLines if classification changed
  if (body.classification !== undefined) {
    const itoCount = await prisma.opportunityQuoteLine.count({
      where: { opportunityId: id, classification: "INNOVATE_TO_ORDER" },
    })
    await prisma.opportunity.update({
      where: { id },
      data: { hasItoLines: itoCount > 0 },
    })
  }

  revalidatePath("/crm")

  return NextResponse.json(JSON.parse(JSON.stringify(line)))
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const { id, lineId } = await params
  await prisma.opportunityQuoteLine.delete({ where: { id: lineId } })

  // Recompute hasItoLines
  const itoCount = await prisma.opportunityQuoteLine.count({
    where: { opportunityId: id, classification: "INNOVATE_TO_ORDER" },
  })
  await prisma.opportunity.update({
    where: { id },
    data: { hasItoLines: itoCount > 0 },
  })

  revalidatePath("/crm")

  return NextResponse.json({ success: true })
}
