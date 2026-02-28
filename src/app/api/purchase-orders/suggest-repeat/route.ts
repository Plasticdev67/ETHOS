import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@/generated/prisma"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const bomLineId = searchParams.get("bomLineId")
  const partNumber = searchParams.get("partNumber")
  const description = searchParams.get("description")

  if (!bomLineId && !partNumber && !description) {
    return NextResponse.json(
      { error: "Provide bomLineId, partNumber, or description" },
      { status: 400 }
    )
  }

  // If bomLineId is provided, look up the BOM line to get its details
  let searchPartNumber = partNumber
  let searchDescription = description

  if (bomLineId) {
    const bomLine = await prisma.designBomLine.findUnique({
      where: { id: bomLineId },
      select: { partNumber: true, description: true },
    })
    if (!bomLine) {
      return NextResponse.json({ error: "BOM line not found" }, { status: 404 })
    }
    searchPartNumber = bomLine.partNumber || searchPartNumber
    searchDescription = bomLine.description || searchDescription
  }

  // Build the where clause to find similar PO lines
  const orConditions: Prisma.PurchaseOrderLineWhereInput[] = []

  if (searchPartNumber) {
    // Exact match on part number via linked BOM line
    orConditions.push({
      bomLine: { partNumber: searchPartNumber },
    })
    // Also match by description containing the part number
    orConditions.push({
      description: { contains: searchPartNumber, mode: "insensitive" },
    })
  }

  if (searchDescription) {
    // Fuzzy match: search for PO lines with similar descriptions
    // Split into keywords for broader matching
    const keywords = searchDescription
      .split(/[\s,\-\/]+/)
      .filter((w) => w.length > 2)
      .slice(0, 5) // limit to 5 keywords

    for (const keyword of keywords) {
      orConditions.push({
        description: { contains: keyword, mode: "insensitive" },
      })
    }
  }

  if (orConditions.length === 0) {
    return NextResponse.json({ suggestions: [] })
  }

  const poLines = await prisma.purchaseOrderLine.findMany({
    where: {
      OR: orConditions,
      unitCost: { not: null },
    },
    include: {
      purchaseOrder: {
        select: {
          poNumber: true,
          dateRaised: true,
          status: true,
          supplier: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  // Deduplicate and rank by relevance
  const suggestions = poLines.map((line) => ({
    poLineId: line.id,
    description: line.description,
    supplier: line.purchaseOrder.supplier?.name ?? "Unknown",
    unitCost: Number(line.unitCost),
    totalCost: Number(line.totalCost),
    qty: line.quantity,
    poNumber: line.purchaseOrder.poNumber,
    poStatus: line.purchaseOrder.status,
    date: line.purchaseOrder.dateRaised,
  }))

  return NextResponse.json({ suggestions })
}
