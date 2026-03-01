import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("settings:admin")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.code !== undefined) data.code = body.code
  if (body.description !== undefined) data.description = body.description
  if (body.category !== undefined) data.category = body.category
  if (body.active !== undefined) data.active = body.active

  try {
    const code = await prisma.nominalCode.update({
      where: { id },
      data,
    })

    return NextResponse.json(code)
  } catch (error) {
    console.error("PATCH /api/nominal-codes/[id] error:", error)
    return NextResponse.json({ error: "Failed to update nominal code" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("settings:admin")
  if (denied) return denied

  const { id } = await params

  try {
    await prisma.nominalCode.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/nominal-codes/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete nominal code" }, { status: 500 })
  }
}
