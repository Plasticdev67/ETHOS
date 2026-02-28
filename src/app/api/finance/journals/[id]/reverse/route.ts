import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getNextSequenceNumber } from "@/lib/finance/sequences"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: true,
        period: true,
      },
    })

    if (!entry) {
      return NextResponse.json(
        { error: "Journal entry not found" },
        { status: 404 }
      )
    }

    if (entry.status !== "POSTED") {
      return NextResponse.json(
        { error: `Cannot reverse entry with status '${entry.status}'. Only POSTED entries can be reversed.` },
        { status: 400 }
      )
    }

    if (entry.period.status === "PERIOD_CLOSED") {
      return NextResponse.json(
        { error: "Cannot reverse in a closed accounting period" },
        { status: 400 }
      )
    }

    // Generate entry number for the reversing entry
    const entryNumber = await getNextSequenceNumber("journal")

    // Use a transaction: mark original as reversed, create reversing entry
    const result = await prisma.$transaction(async (tx) => {
      // Mark original as REVERSED
      await tx.journalEntry.update({
        where: { id },
        data: {
          status: "REVERSED",
          reversedBy: entryNumber,
        },
      })

      // Create reversing entry with swapped debits/credits
      const reversingEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          date: new Date(),
          postingDate: new Date(),
          periodId: entry.periodId,
          description: `Reversal of ${entry.entryNumber}: ${entry.description}`,
          reference: entry.reference,
          source: entry.source,
          reversalOf: entry.entryNumber,
          status: "POSTED",
          totalDebit: Number(entry.totalCredit),
          totalCredit: Number(entry.totalDebit),
          createdBy: "system",
          postedAt: new Date(),
          lines: {
            create: entry.lines.map((line) => ({
              accountId: line.accountId,
              description: line.description
                ? `Reversal: ${line.description}`
                : `Reversal of ${entry.entryNumber}`,
              debit: Number(line.credit),
              credit: Number(line.debit),
              vatCodeId: line.vatCodeId,
              vatAmount: line.vatAmount ? -Number(line.vatAmount) : null,
              projectId: line.projectId,
              costCentreId: line.costCentreId,
            })),
          },
        },
        include: {
          lines: {
            include: {
              account: { select: { code: true, name: true } },
            },
          },
        },
      })

      return reversingEntry
    })

    revalidatePath("/finance")
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Journal reverse error:", error)
    return NextResponse.json(
      { error: "Failed to reverse journal entry" },
      { status: 500 }
    )
  }
}
