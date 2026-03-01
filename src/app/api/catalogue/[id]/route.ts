import { prisma } from "@/lib/db"
import { toDecimal } from "@/lib/api-utils"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("catalogue:edit")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.partCode !== undefined) data.partCode = body.partCode
  if (body.description !== undefined) data.description = body.description
  if (body.classId !== undefined) data.classId = body.classId
  if (body.active !== undefined) data.active = body.active
  if (body.guideUnitCost !== undefined) data.guideUnitCost = toDecimal(body.guideUnitCost)
  if (body.guideMarginPercent !== undefined) data.guideMarginPercent = toDecimal(body.guideMarginPercent)
  if (body.defaultUnits !== undefined) data.defaultUnits = body.defaultUnits || null

  try {
    const item = await prisma.productCatalogue.update({
      where: { id },
      data,
    })

    revalidatePath("/catalogue")
    return NextResponse.json(item)
  } catch (error) {
    console.error("PATCH /api/catalogue/[id] error:", error)
    return NextResponse.json({ error: "Failed to update catalogue item" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("catalogue:edit")
  if (denied) return denied

  const { id } = await params

  try {
    await prisma.productCatalogue.delete({ where: { id } })
    revalidatePath("/catalogue")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/catalogue/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete catalogue item" }, { status: 500 })
  }
}
