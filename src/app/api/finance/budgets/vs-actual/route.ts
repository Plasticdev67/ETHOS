import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
    const periodId = searchParams.get("periodId")

    if (!year && !periodId) {
      return NextResponse.json(
        { error: "Either year or periodId query parameter is required" },
        { status: 400 }
      )
    }

    let periodStart: Date
    let periodEnd: Date

    if (periodId) {
      const period = await prisma.accountingPeriod.findUnique({
        where: { id: periodId },
      })
      if (!period) {
        return NextResponse.json(
          { error: "Accounting period not found" },
          { status: 404 }
        )
      }
      periodStart = period.startDate
      periodEnd = period.endDate
    } else {
      periodStart = new Date(`${year}-01-01`)
      periodEnd = new Date(`${year}-12-31T23:59:59.999Z`)
    }

    // Get all budget lines for the period
    const budgetLines = await prisma.budgetLine.findMany({
      where: {
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
      },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            subType: true,
          },
        },
      },
    })

    // Get unique account IDs from budget lines
    const accountIds = [...new Set(budgetLines.map((bl) => bl.accountId))]

    if (accountIds.length === 0) {
      return NextResponse.json({
        report: [],
        totals: { budgeted: 0, actual: 0, variance: 0 },
      })
    }

    // Get actual amounts from posted journal lines for those accounts
    const journalLines = await prisma.journalLine.findMany({
      where: {
        accountId: { in: accountIds },
        journal: {
          status: "POSTED",
          date: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      },
      select: {
        accountId: true,
        debit: true,
        credit: true,
      },
    })

    // Sum actuals by account
    const actualsByAccount: Record<string, { totalDebit: number; totalCredit: number }> = {}
    for (const line of journalLines) {
      if (!actualsByAccount[line.accountId]) {
        actualsByAccount[line.accountId] = { totalDebit: 0, totalCredit: 0 }
      }
      actualsByAccount[line.accountId].totalDebit += Number(line.debit)
      actualsByAccount[line.accountId].totalCredit += Number(line.credit)
    }

    // Sum budget by account
    const budgetByAccount: Record<string, number> = {}
    for (const bl of budgetLines) {
      if (!budgetByAccount[bl.accountId]) {
        budgetByAccount[bl.accountId] = 0
      }
      budgetByAccount[bl.accountId] += Number(bl.amount)
    }

    // Build report
    const report = accountIds.map((accountId) => {
      const budgetLine = budgetLines.find((bl) => bl.accountId === accountId)
      const account = budgetLine!.account
      const budgeted = budgetByAccount[accountId] || 0
      const actuals = actualsByAccount[accountId] || { totalDebit: 0, totalCredit: 0 }

      // For expense/asset accounts, actual = debits - credits
      // For revenue/liability/equity accounts, actual = credits - debits
      let actual: number
      if (account.type === "EXPENSE" || account.type === "ASSET") {
        actual = actuals.totalDebit - actuals.totalCredit
      } else {
        actual = actuals.totalCredit - actuals.totalDebit
      }

      actual = Math.round(actual * 100) / 100
      const variance = Math.round((budgeted - actual) * 100) / 100
      const variancePercent = budgeted !== 0
        ? Math.round(((budgeted - actual) / budgeted) * 10000) / 100
        : 0

      return {
        account,
        budgeted: Math.round(budgeted * 100) / 100,
        actual,
        variance,
        variancePercent,
      }
    })

    // Sort by account code
    report.sort((a, b) => a.account.code.localeCompare(b.account.code))

    const totals = report.reduce(
      (acc, r) => ({
        budgeted: acc.budgeted + r.budgeted,
        actual: acc.actual + r.actual,
        variance: acc.variance + r.variance,
      }),
      { budgeted: 0, actual: 0, variance: 0 }
    )

    return NextResponse.json({
      report,
      totals: {
        budgeted: Math.round(totals.budgeted * 100) / 100,
        actual: Math.round(totals.actual * 100) / 100,
        variance: Math.round(totals.variance * 100) / 100,
      },
    })
  } catch (error) {
    console.error("Failed to generate budget vs actual report:", error)
    return NextResponse.json(
      { error: "Failed to generate budget vs actual report" },
      { status: 500 }
    )
  }
}
