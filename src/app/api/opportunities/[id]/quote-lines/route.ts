import { prisma } from "@/lib/db"
import { toDecimal } from "@/lib/api-utils"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

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
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("crm:edit")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()

  // Auto-calculate totalCost
  const quantity = body.quantity || 1
  const unitCost = Number(toDecimal(body.unitCost) ?? 0)
  const totalCost = quantity * unitCost

  // Get next sort order
  const maxSort = await prisma.opportunityQuoteLine.findFirst({
    where: { opportunityId: id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  })

  try {
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
        computedCost: toDecimal(body.computedCost),
        // Enhanced dimensions (Amendment 5)
        depth: body.depth || null,
        leafCount: body.leafCount || 1,
        openingDirection: body.openingDirection || null,
        clearOpening: body.clearOpening || null,
        structuralOpening: body.structuralOpening || null,
        estimatedWeight: body.estimatedWeight != null ? Number(toDecimal(body.estimatedWeight) ?? 0) : null,
        // Product configuration (Amendments 3, 4, 7, 8)
        transomeConfig: body.transomeConfig || undefined,
        ventConfig: body.ventConfig || undefined,
        lockConfig: body.lockConfig || undefined,
        finishConfig: body.finishConfig || undefined,
        featureTags: body.featureTags || undefined,
      },
    })

    // Recompute hasEtoLines on the opportunity
    const etoCount = await prisma.opportunityQuoteLine.count({
      where: { opportunityId: id, classification: "ENGINEER_TO_ORDER" },
    })
    await prisma.opportunity.update({
      where: { id },
      data: { hasEtoLines: etoCount > 0 },
    })

    revalidatePath("/crm")

    return NextResponse.json(JSON.parse(JSON.stringify(line)), { status: 201 })
  } catch (error) {
    console.error("POST /api/opportunities/[id]/quote-lines error:", error)
    return NextResponse.json({ error: "Failed to create quote line" }, { status: 500 })
  }
}
