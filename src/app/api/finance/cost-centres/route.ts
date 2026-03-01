import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET() {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user

    const costCentres = await prisma.costCentre.findMany({
      orderBy: { code: "asc" },
    })

    return NextResponse.json(costCentres)
  } catch (error) {
    console.error("Cost centres GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch cost centres" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user
    const denied = await requirePermission("finance:edit")
    if (denied) return denied

    const body = await request.json()

    const { code, name, managerId } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: "code and name are required" },
        { status: 400 }
      )
    }

    // Check for duplicate code
    const existing = await prisma.costCentre.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json(
        { error: `Cost centre code '${code}' already exists` },
        { status: 409 }
      )
    }

    const costCentre = await prisma.costCentre.create({
      data: {
        code,
        name,
        managerId: managerId || null,
      },
    })

    revalidatePath("/finance")
    return NextResponse.json(costCentre, { status: 201 })
  } catch (error) {
    console.error("Cost centre POST error:", error)
    return NextResponse.json(
      { error: "Failed to create cost centre" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user
    const denied = await requirePermission("finance:edit")
    if (denied) return denied

    const body = await request.json()

    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "id is required in request body" },
        { status: 400 }
      )
    }

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
