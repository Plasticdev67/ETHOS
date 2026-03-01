import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import {
  calculateCostTotal,
  calculateSellPrice,
  MINIMUM_MARGIN_FLOOR,
} from "@/lib/quote-calculations"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("quotes:edit")
  if (denied) return denied

  const { id: quoteId } = await params
  const body = await request.json()

  const quantity = parseInt(body.quantity) || 1
  const unitCost = parseFloat(body.unitCost) || 0
  const marginPercent = parseFloat(body.marginPercent) || 0

  // Margin floor check
  if (marginPercent < MINIMUM_MARGIN_FLOOR && !body.marginOverride) {
    return NextResponse.json(
      {
        error: "MARGIN_BELOW_FLOOR",
        message: `Margin ${marginPercent}% is below the ${MINIMUM_MARGIN_FLOOR}% minimum. Set marginOverride to true to proceed.`,
      },
      { status: 422 }
    )
  }

  const costTotal = calculateCostTotal(unitCost, quantity)
  const sellPrice = calculateSellPrice(costTotal, marginPercent)

  try {
    const line = await prisma.quoteLine.create({
      data: {
        quoteId,
        productId: body.productId || null,
        catalogueItemId: body.catalogueItemId || null,
        description: body.description,
        dimensions: body.dimensions || null,
        quantity,
        units: body.units || "nr",
        unitCost,
        costTotal,
        marginPercent,
        sellPrice,
        isOptional: body.isOptional || false,
        sortOrder: body.sortOrder || 0,
        marginOverride: body.marginOverride || false,
        // Create QuoteLineSpec if specConfig is provided (from cascading builder)
        ...(body.specConfig && {
          spec: {
            create: {
              variantId: body.specConfig.variantId,
              width: body.specConfig.width || null,
              height: body.specConfig.height || null,
              specSelections: body.specConfig.specSelections || {},
              computedBom: body.specConfig.computedBom || [],
              computedCost: body.specConfig.computedCost || 0,
              includesRd: body.specConfig.includesRd || false,
              rdCostAmount: body.specConfig.rdCostAmount || 0,
            },
          },
        }),
      },
    })

    await recalcQuoteTotals(quoteId)

    revalidatePath("/quotes")
    revalidatePath("/finance")

    return NextResponse.json(line, { status: 201 })

  } catch (error) {
    console.error("POST /api/quotes/[id]/lines error:", error)
    return NextResponse.json({ error: "Failed to create quote line" }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: quoteId } = await params
  const lines = await prisma.quoteLine.findMany({
    where: { quoteId },
    orderBy: [{ isOptional: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      product: { select: { partCode: true, description: true } },
      catalogueItem: { select: { partCode: true, description: true, guideUnitCost: true } },
      spec: {
        include: {
          variant: { select: { code: true, name: true, type: { select: { name: true, family: { select: { name: true } } } } } },
        },
      },
    },
  })
  return NextResponse.json(lines)
}

async function recalcQuoteTotals(quoteId: string) {
  const lines = await prisma.quoteLine.findMany({ where: { quoteId } })

  let totalCost = 0
  let totalSell = 0

  for (const line of lines) {
    if (!line.isOptional) {
      totalCost += Number(line.costTotal || 0)
      totalSell += Number(line.sellPrice || 0)
    }
  }

  const overallMargin =
    totalSell > 0 ? ((totalSell - totalCost) / totalSell) * 100 : 0

  await prisma.quote.update({
    where: { id: quoteId },
    data: { totalCost, totalSell, overallMargin },
  })
}
