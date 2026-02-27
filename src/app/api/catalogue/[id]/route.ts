import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.partCode !== undefined) data.partCode = body.partCode
  if (body.description !== undefined) data.description = body.description
  if (body.classId !== undefined) data.classId = body.classId
  if (body.active !== undefined) data.active = body.active
  if (body.guideUnitCost !== undefined) data.guideUnitCost = body.guideUnitCost ? parseFloat(body.guideUnitCost) : null
  if (body.guideMarginPercent !== undefined) data.guideMarginPercent = body.guideMarginPercent ? parseFloat(body.guideMarginPercent) : null
  if (body.defaultUnits !== undefined) data.defaultUnits = body.defaultUnits || null

  const item = await prisma.productCatalogue.update({
    where: { id },
    data,
  })

  revalidatePath("/catalogue")
  return NextResponse.json(item)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.productCatalogue.delete({ where: { id } })
  revalidatePath("/catalogue")
  return NextResponse.json({ success: true })
}
