import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const prepayment = await prisma.prepayment.findUnique({
      where: { id },
      include: {
        releases: {
          orderBy: { date: "asc" },
        },
      },
    })

    if (!prepayment) {
      return NextResponse.json({ error: "Prepayment not found" }, { status: 404 })
    }

    return NextResponse.json(prepayment)
  } catch (error) {
    console.error("Failed to fetch prepayment:", error)
    return NextResponse.json(
      { error: "Failed to fetch prepayment" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.prepayment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Prepayment not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.description !== undefined) updateData.description = body.description
    if (body.status !== undefined) updateData.status = body.status

    const prepayment = await prisma.prepayment.update({
      where: { id },
      data: updateData,
      include: {
        releases: true,
      },
    })

    return NextResponse.json(prepayment)
  } catch (error) {
    console.error("Failed to update prepayment:", error)
    return NextResponse.json(
      { error: "Failed to update prepayment" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (body.action !== "release") {
      return NextResponse.json(
        { error: "Invalid action. Use action=release" },
        { status: 400 }
      )
    }

    const prepayment = await prisma.prepayment.findUnique({
      where: { id },
      include: { releases: true },
    })

    if (!prepayment) {
      return NextResponse.json({ error: "Prepayment not found" }, { status: 404 })
    }

    if (prepayment.status !== "PREP_ACTIVE") {
      return NextResponse.json(
        { error: "Prepayment is not active" },
        { status: 400 }
      )
    }

    const remaining = Number(prepayment.remainingAmount)
    const releaseAmount = Math.min(Number(prepayment.releaseAmount), remaining)

    if (releaseAmount <= 0) {
      return NextResponse.json(
        { error: "No remaining amount to release" },
        { status: 400 }
      )
    }

    const releaseDate = body.date ? new Date(body.date) : new Date()
    const newReleasedAmount = Number(prepayment.releasedAmount) + releaseAmount
    const newRemainingAmount = Math.round((remaining - releaseAmount) * 100) / 100
    const isFullyReleased = newRemainingAmount <= 0

    // Generate journal entry for the release
    const entryNumber = `PREP-${Date.now()}`
    const periodId = body.periodId

    let journalEntryId: string | null = null

    if (periodId) {
      const journalEntry = await prisma.journalEntry.create({
        data: {
          entryNumber,
          date: releaseDate,
          periodId,
          description: `Prepayment release: ${prepayment.description}`,
          source: "SYSTEM",
          sourceId: id,
          status: "POSTED",
          totalDebit: releaseAmount,
          totalCredit: releaseAmount,
          createdBy: body.createdBy || "system",
          postedAt: new Date(),
          lines: {
            create: [
              {
                accountId: prepayment.targetAccountId,
                description: `Prepayment release: ${prepayment.description}`,
                debit: releaseAmount,
                credit: 0,
              },
              {
                accountId: prepayment.sourceAccountId,
                description: `Prepayment release: ${prepayment.description}`,
                debit: 0,
                credit: releaseAmount,
              },
            ],
          },
        },
      })
      journalEntryId = journalEntry.id
    }

    // Create release and update prepayment
    const [release] = await prisma.$transaction([
      prisma.prepaymentRelease.create({
        data: {
          prepaymentId: id,
          date: releaseDate,
          amount: releaseAmount,
          journalEntryId,
        },
      }),
      prisma.prepayment.update({
        where: { id },
        data: {
          releasedAmount: newReleasedAmount,
          remainingAmount: newRemainingAmount,
          status: isFullyReleased ? "FULLY_RELEASED" : "PREP_ACTIVE",
        },
      }),
    ])

    return NextResponse.json({
      release,
      prepayment: {
        releasedAmount: newReleasedAmount,
        remainingAmount: newRemainingAmount,
        status: isFullyReleased ? "FULLY_RELEASED" : "PREP_ACTIVE",
      },
    })
  } catch (error) {
    console.error("Failed to release prepayment:", error)
    return NextResponse.json(
      { error: "Failed to release prepayment" },
      { status: 500 }
    )
  }
}
