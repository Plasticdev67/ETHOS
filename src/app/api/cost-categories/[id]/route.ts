import { prisma } from "@/lib/db"
import { toDecimal } from "@/lib/api-utils"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("settings:admin")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.costCode !== undefined) data.costCode = body.costCode
  if (body.description !== undefined) data.description = body.description
  if (body.budgetAmount !== undefined) data.budgetAmount = toDecimal(body.budgetAmount)
  if (body.actualAmount !== undefined) data.actualAmount = toDecimal(body.actualAmount)
  if (body.committedAmount !== undefined) data.committedAmount = toDecimal(body.committedAmount)
  if (body.notes !== undefined) data.notes = body.notes

  try {
    const category = await prisma.projectCostCategory.update({ where: { id }, data })
    return NextResponse.json(category)
  } catch (error) {
    console.error("PATCH /api/cost-categories/[id] error:", error)
    return NextResponse.json({ error: "Failed to update cost category" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("settings:admin")
  if (denied) return denied

  const { id } = await params

  try {
    await prisma.projectCostCategory.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/cost-categories/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete cost category" }, { status: 500 })
  }
}
