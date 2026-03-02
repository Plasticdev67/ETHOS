import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

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

    // Get all active accounts
    const accounts = await prisma.account.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    })

    const accountIds = accounts.map((a) => a.id)

    // Get posted journal lines within date range
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

    // Build trial balance
    const trialBalance = accounts
      .map((account) => {
        const balances = balancesByAccount[account.id]
        if (!balances) return null

        const totalDebit = Math.round(balances.totalDebit * 100) / 100
        const totalCredit = Math.round(balances.totalCredit * 100) / 100
        const net = totalDebit - totalCredit

        // Place in debit or credit column based on net balance
        let debitBalance = 0
        let creditBalance = 0

        if (net > 0) {
          debitBalance = Math.round(net * 100) / 100
        } else if (net < 0) {
          creditBalance = Math.round(Math.abs(net) * 100) / 100
        } else {
          return null // Skip zero balances
        }

        return {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          totalDebit,
          totalCredit,
          debitBalance,
          creditBalance,
        }
      })
      .filter(Boolean)

    const totalDebits = Math.round(
      trialBalance.reduce((sum, tb) => sum + (tb?.debitBalance || 0), 0) * 100
    ) / 100
    const totalCredits = Math.round(
      trialBalance.reduce((sum, tb) => sum + (tb?.creditBalance || 0), 0) * 100
    ) / 100

    return NextResponse.json({
      period: {
        from: startDate,
        to: endDate,
      },
      accounts: trialBalance,
      totals: {
        debit: totalDebits,
        credit: totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
        difference: Math.round((totalDebits - totalCredits) * 100) / 100,
      },
    })
  } catch (error) {
    console.error("Failed to generate trial balance:", error)
    return NextResponse.json(
      { error: "Failed to generate trial balance" },
      { status: 500 }
    )
  }
}
