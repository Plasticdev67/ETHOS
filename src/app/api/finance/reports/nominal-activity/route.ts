import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId query parameter is required" },
        { status: 400 }
      )
    }

    // Get the account details
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    })

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      )
    }

    const where: Record<string, unknown> = {
      accountId,
      journal: {
        status: "POSTED",
      },
    }

    // Add date filters to the journal relation filter
    if (dateFrom || dateTo) {
      const journalWhere: Record<string, unknown> = { status: "POSTED" }
      const dateFilter: Record<string, Date> = {}
      if (dateFrom) dateFilter.gte = new Date(dateFrom)
      if (dateTo) dateFilter.lte = new Date(dateTo)
      journalWhere.date = dateFilter
      where.journal = journalWhere
    }

    // Get all posted journal lines for this account
    const journalLines = await prisma.journalLine.findMany({
      where,
      include: {
        journal: {
          select: {
            id: true,
            entryNumber: true,
            date: true,
            description: true,
            reference: true,
            source: true,
          },
        },
      },
      orderBy: {
        journal: { date: "asc" },
      },
    })

    // Calculate running balance
    // For ASSET and EXPENSE accounts: balance = debits - credits
    // For LIABILITY, EQUITY, REVENUE accounts: balance = credits - debits
    const isDebitNormal = account.type === "ASSET" || account.type === "EXPENSE"

    let runningBalance = 0
    const activity = journalLines.map((line) => {
      const debit = Number(line.debit)
      const credit = Number(line.credit)

      if (isDebitNormal) {
        runningBalance += debit - credit
      } else {
        runningBalance += credit - debit
      }

      return {
        id: line.id,
        date: line.journal.date,
        entryNumber: line.journal.entryNumber,
        reference: line.journal.reference,
        description: line.description || line.journal.description,
        source: line.journal.source,
        debit: Math.round(debit * 100) / 100,
        credit: Math.round(credit * 100) / 100,
        balance: Math.round(runningBalance * 100) / 100,
      }
    })

    return NextResponse.json({
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
      },
      period: {
        from: dateFrom ? new Date(dateFrom) : null,
        to: dateTo ? new Date(dateTo) : null,
      },
      activity,
      summary: {
        totalDebits: Math.round(activity.reduce((sum, a) => sum + a.debit, 0) * 100) / 100,
        totalCredits: Math.round(activity.reduce((sum, a) => sum + a.credit, 0) * 100) / 100,
        closingBalance: activity.length > 0 ? activity[activity.length - 1].balance : 0,
        transactionCount: activity.length,
      },
    })
  } catch (error) {
    console.error("Failed to generate nominal activity report:", error)
    return NextResponse.json(
      { error: "Failed to generate nominal activity report" },
      { status: 500 }
    )
  }
}
