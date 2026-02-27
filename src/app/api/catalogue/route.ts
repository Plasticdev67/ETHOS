import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET() {
  const items = await prisma.productCatalogue.findMany({
    orderBy: { partCode: "asc" },
    include: {
      _count: { select: { products: true } },
    },
  })
  return NextResponse.json(items)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const item = await prisma.productCatalogue.create({
    data: {
      partCode: body.partCode,
      description: body.description,
      classId: body.classId || "PROD",
      guideUnitCost: body.guideUnitCost ? parseFloat(body.guideUnitCost) : null,
      guideMarginPercent: body.guideMarginPercent ? parseFloat(body.guideMarginPercent) : null,
      defaultUnits: body.defaultUnits || null,
    },
  })

  revalidatePath("/catalogue")
  return NextResponse.json(item, { status: 201 })
}
