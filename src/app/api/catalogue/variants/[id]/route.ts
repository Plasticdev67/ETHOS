import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variant = await (prisma.productVariant as any).findUnique({
    where: { id },
    include: {
      type: {
        include: {
          family: true,
          specFields: {
            orderBy: { sortOrder: "asc" },
            include: {
              choices: { orderBy: { sortOrder: "asc" } },
              dependencies: true,
            },
          },
        },
      },
      baseBomItems: {
        orderBy: { sortOrder: "asc" },
        include: {
          modifiers: {
            include: { choice: true },
          },
        },
      },
    },
  })

  if (!variant) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 })
  }

  const serialized = JSON.parse(JSON.stringify(variant))
  return NextResponse.json(serialized)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variant = await (prisma.productVariant as any).update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.code !== undefined && { code: body.code }),
      ...(body.defaultWidth !== undefined && { defaultWidth: body.defaultWidth }),
      ...(body.defaultHeight !== undefined && { defaultHeight: body.defaultHeight }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.active !== undefined && { active: body.active }),
    },
  })

  return NextResponse.json(variant)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.productVariant as any).delete({ where: { id } })
  return NextResponse.json({ success: true })
}
