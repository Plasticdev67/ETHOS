import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET() {
  try {
    const accounts = await prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    // Get unreconciled counts per account
    const accountsWithStats = await Promise.all(
      accounts.map(async (account) => {
        const unreconciledCount = await prisma.bankTransaction.count({
          where: {
            bankAccountId: account.id,
            isReconciled: false,
          },
        })

        return {
          ...account,
          currentBalance: Number(account.currentBalance),
          unreconciledCount,
          totalTransactions: account._count.transactions,
        }
      })
    )

    return NextResponse.json(accountsWithStats)
  } catch (error) {
    console.error("GET /api/finance/bank/accounts error:", error)
    return NextResponse.json(
      { error: "Failed to fetch bank accounts" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountName, accountNumber, sortCode, currency, accountId } = body

    if (!accountName || !accountNumber || !sortCode || !accountId) {
      return NextResponse.json(
        { error: "accountName, accountNumber, sortCode, and accountId are required" },
        { status: 400 }
      )
    }

    const account = await prisma.bankAccount.create({
      data: {
        name: accountName,
        accountNumber,
        sortCode,
        currency: currency || "GBP",
        accountId,
        currentBalance: 0,
        isActive: true,
      },
    })

    revalidatePath("/finance")
    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    console.error("POST /api/finance/bank/accounts error:", error)
    return NextResponse.json(
      { error: "Failed to create bank account" },
      { status: 500 }
    )
  }
}
