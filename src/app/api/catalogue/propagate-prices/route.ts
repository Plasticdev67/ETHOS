import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

/**
 * POST /api/catalogue/propagate-prices
 *
 * Updates all BaseBomItem.unitCost values from their linked SageStockItem.averageBuyingPrice.
 * This avoids needing a full catalogue re-sync just to push new prices into BOMs.
 */
export async function POST() {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("catalogue:edit")
  if (denied) return denied

  try {
    // Find all BaseBomItems that have a stockCode link
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bomItems = await (prisma.baseBomItem as any).findMany({
      where: { stockCode: { not: null } },
      select: { id: true, stockCode: true, unitCost: true },
    })

    if (bomItems.length === 0) {
      return NextResponse.json({
        message: "No BOM items with stock codes found. Run a catalogue sync first.",
        updated: 0,
        skipped: 0,
      })
    }

    // Get all unique stock codes
    const stockCodes = [...new Set(bomItems.map((b: { stockCode: string }) => b.stockCode))] as string[]

    // Fetch prices for all stock codes in one query
    const stockItems = await prisma.sageStockItem.findMany({
      where: { stockCode: { in: stockCodes } },
      select: { stockCode: true, averageBuyingPrice: true },
    })

    const priceMap = new Map(
      stockItems
        .filter((s) => s.averageBuyingPrice !== null)
        .map((s) => [s.stockCode, Number(s.averageBuyingPrice)])
    )

    let updated = 0
    let skipped = 0

    for (const item of bomItems) {
      const newPrice = priceMap.get(item.stockCode)
      if (newPrice !== undefined && newPrice !== Number(item.unitCost)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma.baseBomItem as any).update({
          where: { id: item.id },
          data: { unitCost: newPrice },
        })
        updated++
      } else {
        skipped++
      }
    }

    return NextResponse.json({
      message: `Price propagation complete`,
      updated,
      skipped,
      totalBomItems: bomItems.length,
      stockCodesWithPrices: priceMap.size,
    })
  } catch (error) {
    console.error("Price propagation error:", error)
    return NextResponse.json(
      { error: "Price propagation failed", details: String(error) },
      { status: 500 }
    )
  }
}
