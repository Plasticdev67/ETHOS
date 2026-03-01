import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

  try {
    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get("periodId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    if (!periodId && (!dateFrom || !dateTo)) {
      return NextResponse.json(
        { error: "Either periodId or both dateFrom and dateTo are required" },
        { status: 400 }
      )
    }

    let startDate: Date
    let endDate: Date

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
      startDate = period.startDate
      endDate = period.endDate
    } else {
      startDate = new Date(dateFrom!)
      endDate = new Date(dateTo!)
    }

    // Get all revenue and expense accounts
    const accounts = await prisma.account.findMany({
      where: {
        type: { in: ["REVENUE", "EXPENSE"] },
        isActive: true,
      },
      orderBy: { code: "asc" },
    })

    const accountIds = accounts.map((a) => a.id)

    // Get posted journal lines within date range for these accounts
    const journalLines = await prisma.journalLine.findMany({
      where: {
        accountId: { in: accountIds },
        journal: {
          status: "POSTED",
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      select: {
        accountId: true,
        debit: true,
        credit: true,
      },
    })

    // Sum by account
    const balancesByAccount: Record<string, { totalDebit: number; totalCredit: number }> = {}
    for (const line of journalLines) {
      if (!balancesByAccount[line.accountId]) {
        balancesByAccount[line.accountId] = { totalDebit: 0, totalCredit: 0 }
      }
      balancesByAccount[line.accountId].totalDebit += Number(line.debit)
      balancesByAccount[line.accountId].totalCredit += Number(line.credit)
    }

    // Build revenue items (credits - debits for revenue)
    const revenueItems: Array<{
      accountCode: string
      accountName: string
      subType: string | null
      balance: number
    }> = []

    const expenseItems: Array<{
      accountCode: string
      accountName: string
      subType: string | null
      balance: number
    }> = []

    for (const account of accounts) {
      const balances = balancesByAccount[account.id]
      if (!balances) continue

      if (account.type === "REVENUE") {
        // Revenue: credits - debits (positive = income)
        const balance = Math.round((balances.totalCredit - balances.totalDebit) * 100) / 100
        if (balance !== 0) {
          revenueItems.push({
            accountCode: account.code,
            accountName: account.name,
            subType: account.subType,
            balance,
          })
        }
      } else {
        // Expense: debits - credits (positive = expense)
        const balance = Math.round((balances.totalDebit - balances.totalCredit) * 100) / 100
        if (balance !== 0) {
          expenseItems.push({
            accountCode: account.code,
            accountName: account.name,
            subType: account.subType,
            balance,
          })
        }
      }
    }

    // Group by sub-type
    const revenueBySubType: Record<string, typeof revenueItems> = {}
    for (const item of revenueItems) {
      const key = item.subType || "Other Revenue"
      if (!revenueBySubType[key]) revenueBySubType[key] = []
      revenueBySubType[key].push(item)
    }

    const expenseBySubType: Record<string, typeof expenseItems> = {}
    for (const item of expenseItems) {
      const key = item.subType || "Other Expenses"
      if (!expenseBySubType[key]) expenseBySubType[key] = []
      expenseBySubType[key].push(item)
    }

    const totalRevenue = Math.round(revenueItems.reduce((sum, r) => sum + r.balance, 0) * 100) / 100
    const totalExpenses = Math.round(expenseItems.reduce((sum, e) => sum + e.balance, 0) * 100) / 100

    // Cost of sales items (sub-type containing "Cost of Sales" or "COGS")
    const costOfSalesItems = expenseItems.filter(
      (e) => e.subType && (e.subType.toLowerCase().includes("cost of sales") || e.subType.toLowerCase().includes("cogs"))
    )
    const totalCostOfSales = Math.round(costOfSalesItems.reduce((sum, c) => sum + c.balance, 0) * 100) / 100

    const grossProfit = Math.round((totalRevenue - totalCostOfSales) * 100) / 100
    const netProfit = Math.round((totalRevenue - totalExpenses) * 100) / 100

    return NextResponse.json({
      period: {
        from: startDate,
        to: endDate,
      },
      revenue: {
        items: revenueItems,
        bySubType: revenueBySubType,
        total: totalRevenue,
      },
      expenses: {
        items: expenseItems,
        bySubType: expenseBySubType,
        total: totalExpenses,
      },
      costOfSales: totalCostOfSales,
      grossProfit,
      netProfit,
    })
  } catch (error) {
    console.error("Failed to generate P&L report:", error)
    return NextResponse.json(
      { error: "Failed to generate P&L report" },
      { status: 500 }
    )
  }
}
