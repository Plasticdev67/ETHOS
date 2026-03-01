import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET() {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user

    const vatCodes = await prisma.vatCode.findMany({
      orderBy: { code: "asc" },
      include: {
        _count: {
          select: { journalLines: true },
        },
      },
    })

    return NextResponse.json(vatCodes)
  } catch (error) {
    console.error("VAT codes GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch VAT codes" },
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

    const { code, name, rate, isDefault, hmrcBox } = body

    if (!code || !name || rate === undefined) {
      return NextResponse.json(
        { error: "code, name, and rate are required" },
        { status: 400 }
      )
    }

    // Check for duplicate code
    const existing = await prisma.vatCode.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json(
        { error: `VAT code '${code}' already exists` },
        { status: 409 }
      )
    }

    // If setting as default, unset any existing default
    if (isDefault) {
      await prisma.vatCode.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const vatCode = await prisma.vatCode.create({
      data: {
        code,
        name,
        rate: Number(rate),
        isDefault: isDefault ?? false,
        hmrcBox: hmrcBox !== undefined ? hmrcBox : null,
      },
    })

    revalidatePath("/finance")
    return NextResponse.json(vatCode, { status: 201 })
  } catch (error) {
    console.error("VAT code POST error:", error)
    return NextResponse.json(
      { error: "Failed to create VAT code" },
      { status: 500 }
    )
  }
}
