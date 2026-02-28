import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {}

    if (type) {
      where.type = type
    }
    if (status) {
      where.status = status
    }

    const prepayments = await prisma.prepayment.findMany({
      where,
      include: {
        releases: {
          orderBy: { date: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(prepayments)
  } catch (error) {
    console.error("Failed to fetch prepayments:", error)
    return NextResponse.json(
      { error: "Failed to fetch prepayments" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      type,
      description,
      totalAmount,
      sourceAccountId,
      targetAccountId,
      startDate,
      periods,
      journalEntryId,
      releaseFrequency,
      createdBy,
    } = body

    if (!type || !description || !totalAmount || !sourceAccountId || !targetAccountId || !startDate || !periods) {
      return NextResponse.json(
        { error: "Missing required fields: type, description, totalAmount, sourceAccountId, targetAccountId, startDate, periods" },
        { status: 400 }
      )
    }

    const total = parseFloat(totalAmount)
    const numPeriods = parseInt(periods)
    const amountPerPeriod = Math.round((total / numPeriods) * 100) / 100

    // Calculate end date based on periods (monthly)
    const start = new Date(startDate)
    const end = new Date(start)
    end.setMonth(end.getMonth() + numPeriods)

    const prepayment = await prisma.prepayment.create({
      data: {
        type,
        description,
        totalAmount: total,
        sourceAccountId,
        targetAccountId,
        startDate: start,
        endDate: end,
        releaseFrequency: releaseFrequency || "REC_MONTHLY",
        releaseAmount: amountPerPeriod,
        remainingAmount: total,
        releasedAmount: 0,
        status: "PREP_ACTIVE",
        sourceJournalId: journalEntryId || null,
        createdBy: createdBy || "system",
      },
      include: {
        releases: true,
      },
    })

    return NextResponse.json(prepayment, { status: 201 })
  } catch (error) {
    console.error("Failed to create prepayment:", error)
    return NextResponse.json(
      { error: "Failed to create prepayment" },
      { status: 500 }
    )
  }
}
