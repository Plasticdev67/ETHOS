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

  try {
    const { id } = await params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.email !== undefined) data.email = body.email
    if (body.role !== undefined) data.role = body.role

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
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

  try {
    const { id } = await params

    // Check if user has any assignments
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            coordinatedProjects: true,
            designedProducts: true,
            coordinatedProducts: true,
          },
        },
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const totalAssignments =
      targetUser._count.coordinatedProjects +
      targetUser._count.designedProducts +
      targetUser._count.coordinatedProducts

    if (totalAssignments > 0) {
      return NextResponse.json(
        { error: `Cannot delete — this user is assigned to ${totalAssignments} projects/products. Reassign them first.` },
        { status: 400 }
      )
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}
