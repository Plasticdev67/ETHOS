import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const family = await (prisma.productFamily as any).findUnique({
    where: { id },
    include: {
      types: {
        orderBy: { sortOrder: "asc" },
        include: {
          variants: { orderBy: { sortOrder: "asc" } },
          _count: { select: { variants: true, specFields: true } },
        },
      },
    },
  })

  if (!family) {
    return NextResponse.json({ error: "Family not found" }, { status: 404 })
  }

  return NextResponse.json(family)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const family = await (prisma.productFamily as any).update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.code !== undefined && { code: body.code }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.active !== undefined && { active: body.active }),
    },
  })

  return NextResponse.json(family)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.productFamily as any).delete({ where: { id } })
  return NextResponse.json({ success: true })
}
