import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const asAtDate = searchParams.get("asAtDate")

    if (!asAtDate) {
      return NextResponse.json(
        { error: "asAtDate query parameter is required" },
        { status: 400 }
      )
    }

    const reportDate = new Date(asAtDate)

    // Get all balance sheet accounts (ASSET, LIABILITY, EQUITY)
    const bsAccounts = await prisma.account.findMany({
      where: {
        type: { in: ["ASSET", "LIABILITY", "EQUITY"] },
        isActive: true,
      },
      orderBy: { code: "asc" },
    })

    // Get all P&L accounts for current year earnings calculation
    const plAccounts = await prisma.account.findMany({
      where: {
        type: { in: ["REVENUE", "EXPENSE"] },
        isActive: true,
      },
    })

    const allAccountIds = [...bsAccounts, ...plAccounts].map((a) => a.id)

    // Get all posted journal lines up to the report date
    const journalLines = await prisma.journalLine.findMany({
      where: {
        accountId: { in: allAccountIds },
        journal: {
          status: "POSTED",
          date: { lte: reportDate },
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

    // Build balance sheet items
    type BSItem = {
      accountCode: string
      accountName: string
      subType: string | null
      balance: number
    }

    const assetItems: BSItem[] = []
    const liabilityItems: BSItem[] = []
    const equityItems: BSItem[] = []

    for (const account of bsAccounts) {
      const balances = balancesByAccount[account.id]
      if (!balances) continue

      let balance: number
      if (account.type === "ASSET") {
        // Assets: debits - credits
        balance = Math.round((balances.totalDebit - balances.totalCredit) * 100) / 100
      } else {
        // Liabilities & Equity: credits - debits
        balance = Math.round((balances.totalCredit - balances.totalDebit) * 100) / 100
      }

      if (balance === 0) continue

      const item: BSItem = {
        accountCode: account.code,
        accountName: account.name,
        subType: account.subType,
        balance,
      }

      if (account.type === "ASSET") assetItems.push(item)
      else if (account.type === "LIABILITY") liabilityItems.push(item)
      else equityItems.push(item)
    }

    // Calculate current year P&L for retained earnings
    // Determine fiscal year start (assume calendar year or find from periods)
    const yearStart = new Date(reportDate.getFullYear(), 0, 1)

    // Filter P&L journal lines for current year only
    const currentYearPLLines = await prisma.journalLine.findMany({
      where: {
        accountId: { in: plAccounts.map((a) => a.id) },
        journal: {
          status: "POSTED",
          date: {
            gte: yearStart,
            lte: reportDate,
          },
        },
      },
      select: {
        accountId: true,
        debit: true,
        credit: true,
      },
    })

    const plBalances: Record<string, { totalDebit: number; totalCredit: number }> = {}
    for (const line of currentYearPLLines) {
      if (!plBalances[line.accountId]) {
        plBalances[line.accountId] = { totalDebit: 0, totalCredit: 0 }
      }
      plBalances[line.accountId].totalDebit += Number(line.debit)
      plBalances[line.accountId].totalCredit += Number(line.credit)
    }

    let totalRevenue = 0
    let totalExpenses = 0

    for (const account of plAccounts) {
      const balances = plBalances[account.id]
      if (!balances) continue
      if (account.type === "REVENUE") {
        totalRevenue += balances.totalCredit - balances.totalDebit
      } else {
        totalExpenses += balances.totalDebit - balances.totalCredit
      }
    }

    const currentYearPL = Math.round((totalRevenue - totalExpenses) * 100) / 100

    // Add current year P&L to equity
    if (currentYearPL !== 0) {
      equityItems.push({
        accountCode: "CYTD",
        accountName: "Current Year Profit/Loss",
        subType: "Retained Earnings",
        balance: currentYearPL,
      })
    }

    const totalAssets = Math.round(assetItems.reduce((sum, a) => sum + a.balance, 0) * 100) / 100
    const totalLiabilities = Math.round(liabilityItems.reduce((sum, l) => sum + l.balance, 0) * 100) / 100
    const totalEquity = Math.round(equityItems.reduce((sum, e) => sum + e.balance, 0) * 100) / 100

    const balanceCheck = Math.round((totalAssets - totalLiabilities - totalEquity) * 100) / 100

    return NextResponse.json({
      asAtDate: reportDate,
      assets: {
        items: assetItems,
        total: totalAssets,
      },
      liabilities: {
        items: liabilityItems,
        total: totalLiabilities,
      },
      equity: {
        items: equityItems,
        total: totalEquity,
      },
      balanceCheck,
      isBalanced: Math.abs(balanceCheck) < 0.01,
    })
  } catch (error) {
    console.error("Failed to generate balance sheet:", error)
    return NextResponse.json(
      { error: "Failed to generate balance sheet" },
      { status: 500 }
    )
  }
}
