import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user
    const denied = await requirePermission("finance:edit")
    if (denied) return denied

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.costCentre.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "Cost centre not found" },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}

    if (body.code !== undefined) {
      // Check for duplicate code if changing
      if (body.code !== existing.code) {
        const duplicate = await prisma.costCentre.findUnique({
          where: { code: body.code },
        })
        if (duplicate) {
          return NextResponse.json(
            { error: `Cost centre code '${body.code}' already exists` },
            { status: 409 }
          )
        }
      }
      data.code = body.code
    }

    if (body.name !== undefined) data.name = body.name
    if (body.managerId !== undefined) data.managerId = body.managerId || null
    if (body.isActive !== undefined) data.isActive = body.isActive

    const costCentre = await prisma.costCentre.update({
      where: { id },
      data,
    })

    revalidatePath("/finance")
    return NextResponse.json(costCentre)
  } catch (error) {
    console.error("Cost centre PUT error:", error)
    return NextResponse.json(
      { error: "Failed to update cost centre" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user
    const denied = await requirePermission("finance:edit")
    if (denied) return denied

    const { id } = await params

    const existing = await prisma.costCentre.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "Cost centre not found" },
        { status: 404 }
      )
    }

    await prisma.costCentre.delete({ where: { id } })

    revalidatePath("/finance")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Cost centre DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to delete cost centre" },
      { status: 500 }
    )
  }
}
