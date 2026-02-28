import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const processDate = body.date ? new Date(body.date) : new Date()

    // Find all active prepayments with releases due on or before the date
    const prepayments = await prisma.prepayment.findMany({
      where: {
        status: "PREP_ACTIVE",
        releases: {
          some: {
            date: { lte: processDate },
            journalEntryId: null, // Not yet processed
          },
        },
      },
      include: {
        releases: {
          where: {
            date: { lte: processDate },
            journalEntryId: null,
          },
          orderBy: { date: "asc" },
        },
      },
    })

    if (prepayments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No prepayment releases due",
        processed: 0,
        totalReleased: 0,
        details: [],
      })
    }

    const details: Array<{
      prepaymentId: string
      description: string
      releasesProcessed: number
      amountReleased: number
      journalEntryId: string
      remainingAmount: number
      newStatus: string
    }> = []

    let grandTotalReleased = 0

    const result = await prisma.$transaction(async (tx) => {
      for (const prepayment of prepayments) {
        let totalReleasedThisPrepayment = 0

        for (const release of prepayment.releases) {
          totalReleasedThisPrepayment += Number(release.amount)
        }

        totalReleasedThisPrepayment =
          Math.round(totalReleasedThisPrepayment * 100) / 100
        grandTotalReleased += totalReleasedThisPrepayment

        // Generate journal entry number
        const last = await tx.journalEntry.findFirst({
          orderBy: { entryNumber: "desc" },
          select: { entryNumber: true },
        })
        const lastNum = last
          ? parseInt(last.entryNumber.replace("JNL-", ""))
          : 0
        const entryNumber = `JNL-${String(lastNum + 1).padStart(6, "0")}`

        // Find the current period
        const period = await tx.accountingPeriod.findFirst({
          where: {
            startDate: { lte: processDate },
            endDate: { gte: processDate },
            status: "OPEN",
          },
          select: { id: true },
        })

        const amount = totalReleasedThisPrepayment.toFixed(2)

        // Create journal entry: DR target account, CR source account
        // For a prepayment release:
        //   DR Expense account (targetAccountId) — recognise the expense
        //   CR Prepayment asset (sourceAccountId) — reduce the prepayment balance
        const journalEntry = await tx.journalEntry.create({
          data: {
            entryNumber,
            date: processDate,
            postingDate: new Date(),
            description: `Prepayment release: ${prepayment.description}`,
            reference: prepayment.id,
            source: "SYSTEM",
            status: "POSTED",
            periodId: period?.id ?? null,
            totalDebit: amount,
            totalCredit: amount,
            lines: {
              create: [
                {
                  accountId: prepayment.targetAccountId,
                  description: "Prepayment release — expense recognition",
                  debit: amount,
                  credit: "0",
                },
                {
                  accountId: prepayment.sourceAccountId,
                  description: "Prepayment release — balance reduction",
                  debit: "0",
                  credit: amount,
                },
              ],
            },
          },
        })

        // Update each release with the journal entry ID
        for (const release of prepayment.releases) {
          await tx.prepaymentRelease.update({
            where: { id: release.id },
            data: { journalEntryId: journalEntry.id },
          })
        }

        // Update prepayment amounts
        const newReleasedAmount =
          Math.round(
            (Number(prepayment.releasedAmount) + totalReleasedThisPrepayment) *
              100
          ) / 100
        const newRemainingAmount =
          Math.round(
            (Number(prepayment.totalAmount) - newReleasedAmount) * 100
          ) / 100

        // Determine new status
        const isFullyReleased = newRemainingAmount <= 0
        const newStatus = isFullyReleased ? "FULLY_RELEASED" : "PREP_ACTIVE"

        await tx.prepayment.update({
          where: { id: prepayment.id },
          data: {
            releasedAmount: newReleasedAmount,
            remainingAmount: Math.max(0, newRemainingAmount),
            status: newStatus,
          },
        })

        details.push({
          prepaymentId: prepayment.id,
          description: prepayment.description,
          releasesProcessed: prepayment.releases.length,
          amountReleased: totalReleasedThisPrepayment,
          journalEntryId: journalEntry.id,
          remainingAmount: Math.max(0, newRemainingAmount),
          newStatus,
        })
      }

      return details
    })

    return NextResponse.json({
      success: true,
      processed: result.length,
      totalReleased: Math.round(grandTotalReleased * 100) / 100,
      processDate: processDate.toISOString(),
      details: result,
    })
  } catch (error) {
    console.error("Prepayment process error:", error)
    return NextResponse.json(
      { error: "Failed to process prepayment releases" },
      { status: 500 }
    )
  }
}
