import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.code !== undefined) data.code = body.code
  if (body.description !== undefined) data.description = body.description
  if (body.category !== undefined) data.category = body.category
  if (body.active !== undefined) data.active = body.active

  const code = await prisma.nominalCode.update({
    where: { id },
    data,
  })

  return NextResponse.json(code)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.nominalCode.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
