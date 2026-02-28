import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const vatCode = await prisma.vatCode.findUnique({
      where: { id },
      include: {
        _count: {
          select: { journalLines: true },
        },
      },
    })

    if (!vatCode) {
      return NextResponse.json(
        { error: "VAT code not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(vatCode)
  } catch (error) {
    console.error("VAT code GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch VAT code" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.vatCode.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "VAT code not found" },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}

    if (body.name !== undefined) data.name = body.name
    if (body.rate !== undefined) data.rate = Number(body.rate)
    if (body.hmrcBox !== undefined) data.hmrcBox = body.hmrcBox
    if (body.isActive !== undefined) data.isActive = body.isActive

    // Handle isDefault: unset others if setting this as default
    if (body.isDefault !== undefined) {
      if (body.isDefault) {
        await prisma.vatCode.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        })
      }
      data.isDefault = body.isDefault
    }

    const vatCode = await prisma.vatCode.update({
      where: { id },
      data,
    })

    revalidatePath("/finance")
    return NextResponse.json(vatCode)
  } catch (error) {
    console.error("VAT code PUT error:", error)
    return NextResponse.json(
      { error: "Failed to update VAT code" },
      { status: 500 }
    )
  }
}
