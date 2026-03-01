import { prisma } from "@/lib/db"
import { toDecimal } from "@/lib/api-utils"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

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
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("catalogue:edit")
  if (denied) return denied

  const body = await request.json()

  try {
    const item = await prisma.productCatalogue.create({
      data: {
        partCode: body.partCode,
        description: body.description,
        classId: body.classId || "PROD",
        guideUnitCost: toDecimal(body.guideUnitCost),
        guideMarginPercent: toDecimal(body.guideMarginPercent),
        defaultUnits: body.defaultUnits || null,
      },
    })

    revalidatePath("/catalogue")
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error("POST /api/catalogue error:", error)
    return NextResponse.json({ error: "Failed to create catalogue item" }, { status: 500 })
  }
}
