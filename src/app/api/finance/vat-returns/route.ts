import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET() {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user

    const vatReturns = await prisma.vatReturn.findMany({
      orderBy: { periodStart: "desc" },
      include: {
        period: {
          select: { id: true, name: true, startDate: true, endDate: true, status: true },
        },
      },
    })

    return NextResponse.json(vatReturns)
  } catch (error) {
    console.error("VAT returns GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch VAT returns" },
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

    const { periodId } = body

    if (!periodId) {
      return NextResponse.json(
        { error: "periodId is required" },
        { status: 400 }
      )
    }

    // Get the period
    const period = await prisma.accountingPeriod.findUnique({
      where: { id: periodId },
    })

    if (!period) {
      return NextResponse.json(
        { error: "Accounting period not found" },
        { status: 404 }
      )
    }

    // Get all posted journal lines within the period date range that have VAT codes
    const journalLines = await prisma.journalLine.findMany({
      where: {
        journal: {
          status: "POSTED",
          date: {
            gte: period.startDate,
            lte: period.endDate,
          },
        },
        vatCodeId: { not: null },
      },
      include: {
        vatCode: true,
        account: { select: { type: true } },
      },
    })

    // Calculate VAT boxes
    // Box 1: VAT due on sales and other outputs
    let box1 = 0
    // Box 2: VAT due on acquisitions from EU (set to 0 for domestic)
    const box2 = 0
    // Box 4: VAT reclaimed on purchases and other inputs
    let box4 = 0
    // Box 6: Total value of sales excluding VAT
    let box6 = 0
    // Box 7: Total value of purchases excluding VAT
    let box7 = 0
    // Box 8: Total value of supplies to EU (0 for domestic)
    const box8 = 0
    // Box 9: Total value of acquisitions from EU (0 for domestic)
    const box9 = 0

    for (const line of journalLines) {
      const vatAmount = Number(line.vatAmount || 0)
      const netAmount = Number(line.debit) - Number(line.credit)

      if (line.vatCode) {
        const hmrcBox = line.vatCode.hmrcBox

        if (hmrcBox === 1 || line.account.type === "REVENUE") {
          // Output VAT (sales)
          box1 += Math.abs(vatAmount)
          box6 += Math.abs(netAmount)
        } else if (hmrcBox === 4 || line.account.type === "EXPENSE") {
          // Input VAT (purchases)
          box4 += Math.abs(vatAmount)
          box7 += Math.abs(netAmount)
        }
      }
    }

    // Box 3: Total VAT due (box1 + box2)
    const box3 = box1 + box2
    // Box 5: Net VAT to pay/reclaim (box3 - box4)
    const box5 = box3 - box4

    const vatReturn = await prisma.vatReturn.create({
      data: {
        periodId,
        periodStart: period.startDate,
        periodEnd: period.endDate,
        box1,
        box2,
        box3,
        box4,
        box5,
        box6,
        box7,
        box8,
        box9,
        status: "CALCULATED",
      },
      include: {
        period: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
      },
    })

    revalidatePath("/finance")
    return NextResponse.json(vatReturn, { status: 201 })
  } catch (error) {
    console.error("VAT return POST error:", error)
    return NextResponse.json(
      { error: "Failed to create VAT return" },
      { status: 500 }
    )
  }
}
