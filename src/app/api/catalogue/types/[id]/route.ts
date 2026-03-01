import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const type = await (prisma.productType as any).findUnique({
    where: { id },
    include: {
      family: true,
      variants: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { baseBomItems: true } },
        },
      },
      specFields: {
        orderBy: { sortOrder: "asc" },
        include: {
          choices: { orderBy: { sortOrder: "asc" } },
          dependencies: true,
        },
      },
    },
  })

  if (!type) {
    return NextResponse.json({ error: "Type not found" }, { status: 404 })
  }

  // Serialize decimals
  const serialized = JSON.parse(JSON.stringify(type))
  return NextResponse.json(serialized)
}

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

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const type = await (prisma.productType as any).update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.code !== undefined && { code: body.code }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.active !== undefined && { active: body.active }),
      },
    })

    return NextResponse.json(type)
  } catch (error) {
    console.error("PATCH /api/catalogue/types/[id] error:", error)
    return NextResponse.json({ error: "Failed to update product type" }, { status: 500 })
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.productType as any).delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/catalogue/types/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete product type" }, { status: 500 })
  }
}
