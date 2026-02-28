import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
    const periodId = searchParams.get("periodId")

    const where: Record<string, unknown> = {}

    if (year) {
      const yearStart = new Date(`${year}-01-01`)
      const yearEnd = new Date(`${year}-12-31T23:59:59.999Z`)
      where.periodStart = { gte: yearStart }
      where.periodEnd = { lte: yearEnd }
    }

    if (periodId) {
      // Find the period to get its date range
      const period = await prisma.accountingPeriod.findUnique({
        where: { id: periodId },
      })
      if (period) {
        where.periodStart = { gte: period.startDate }
        where.periodEnd = { lte: period.endDate }
      }
    }

    const budgetLines = await prisma.budgetLine.findMany({
      where,
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
      orderBy: [
        { account: { code: "asc" } },
        { periodStart: "asc" },
      ],
    })

    // Group by account
    const grouped = budgetLines.reduce<Record<string, {
      account: { id: string; code: string; name: string; type: string; subType: string | null }
      lines: typeof budgetLines
      totalBudget: number
    }>>((acc, line) => {
      const key = line.accountId
      if (!acc[key]) {
        acc[key] = {
          account: line.account,
          lines: [],
          totalBudget: 0,
        }
      }
      acc[key].lines.push(line)
      acc[key].totalBudget += Number(line.amount)
      return acc
    }, {})

    return NextResponse.json({
      budgetLines,
      grouped: Object.values(grouped),
    })
  } catch (error) {
    console.error("Failed to fetch budget lines:", error)
    return NextResponse.json(
      { error: "Failed to fetch budget lines" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { accountId, periodId, amount, notes } = body

    if (!accountId || !periodId || amount === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: accountId, periodId, amount" },
        { status: 400 }
      )
    }

    // Get the period date range
    const period = await prisma.accountingPeriod.findUnique({
      where: { id: periodId },
    })

    if (!period) {
      return NextResponse.json(
        { error: "Accounting period not found" },
        { status: 404 }
      )
    }

    // Check if a budget line already exists for this account + period range
    const existing = await prisma.budgetLine.findFirst({
      where: {
        accountId,
        periodStart: period.startDate,
        periodEnd: period.endDate,
      },
    })

    let budgetLine

    if (existing) {
      // Update existing budget line
      budgetLine = await prisma.budgetLine.update({
        where: { id: existing.id },
        data: {
          amount: parseFloat(String(amount)),
          notes: notes || existing.notes,
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
    } else {
      // Create new budget line
      budgetLine = await prisma.budgetLine.create({
        data: {
          accountId,
          periodStart: period.startDate,
          periodEnd: period.endDate,
          amount: parseFloat(String(amount)),
          notes: notes || null,
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
    }

    return NextResponse.json(budgetLine, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error("Failed to create/update budget line:", error)
    return NextResponse.json(
      { error: "Failed to create/update budget line" },
      { status: 500 }
    )
  }
}
