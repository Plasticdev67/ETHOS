import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.description !== undefined) data.description = body.description
  if (body.supplierId !== undefined) data.supplierId = body.supplierId || null
  if (body.hireStart !== undefined) data.hireStart = body.hireStart ? new Date(body.hireStart) : null
  if (body.hireEnd !== undefined) data.hireEnd = body.hireEnd ? new Date(body.hireEnd) : null
  if (body.weeklyRate !== undefined) data.weeklyRate = body.weeklyRate ? parseFloat(body.weeklyRate) : null
  if (body.totalCost !== undefined) data.totalCost = body.totalCost ? parseFloat(body.totalCost) : null
  if (body.status !== undefined) data.status = body.status
  if (body.notes !== undefined) data.notes = body.notes

  const hire = await prisma.plantHire.update({ where: { id }, data })
  return NextResponse.json(hire)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.plantHire.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
