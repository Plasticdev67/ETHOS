import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get("active") === "true"
  const category = searchParams.get("category")

  const where: Record<string, unknown> = {}
  if (activeOnly) where.active = true
  if (category) where.category = category

  const codes = await prisma.nominalCode.findMany({
    where,
    orderBy: { code: "asc" },
    include: {
      _count: {
        select: {
          purchaseOrderLines: true,
          plantHires: true,
          subContracts: true,
          projectCostCategories: true,
        },
      },
    },
  })
  return NextResponse.json(codes)
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("settings:admin")
  if (denied) return denied

  const body = await request.json()

  try {
    const code = await prisma.nominalCode.create({
      data: {
        code: body.code,
        description: body.description,
        category: body.category || "OTHER",
        active: body.active !== false,
      },
    })

    return NextResponse.json(code, { status: 201 })
  } catch (error) {
    console.error("POST /api/nominal-codes error:", error)
    return NextResponse.json({ error: "Failed to create nominal code" }, { status: 500 })
  }
}
