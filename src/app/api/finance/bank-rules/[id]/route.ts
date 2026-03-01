import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user
    const denied = await requirePermission("finance:edit")
    if (denied) return denied

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.bankRule.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Bank rule not found" },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.matchType !== undefined) updateData.matchType = body.matchType
    if (body.matchValue !== undefined) updateData.matchValue = body.matchValue
    if (body.matchField !== undefined) updateData.matchField = body.matchField
    if (body.accountId !== undefined) updateData.accountId = body.accountId
    if (body.vatCodeId !== undefined) updateData.vatCodeId = body.vatCodeId || null
    if (body.description !== undefined) updateData.description = body.description || null
    if (body.isInflow !== undefined) updateData.isInflow = body.isInflow
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const rule = await prisma.bankRule.update({
      where: { id },
      data: updateData,
    })

    revalidatePath("/finance")
    return NextResponse.json(rule)
  } catch (error) {
    console.error("PUT /api/finance/bank-rules/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to update bank rule" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user
    const denied = await requirePermission("finance:edit")
    if (denied) return denied

    const { id } = await params

    const existing = await prisma.bankRule.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Bank rule not found" },
        { status: 404 }
      )
    }

    await prisma.bankRule.delete({ where: { id } })

    revalidatePath("/finance")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/finance/bank-rules/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to delete bank rule" },
      { status: 500 }
    )
  }
}
