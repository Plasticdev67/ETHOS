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
    const { periodId, createdBy } = body

    if (!periodId) {
      return NextResponse.json(
        { error: "Missing required field: periodId" },
        { status: 400 }
      )
    }

    // Get the year-end period
    const period = await prisma.accountingPeriod.findUnique({
      where: { id: periodId },
    })

    if (!period) {
      return NextResponse.json(
        { error: "Accounting period not found" },
        { status: 404 }
      )
    }

    // Determine the fiscal year from the period's end date
    const yearEndDate = period.endDate
    const yearStartDate = new Date(yearEndDate.getFullYear(), 0, 1)

    // Get all periods for this fiscal year
    const periodsInYear = await prisma.accountingPeriod.findMany({
      where: {
        startDate: { gte: yearStartDate },
        endDate: { lte: yearEndDate },
      },
    })

    // Check that no periods are already locked
    const lockedPeriods = periodsInYear.filter((p) => p.status === "LOCKED")
    if (lockedPeriods.length > 0) {
      return NextResponse.json(
        { error: `${lockedPeriods.length} period(s) are already locked for this year` },
        { status: 400 }
      )
    }

    // Calculate P&L balance for the year
    // Revenue accounts (credits - debits)
    const revenueAccounts = await prisma.account.findMany({
      where: { type: "REVENUE", isActive: true },
    })
    const expenseAccounts = await prisma.account.findMany({
      where: { type: "EXPENSE", isActive: true },
    })

    const allPLAccountIds = [...revenueAccounts, ...expenseAccounts].map((a) => a.id)

    const plJournalLines = await prisma.journalLine.findMany({
      where: {
        accountId: { in: allPLAccountIds },
        journal: {
          status: "POSTED",
          date: {
            gte: yearStartDate,
            lte: yearEndDate,
          },
        },
      },
      select: {
        accountId: true,
        debit: true,
        credit: true,
      },
    })

    // Calculate balances
    const balances: Record<string, { totalDebit: number; totalCredit: number }> = {}
    for (const line of plJournalLines) {
      if (!balances[line.accountId]) {
        balances[line.accountId] = { totalDebit: 0, totalCredit: 0 }
      }
      balances[line.accountId].totalDebit += Number(line.debit)
      balances[line.accountId].totalCredit += Number(line.credit)
    }

    let totalRevenue = 0
    let totalExpenses = 0

    for (const account of revenueAccounts) {
      const bal = balances[account.id]
      if (bal) totalRevenue += bal.totalCredit - bal.totalDebit
    }

    for (const account of expenseAccounts) {
      const bal = balances[account.id]
      if (bal) totalExpenses += bal.totalDebit - bal.totalCredit
    }

    const netPL = Math.round((totalRevenue - totalExpenses) * 100) / 100

    // Find the retained earnings account (account code 3100)
    const retainedEarningsAccount = await prisma.account.findFirst({
      where: { code: "3100" },
    })

    if (!retainedEarningsAccount) {
      return NextResponse.json(
        { error: "Retained earnings account (3100) not found. Please create it first." },
        { status: 400 }
      )
    }

    // Create journal entry to transfer P&L to retained earnings
    const entryNumber = `YE-${yearEndDate.getFullYear()}`

    // Build journal lines: close each P&L account into retained earnings
    const journalLines: Array<{
      accountId: string
      description: string
      debit: number
      credit: number
    }> = []

    let totalJournalDebit = 0
    let totalJournalCredit = 0

    // Close revenue accounts (debit revenue, credit retained earnings)
    for (const account of revenueAccounts) {
      const bal = balances[account.id]
      if (!bal) continue
      const net = bal.totalCredit - bal.totalDebit
      if (Math.abs(net) < 0.01) continue

      if (net > 0) {
        journalLines.push({
          accountId: account.id,
          description: `Year-end close: ${account.name}`,
          debit: Math.round(net * 100) / 100,
          credit: 0,
        })
        totalJournalDebit += Math.round(net * 100) / 100
      } else {
        journalLines.push({
          accountId: account.id,
          description: `Year-end close: ${account.name}`,
          debit: 0,
          credit: Math.round(Math.abs(net) * 100) / 100,
        })
        totalJournalCredit += Math.round(Math.abs(net) * 100) / 100
      }
    }

    // Close expense accounts (credit expense, debit retained earnings)
    for (const account of expenseAccounts) {
      const bal = balances[account.id]
      if (!bal) continue
      const net = bal.totalDebit - bal.totalCredit
      if (Math.abs(net) < 0.01) continue

      if (net > 0) {
        journalLines.push({
          accountId: account.id,
          description: `Year-end close: ${account.name}`,
          debit: 0,
          credit: Math.round(net * 100) / 100,
        })
        totalJournalCredit += Math.round(net * 100) / 100
      } else {
        journalLines.push({
          accountId: account.id,
          description: `Year-end close: ${account.name}`,
          debit: Math.round(Math.abs(net) * 100) / 100,
          credit: 0,
        })
        totalJournalDebit += Math.round(Math.abs(net) * 100) / 100
      }
    }

    // Add retained earnings balancing entry
    if (netPL > 0) {
      // Profit: credit retained earnings
      journalLines.push({
        accountId: retainedEarningsAccount.id,
        description: `Year-end transfer: Net profit to retained earnings`,
        debit: 0,
        credit: Math.round(netPL * 100) / 100,
      })
      totalJournalCredit += Math.round(netPL * 100) / 100
    } else if (netPL < 0) {
      // Loss: debit retained earnings
      journalLines.push({
        accountId: retainedEarningsAccount.id,
        description: `Year-end transfer: Net loss to retained earnings`,
        debit: Math.round(Math.abs(netPL) * 100) / 100,
        credit: 0,
      })
      totalJournalDebit += Math.round(Math.abs(netPL) * 100) / 100
    }

    // Create the year-end journal entry
    const journalEntry = await prisma.journalEntry.create({
      data: {
        entryNumber,
        date: yearEndDate,
        periodId,
        description: `Year-end closing entry for ${yearEndDate.getFullYear()}`,
        source: "YEAR_END",
        status: "POSTED",
        totalDebit: Math.round(totalJournalDebit * 100) / 100,
        totalCredit: Math.round(totalJournalCredit * 100) / 100,
        createdBy: createdBy || "system",
        postedAt: new Date(),
        lines: {
          create: journalLines,
        },
      },
      include: {
        lines: true,
      },
    })

    // Lock all periods for the year
    const periodIds = periodsInYear.map((p) => p.id)
    await prisma.accountingPeriod.updateMany({
      where: { id: { in: periodIds } },
      data: {
        status: "LOCKED",
        closedBy: createdBy || "system",
        closedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      summary: {
        year: yearEndDate.getFullYear(),
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netProfitLoss: netPL,
        journalEntryId: journalEntry.id,
        journalEntryNumber: journalEntry.entryNumber,
        periodsLocked: periodIds.length,
        retainedEarningsAccount: retainedEarningsAccount.code,
      },
    })
  } catch (error) {
    console.error("Failed to process year-end:", error)
    return NextResponse.json(
      { error: "Failed to process year-end" },
      { status: 500 }
    )
  }
}
