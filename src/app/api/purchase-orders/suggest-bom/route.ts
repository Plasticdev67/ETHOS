import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const projectId = new URL(request.url).searchParams.get("projectId")
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 })
  }

  // Fetch BOM lines for this project's design cards, excluding LABOUR
  const bomLines = await prisma.designBomLine.findMany({
    where: {
      designCard: { projectId },
      category: { not: "LABOUR" },
    },
    select: {
      id: true,
      description: true,
      partNumber: true,
      supplier: true,
      quantity: true,
      unit: true,
      unitCost: true,
      category: true,
    },
    orderBy: { sortOrder: "asc" },
  })

  if (bomLines.length === 0) {
    return NextResponse.json([])
  }

  // Collect part numbers to check make/buy status
  const partNumbers = bomLines
    .map((l) => l.partNumber)
    .filter((pn): pn is string => !!pn)

  const makeItems = new Set<string>()
  if (partNumbers.length > 0) {
    const sageItems = await prisma.sageStockItem.findMany({
      where: {
        stockCode: { in: partNumbers },
        defaultMake: true,
      },
      select: { stockCode: true },
    })
    for (const item of sageItems) {
      makeItems.add(item.stockCode)
    }
  }

  // Filter out in-house manufactured items
  const suggestions = bomLines
    .filter((line) => {
      if (line.partNumber && makeItems.has(line.partNumber)) return false
      return true
    })
    .map((line) => ({
      bomLineId: line.id,
      description: line.description,
      partNumber: line.partNumber,
      supplier: line.supplier,
      quantity: Number(line.quantity),
      unit: line.unit,
      unitCost: Number(line.unitCost),
      category: line.category,
    }))

  return NextResponse.json(suggestions)
}
