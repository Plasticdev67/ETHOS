import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { journalOnYearEnd } from "@/lib/finance/auto-journal"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { periodId, description } = body

    if (!periodId) {
      return NextResponse.json(
        { error: "periodId is required" },
        { status: 400 }
      )
    }

    // Validate the period exists and is open
    const period = await prisma.accountingPeriod.findUnique({
      where: { id: periodId },
    })

    if (!period) {
      return NextResponse.json(
        { error: "Accounting period not found" },
        { status: 404 }
      )
    }

    if (period.status === "PERIOD_CLOSED") {
      return NextResponse.json(
        { error: "Period is already closed" },
        { status: 400 }
      )
    }

    if (period.status === "LOCKED") {
      return NextResponse.json(
        { error: "Period is locked and cannot be closed" },
        { status: 400 }
      )
    }

    // Calculate P&L for the period from posted journal lines
    const journalLines = await prisma.journalLine.findMany({
      where: {
        journal: {
          periodId,
          status: "POSTED",
        },
        account: {
          type: { in: ["REVENUE", "EXPENSE"] },
        },
      },
      include: {
        account: {
          select: { type: true },
        },
      },
    })

    let totalRevenue = 0
    let totalExpenses = 0

    for (const line of journalLines) {
      const debit = Number(line.debit)
      const credit = Number(line.credit)

      if (line.account.type === "REVENUE") {
        totalRevenue += credit - debit
      } else if (line.account.type === "EXPENSE") {
        totalExpenses += debit - credit
      }
    }

    const profitOrLoss = totalRevenue - totalExpenses
    const profitOrLossStr = profitOrLoss.toFixed(2)

    // Create the year-end journal entry
    const journalEntryId = await journalOnYearEnd({
      periodId,
      profitOrLoss: profitOrLossStr,
      description: description || undefined,
    })

    // Close the accounting period
    const updatedPeriod = await prisma.accountingPeriod.update({
      where: { id: periodId },
      data: {
        status: "PERIOD_CLOSED",
        closedBy: "system",
        closedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      periodId: updatedPeriod.id,
      periodName: updatedPeriod.name,
      status: updatedPeriod.status,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      profitOrLoss: Math.round(profitOrLoss * 100) / 100,
      journalEntryId,
      closedAt: updatedPeriod.closedAt,
    })
  } catch (error) {
    console.error("Year-end process error:", error)
    return NextResponse.json(
      { error: "Failed to process year-end closing" },
      { status: 500 }
    )
  }
}
