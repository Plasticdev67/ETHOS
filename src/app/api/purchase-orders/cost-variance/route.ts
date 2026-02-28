import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const projectId = new URL(request.url).searchParams.get("projectId")

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  // Fetch BOM lines that have linked PO lines (where we can compare costs)
  const bomLines = await prisma.designBomLine.findMany({
    where: {
      designCard: { projectId },
      category: { not: "LABOUR" },
      purchaseOrderLines: { some: {} },
    },
    include: {
      purchaseOrderLines: {
        select: {
          unitCost: true,
          totalCost: true,
          quantity: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  })

  let totalBomCost = 0
  let totalPoCost = 0

  const items = bomLines.map((line) => {
    const bomUnitCost = Number(line.unitCost)
    const bomQty = Number(line.quantity)
    const bomLineCost = bomUnitCost * bomQty

    // Use the first linked PO line for comparison (or average across all)
    // We take the first linked PO line as the "actual" price
    const poLine = line.purchaseOrderLines[0]
    const poUnitCost = poLine?.unitCost ? Number(poLine.unitCost) : 0
    const poQty = poLine?.quantity ?? bomQty
    const poLineCost = poLine?.totalCost ? Number(poLine.totalCost) : poUnitCost * poQty

    const variance = poLineCost - bomLineCost
    const variancePercent = bomLineCost !== 0
      ? ((poLineCost - bomLineCost) / bomLineCost) * 100
      : 0

    totalBomCost += bomLineCost
    totalPoCost += poLineCost

    return {
      bomLineId: line.id,
      description: line.description,
      partNumber: line.partNumber,
      bomQty,
      bomUnitCost,
      bomLineCost,
      poQty,
      poUnitCost,
      poLineCost,
      variance,
      variancePercent: Math.round(variancePercent * 100) / 100,
    }
  })

  const totalVariance = totalPoCost - totalBomCost
  const totalVariancePercent = totalBomCost !== 0
    ? Math.round(((totalPoCost - totalBomCost) / totalBomCost) * 10000) / 100
    : 0

  return NextResponse.json({
    items,
    totalBomCost,
    totalPoCost,
    totalVariance,
    totalVariancePercent,
  })
}
