import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const lines = await prisma.opportunityQuoteLine.findMany({
    where: { opportunityId: id },
    orderBy: { sortOrder: "asc" },
  })

  return NextResponse.json(lines)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  // Auto-calculate totalCost
  const quantity = body.quantity || 1
  const unitCost = parseFloat(body.unitCost) || 0
  const totalCost = quantity * unitCost

  // Get next sort order
  const maxSort = await prisma.opportunityQuoteLine.findFirst({
    where: { opportunityId: id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  })

  const line = await prisma.opportunityQuoteLine.create({
    data: {
      opportunityId: id,
      description: body.description,
      type: body.type || "PRODUCT",
      quantity,
      unitCost,
      totalCost,
      sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      classification: body.classification || "STANDARD",
      variantId: body.variantId || null,
      width: body.width || null,
      height: body.height || null,
      specSelections: body.specSelections || undefined,
      computedBom: body.computedBom || undefined,
      computedCost: body.computedCost != null ? parseFloat(String(body.computedCost)) : null,
      // Enhanced dimensions (Amendment 5)
      depth: body.depth || null,
      leafCount: body.leafCount || 1,
      openingDirection: body.openingDirection || null,
      clearOpening: body.clearOpening || null,
      structuralOpening: body.structuralOpening || null,
      estimatedWeight: body.estimatedWeight != null ? parseFloat(String(body.estimatedWeight)) : null,
      // Product configuration (Amendments 3, 4, 7, 8)
      transomeConfig: body.transomeConfig || undefined,
      ventConfig: body.ventConfig || undefined,
      lockConfig: body.lockConfig || undefined,
      finishConfig: body.finishConfig || undefined,
      featureTags: body.featureTags || undefined,
    },
  })

  // Recompute hasItoLines on the opportunity
  const itoCount = await prisma.opportunityQuoteLine.count({
    where: { opportunityId: id, classification: "INNOVATE_TO_ORDER" },
  })
  await prisma.opportunity.update({
    where: { id },
    data: { hasItoLines: itoCount > 0 },
  })

  revalidatePath("/crm")

  return NextResponse.json(JSON.parse(JSON.stringify(line)), { status: 201 })
}
