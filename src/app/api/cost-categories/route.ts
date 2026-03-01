import { prisma } from "@/lib/db"
import { toDecimal } from "@/lib/api-utils"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const where = projectId ? { projectId } : {}

  const categories = await prisma.projectCostCategory.findMany({
    where,
    orderBy: { costCode: "asc" },
    include: {
      project: { select: { projectNumber: true, name: true } },
    },
  })
  return NextResponse.json(categories)
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("settings:admin")
  if (denied) return denied

  const body = await request.json()

  try {
    const category = await prisma.projectCostCategory.create({
      data: {
        projectId: body.projectId,
        costCode: body.costCode,
        description: body.description,
        budgetAmount: toDecimal(body.budgetAmount),
        actualAmount: toDecimal(body.actualAmount),
        committedAmount: toDecimal(body.committedAmount),
        notes: body.notes || null,
      },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error("POST /api/cost-categories error:", error)
    return NextResponse.json({ error: "Failed to create cost category" }, { status: 500 })
  }
}
