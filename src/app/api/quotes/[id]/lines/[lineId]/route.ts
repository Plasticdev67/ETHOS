import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import {
  calculateCostTotal,
  calculateSellPrice,
  MINIMUM_MARGIN_FLOOR,
} from "@/lib/quote-calculations"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const { id: quoteId, lineId } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}

  if (body.description !== undefined) data.description = body.description
  if (body.dimensions !== undefined) data.dimensions = body.dimensions
  if (body.quantity !== undefined) data.quantity = parseInt(body.quantity) || 1
  if (body.units !== undefined) data.units = body.units
  if (body.isOptional !== undefined) data.isOptional = body.isOptional
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder

  // Recalculate if cost or margin changed
  if (body.unitCost !== undefined || body.marginPercent !== undefined || body.quantity !== undefined) {
    const existing = await prisma.quoteLine.findUnique({ where: { id: lineId } })
    if (!existing) {
      return NextResponse.json({ error: "Line not found" }, { status: 404 })
    }

    const unitCost = body.unitCost !== undefined ? parseFloat(body.unitCost) : Number(existing.unitCost || 0)
    const quantity = body.quantity !== undefined ? (parseInt(body.quantity) || 1) : existing.quantity
    const marginPercent = body.marginPercent !== undefined ? parseFloat(body.marginPercent) : Number(existing.marginPercent || 0)

    if (marginPercent < MINIMUM_MARGIN_FLOOR && !body.marginOverride) {
      return NextResponse.json(
        {
          error: "MARGIN_BELOW_FLOOR",
          message: `Margin ${marginPercent}% is below the ${MINIMUM_MARGIN_FLOOR}% minimum.`,
        },
        { status: 422 }
      )
    }

    const costTotal = calculateCostTotal(unitCost, quantity)
    const sellPrice = calculateSellPrice(costTotal, marginPercent)

    data.unitCost = unitCost
    data.costTotal = costTotal
    data.marginPercent = marginPercent
    data.sellPrice = sellPrice
    data.marginOverride = body.marginOverride || false
  }

  const line = await prisma.quoteLine.update({ where: { id: lineId }, data })

  await recalcQuoteTotals(quoteId)

  revalidatePath("/quotes")
  revalidatePath("/finance")

  return NextResponse.json(line)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const { id: quoteId, lineId } = await params
  await prisma.quoteLine.delete({ where: { id: lineId } })
  await recalcQuoteTotals(quoteId)

  revalidatePath("/quotes")
  revalidatePath("/finance")

  return NextResponse.json({ success: true })
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
