import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

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

    // Validate the period exists
    const period = await prisma.accountingPeriod.findUnique({
      where: { id: periodId },
    })

    if (!period) {
      return NextResponse.json(
        { error: "Accounting period not found" },
        { status: 404 }
      )
    }

    // Get all posted journal entries for this period, grouped by account
    // We need revenue and expense accounts
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
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
    })

    // Group by account and calculate totals
    const accountMap = new Map<
      string,
      {
        accountId: string
        accountCode: string
        accountName: string
        accountType: string
        totalDebit: number
        totalCredit: number
        netBalance: number
      }
    >()

    for (const line of journalLines) {
      const key = line.accountId
      const existing = accountMap.get(key)

      const debit = Number(line.debit)
      const credit = Number(line.credit)

      if (existing) {
        existing.totalDebit += debit
        existing.totalCredit += credit
      } else {
        accountMap.set(key, {
          accountId: line.account.id,
          accountCode: line.account.code,
          accountName: line.account.name,
          accountType: line.account.type,
          totalDebit: debit,
          totalCredit: credit,
          netBalance: 0,
        })
      }
    }

    // Calculate net balances
    let totalRevenue = 0
    let totalExpenses = 0
    const accountBreakdown: Array<{
      accountId: string
      accountCode: string
      accountName: string
      accountType: string
      totalDebit: number
      totalCredit: number
      netBalance: number
    }> = []

    for (const [, entry] of accountMap) {
      // Revenue accounts have credit normal balance
      // Expense accounts have debit normal balance
      if (entry.accountType === "REVENUE") {
        entry.netBalance = entry.totalCredit - entry.totalDebit
        totalRevenue += entry.netBalance
      } else if (entry.accountType === "EXPENSE") {
        entry.netBalance = entry.totalDebit - entry.totalCredit
        totalExpenses += entry.netBalance
      }

      // Round to 2 decimal places
      entry.totalDebit = Math.round(entry.totalDebit * 100) / 100
      entry.totalCredit = Math.round(entry.totalCredit * 100) / 100
      entry.netBalance = Math.round(entry.netBalance * 100) / 100

      accountBreakdown.push(entry)
    }

    // Sort by account code
    accountBreakdown.sort((a, b) => a.accountCode.localeCompare(b.accountCode))

    totalRevenue = Math.round(totalRevenue * 100) / 100
    totalExpenses = Math.round(totalExpenses * 100) / 100
    const profitOrLoss = Math.round((totalRevenue - totalExpenses) * 100) / 100

    return NextResponse.json({
      periodId,
      periodName: period.name,
      periodStart: period.startDate,
      periodEnd: period.endDate,
      totalRevenue,
      totalExpenses,
      profitOrLoss,
      accountBreakdown,
    })
  } catch (error) {
    console.error("Year-end preview error:", error)
    return NextResponse.json(
      { error: "Failed to calculate year-end preview" },
      { status: 500 }
    )
  }
}
