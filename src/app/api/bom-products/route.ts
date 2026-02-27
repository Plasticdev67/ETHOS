import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  // Fetch all finished goods (FG-*) from BOM stock items for dropdown
  const items = await prisma.sageStockItem.findMany({
    where: {
      productGroup: { startsWith: "FG-" },
    },
    select: {
      id: true,
      stockCode: true,
      name: true,
      productFamily: true,
      productGroup: true,
      materialComposition: true,
      itemSetType: true,
      operationType: true,
    },
    orderBy: [{ productFamily: "asc" }, { name: "asc" }],
  })

  return NextResponse.json(items)
}
