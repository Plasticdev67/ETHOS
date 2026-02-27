import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.json()

  const item = await prisma.baseBomItem.create({
    data: {
      variantId: body.variantId,
      description: body.description,
      category: body.category || "MATERIALS",
      unitCost: parseFloat(body.unitCost),
      quantity: body.quantity ? parseFloat(body.quantity) : 1,
      scalesWithSize: body.scalesWithSize ?? false,
      sortOrder: body.sortOrder ?? 0,
    },
  })

  return NextResponse.json(item, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()

  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 })
  }

  const item = await prisma.baseBomItem.update({
    where: { id: body.id },
    data: {
      ...(body.description !== undefined && { description: body.description }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.unitCost !== undefined && { unitCost: parseFloat(body.unitCost) }),
      ...(body.quantity !== undefined && { quantity: parseFloat(body.quantity) }),
      ...(body.scalesWithSize !== undefined && { scalesWithSize: body.scalesWithSize }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    },
  })

  return NextResponse.json(item)
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 })
  }

  await prisma.baseBomItem.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
