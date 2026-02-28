import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { transactionIds } = body

    if (!transactionIds?.length) {
      return NextResponse.json(
        { error: "transactionIds array is required" },
        { status: 400 }
      )
    }

    // Verify account exists
    const account = await prisma.bankAccount.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!account) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      )
    }

    // Verify all transactions belong to this account
    const transactions = await prisma.bankTransaction.findMany({
      where: {
        id: { in: transactionIds },
        bankAccountId: id,
      },
      select: { id: true },
    })

    if (transactions.length !== transactionIds.length) {
      return NextResponse.json(
        { error: "Some transactions were not found or do not belong to this account" },
        { status: 400 }
      )
    }

    // Mark transactions as reconciled
    const result = await prisma.bankTransaction.updateMany({
      where: {
        id: { in: transactionIds },
        bankAccountId: id,
      },
      data: {
        isReconciled: true,
        reconciledAt: new Date(),
      },
    })

    revalidatePath("/finance")
    return NextResponse.json({
      success: true,
      reconciledCount: result.count,
    })
  } catch (error) {
    console.error("POST /api/finance/bank/accounts/[id]/reconcile error:", error)
    return NextResponse.json(
      { error: "Failed to reconcile transactions" },
      { status: 500 }
    )
  }
}
