import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const account = await prisma.bankAccount.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { date: "desc" },
          take: 50,
          include: {
            paymentAllocations: {
              include: {
                salesInvoice: {
                  select: { id: true, invoiceNumber: true },
                },
                purchaseInvoice: {
                  select: { id: true, invoiceNumber: true },
                },
              },
            },
          },
        },
      },
    })

    if (!account) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      )
    }

    // Count unreconciled
    const unreconciledCount = await prisma.bankTransaction.count({
      where: {
        bankAccountId: id,
        isReconciled: false,
      },
    })

    return NextResponse.json({
      ...account,
      currentBalance: Number(account.currentBalance),
      unreconciledCount,
    })
  } catch (error) {
    console.error("GET /api/finance/bank/accounts/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to fetch bank account" },
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

    const existing = await prisma.bankAccount.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.accountName !== undefined) updateData.name = body.accountName
    if (body.accountNumber !== undefined) updateData.accountNumber = body.accountNumber
    if (body.sortCode !== undefined) updateData.sortCode = body.sortCode
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.accountId !== undefined) updateData.accountId = body.accountId
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.currentBalance !== undefined) updateData.currentBalance = parseFloat(body.currentBalance)

    const account = await prisma.bankAccount.update({
      where: { id },
      data: updateData,
    })

    revalidatePath("/finance")
    return NextResponse.json(account)
  } catch (error) {
    console.error("PUT /api/finance/bank/accounts/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to update bank account" },
      { status: 500 }
    )
  }
}
