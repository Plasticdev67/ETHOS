import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.email !== undefined) data.email = body.email
  if (body.role !== undefined) data.role = body.role

  const user = await prisma.user.update({
    where: { id },
    data,
  })

  return NextResponse.json(user)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Check if user has any assignments
  const user = await prisma.user.findUnique({
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

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const totalAssignments =
    user._count.coordinatedProjects +
    user._count.designedProducts +
    user._count.coordinatedProducts

  if (totalAssignments > 0) {
    return NextResponse.json(
      { error: `Cannot delete — this user is assigned to ${totalAssignments} projects/products. Reassign them first.` },
      { status: 400 }
    )
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
