import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const active = searchParams.get("active")

    const where: Record<string, unknown> = {}

    if (active === "true") {
      where.isActive = true
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { accountCode: { contains: search, mode: "insensitive" } },
      ]
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        accountCode: true,
        vatNumber: true,
        paymentTermsDays: true,
        isActive: true,
      },
    })

    return NextResponse.json(suppliers)
  } catch (error) {
    console.error("GET /api/finance/suppliers error:", error)
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    )
  }
}
