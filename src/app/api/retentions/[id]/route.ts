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
  if (body.retentionPercent !== undefined) data.retentionPercent = body.retentionPercent ? parseFloat(body.retentionPercent) : null
  if (body.retentionAmount !== undefined) data.retentionAmount = body.retentionAmount ? parseFloat(body.retentionAmount) : null
  if (body.releaseDate !== undefined) data.releaseDate = body.releaseDate ? new Date(body.releaseDate) : null
  if (body.status !== undefined) data.status = body.status
  if (body.notes !== undefined) data.notes = body.notes

  const retention = await prisma.retentionHoldback.update({ where: { id }, data })
  revalidatePath("/finance")
  return NextResponse.json(retention)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.retentionHoldback.delete({ where: { id } })
  revalidatePath("/finance")
  return NextResponse.json({ success: true })
}
