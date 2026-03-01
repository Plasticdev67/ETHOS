import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user

    const { id } = await params

    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        _count: {
          select: { journalLines: true },
        },
        parent: { select: { id: true, code: true, name: true } },
        children: { select: { id: true, code: true, name: true } },
      },
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    return NextResponse.json(account)
  } catch (error) {
    console.error("Account GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 }
    )
  }
}

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

    const existing = await prisma.account.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const data: Record<string, unknown> = {}

    if (body.name !== undefined) data.name = body.name
    if (body.subType !== undefined) data.subType = body.subType || null
    if (body.description !== undefined) data.description = body.description || null
    if (body.vatCode !== undefined) data.vatCode = body.vatCode || null
    if (body.parentId !== undefined) data.parentId = body.parentId || null
    if (body.isActive !== undefined) data.isActive = body.isActive

    const account = await prisma.account.update({
      where: { id },
      data,
    })

    revalidatePath("/finance")
    return NextResponse.json(account)
  } catch (error) {
    console.error("Account PUT error:", error)
    return NextResponse.json(
      { error: "Failed to update account" },
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

    const existing = await prisma.account.findUnique({
      where: { id },
      include: { _count: { select: { journalLines: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Soft delete: set isActive to false
    const account = await prisma.account.update({
      where: { id },
      data: { isActive: false },
    })

    revalidatePath("/finance")
    return NextResponse.json(account)
  } catch (error) {
    console.error("Account DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to deactivate account" },
      { status: 500 }
    )
  }
}
