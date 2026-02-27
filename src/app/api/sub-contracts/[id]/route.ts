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
  if (body.description !== undefined) data.description = body.description
  if (body.supplierId !== undefined) data.supplierId = body.supplierId || null
  if (body.productId !== undefined) data.productId = body.productId || null
  if (body.agreedValue !== undefined) data.agreedValue = body.agreedValue ? parseFloat(body.agreedValue) : null
  if (body.invoicedToDate !== undefined) data.invoicedToDate = body.invoicedToDate ? parseFloat(body.invoicedToDate) : null
  if (body.status !== undefined) data.status = body.status
  if (body.notes !== undefined) data.notes = body.notes

  const sub = await prisma.subContractorWork.update({ where: { id }, data })
  revalidatePath("/finance")
  return NextResponse.json(sub)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.subContractorWork.delete({ where: { id } })
  revalidatePath("/finance")
  return NextResponse.json({ success: true })
}
