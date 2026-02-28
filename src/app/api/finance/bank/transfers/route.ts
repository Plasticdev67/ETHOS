import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { journalOnBankTransfer } from "@/lib/finance/auto-journal"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fromAccountId, toAccountId, amount, date, reference, description } = body

    if (!fromAccountId || !toAccountId || !amount || !date) {
      return NextResponse.json(
        { error: "fromAccountId, toAccountId, amount, and date are required" },
        { status: 400 }
      )
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json(
        { error: "Cannot transfer to the same account" },
        { status: 400 }
      )
    }

    const transferAmount = parseFloat(String(amount))
    if (transferAmount <= 0) {
      return NextResponse.json(
        { error: "Transfer amount must be positive" },
        { status: 400 }
      )
    }

    // Verify both accounts exist
    const [fromAccount, toAccount] = await Promise.all([
      prisma.bankAccount.findUnique({
        where: { id: fromAccountId },
        select: { id: true, name: true },
      }),
      prisma.bankAccount.findUnique({
        where: { id: toAccountId },
        select: { id: true, name: true },
      }),
    ])

    if (!fromAccount) {
      return NextResponse.json(
        { error: "Source bank account not found" },
        { status: 404 }
      )
    }

    if (!toAccount) {
      return NextResponse.json(
        { error: "Destination bank account not found" },
        { status: 404 }
      )
    }

    const transferDate = new Date(date)
    const transferRef = reference || `Transfer ${fromAccount.name} -> ${toAccount.name}`
    const transferDesc = description || `Transfer ${fromAccount.name} -> ${toAccount.name}`

    // Create outgoing transaction (debit on source)
    const outgoing = await prisma.bankTransaction.create({
      data: {
        bankAccountId: fromAccountId,
        date: transferDate,
        description: `Transfer to ${toAccount.name}`,
        reference: transferRef,
        amount: -transferAmount,
        source: "BANK_TRANSFER",
      },
    })

    // Create incoming transaction (credit on destination)
    const incoming = await prisma.bankTransaction.create({
      data: {
        bankAccountId: toAccountId,
        date: transferDate,
        description: `Transfer from ${fromAccount.name}`,
        reference: transferRef,
        amount: transferAmount,
        source: "BANK_TRANSFER",
      },
    })

    // Update both account balances
    await Promise.all([
      prisma.bankAccount.update({
        where: { id: fromAccountId },
        data: {
          currentBalance: {
            decrement: transferAmount,
          },
        },
      }),
      prisma.bankAccount.update({
        where: { id: toAccountId },
        data: {
          currentBalance: {
            increment: transferAmount,
          },
        },
      }),
    ])

    // Create auto-journal entry
    try {
      await journalOnBankTransfer({
        fromBankAccountId: fromAccountId,
        toBankAccountId: toAccountId,
        amount: transferAmount.toFixed(2),
        description: transferDesc,
        reference: transferRef,
        date: transferDate,
      })
    } catch (journalError) {
      console.error("Auto-journal for bank transfer failed:", journalError)
      // Non-fatal: the transfer is still recorded even if journaling fails
    }

    revalidatePath("/finance")
    return NextResponse.json(
      {
        success: true,
        outgoingTransaction: outgoing,
        incomingTransaction: incoming,
        amount: transferAmount,
        fromAccount: fromAccount.name,
        toAccount: toAccount.name,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/finance/bank/transfers error:", error)
    return NextResponse.json(
      { error: "Failed to process bank transfer" },
      { status: 500 }
    )
  }
}
