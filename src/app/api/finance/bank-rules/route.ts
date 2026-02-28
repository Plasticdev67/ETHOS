import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET() {
  try {
    const rules = await prisma.bankRule.findMany({
      orderBy: [
        { priority: "desc" },
        { name: "asc" },
      ],
    })

    return NextResponse.json(rules)
  } catch (error) {
    console.error("GET /api/finance/bank-rules error:", error)
    return NextResponse.json(
      { error: "Failed to fetch bank rules" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, matchType, matchValue, accountId, vatCodeId, description, isInflow, priority, createdBy } = body

    if (!name || !matchType || !matchValue || !accountId) {
      return NextResponse.json(
        { error: "name, matchType, matchValue, and accountId are required" },
        { status: 400 }
      )
    }

    const rule = await prisma.bankRule.create({
      data: {
        name,
        matchType,
        matchValue,
        accountId,
        vatCodeId: vatCodeId || null,
        description: description || null,
        isInflow: isInflow !== undefined ? isInflow : null,
        priority: priority || 0,
        isActive: true,
        createdBy: createdBy || "system",
      },
    })

    revalidatePath("/finance")
    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    console.error("POST /api/finance/bank-rules error:", error)
    return NextResponse.json(
      { error: "Failed to create bank rule" },
      { status: 500 }
    )
  }
}
