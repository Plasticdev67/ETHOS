import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

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

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        accountCode: true,
        vatNumber: true,
        creditLimit: true,
        paymentTermsDays: true,
        isActive: true,
      },
    })

    // Convert Decimal fields to numbers for JSON serialisation
    const data = customers.map((c) => ({
      ...c,
      creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/finance/customers error:", error)
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    )
  }
}
