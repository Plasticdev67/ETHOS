import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const projectId = new URL(request.url).searchParams.get("projectId")

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  // Fetch all non-labour BOM lines with their linked PO lines
  const bomLines = await prisma.designBomLine.findMany({
    where: {
      designCard: { projectId },
      category: { not: "LABOUR" },
    },
    include: {
      purchaseOrderLines: {
        include: {
          purchaseOrder: {
            select: { poNumber: true, status: true },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  })

  const items = bomLines.map((line) => {
    const linkedPoLine = line.purchaseOrderLines[0] // take the first linked PO line
    const isPurchased = line.purchaseOrderLines.length > 0

    return {
      bomLineId: line.id,
      description: line.description,
      partNumber: line.partNumber,
      supplier: line.supplier,
      qty: Number(line.quantity),
      unit: line.unit,
      unitCost: Number(line.unitCost),
      totalCost: Number(line.quantity) * Number(line.unitCost),
      status: isPurchased ? ("purchased" as const) : ("unpurchased" as const),
      poNumber: linkedPoLine?.purchaseOrder.poNumber ?? null,
      poStatus: linkedPoLine?.purchaseOrder.status ?? null,
    }
  })

  const purchased = items.filter((i) => i.status === "purchased").length
  const unpurchased = items.filter((i) => i.status === "unpurchased").length

  return NextResponse.json({
    total: items.length,
    purchased,
    unpurchased,
    items,
  })
}
