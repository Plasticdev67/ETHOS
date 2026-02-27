import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.costCode !== undefined) data.costCode = body.costCode
  if (body.description !== undefined) data.description = body.description
  if (body.budgetAmount !== undefined) data.budgetAmount = body.budgetAmount ? parseFloat(body.budgetAmount) : null
  if (body.actualAmount !== undefined) data.actualAmount = body.actualAmount ? parseFloat(body.actualAmount) : null
  if (body.committedAmount !== undefined) data.committedAmount = body.committedAmount ? parseFloat(body.committedAmount) : null
  if (body.notes !== undefined) data.notes = body.notes

  const category = await prisma.projectCostCategory.update({ where: { id }, data })
  return NextResponse.json(category)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.projectCostCategory.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
