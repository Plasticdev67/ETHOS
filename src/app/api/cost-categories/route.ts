import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

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
  const body = await request.json()

  const category = await prisma.projectCostCategory.create({
    data: {
      projectId: body.projectId,
      costCode: body.costCode,
      description: body.description,
      budgetAmount: body.budgetAmount ? parseFloat(body.budgetAmount) : null,
      actualAmount: body.actualAmount ? parseFloat(body.actualAmount) : null,
      committedAmount: body.committedAmount ? parseFloat(body.committedAmount) : null,
      notes: body.notes || null,
    },
  })
  return NextResponse.json(category, { status: 201 })
}
