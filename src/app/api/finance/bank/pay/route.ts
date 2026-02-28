import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bankAccountId, supplierId, amount, date, reference, allocations } = body

    if (!bankAccountId || !supplierId || !amount || !date) {
      return NextResponse.json(
        { error: "bankAccountId, supplierId, amount, and date are required" },
        { status: 400 }
      )
    }

    const paymentAmount = parseFloat(amount)

    // Verify bank account exists
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      select: { id: true, name: true, currentBalance: true },
    })

    if (!bankAccount) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      )
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, name: true },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      )
    }

    // Validate allocations total
    if (allocations?.length) {
      const allocTotal = allocations.reduce(
        (sum: number, a: { amount: number }) => sum + parseFloat(String(a.amount)),
        0
      )
      if (Math.abs(allocTotal - paymentAmount) > 0.01) {
        return NextResponse.json(
          { error: `Allocations total (${allocTotal}) does not match payment amount (${paymentAmount})` },
          { status: 400 }
        )
      }
    }

    // Create bank transaction (negative for payment out)
    const transaction = await prisma.bankTransaction.create({
      data: {
        bankAccountId,
        date: new Date(date),
        description: `Payment to ${supplier.name}`,
        reference: reference || null,
        amount: -paymentAmount,
        source: "MANUAL_PAYMENT",
        paymentAllocations: allocations?.length
          ? {
              create: allocations.map((alloc: { invoiceId: string; amount: number }) => ({
                purchaseInvoiceId: alloc.invoiceId,
                amount: parseFloat(String(alloc.amount)),
                date: new Date(date),
              })),
            }
          : undefined,
      },
      include: {
        paymentAllocations: true,
      },
    })

    // Update bank account balance
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: {
        currentBalance: {
          decrement: paymentAmount,
        },
      },
    })

    // Update purchase invoice paid amounts
    if (allocations?.length) {
      for (const alloc of allocations) {
        const allocAmount = parseFloat(String(alloc.amount))

        await prisma.purchaseInvoice.update({
          where: { id: alloc.invoiceId },
          data: {
            paidAmount: {
              increment: allocAmount,
            },
          },
        })

        // Check if fully paid and update status
        const invoice = await prisma.purchaseInvoice.findUnique({
          where: { id: alloc.invoiceId },
          select: { total: true, paidAmount: true },
        })

        if (invoice) {
          const remaining = Number(invoice.total) - Number(invoice.paidAmount)
          if (remaining <= 0.01) {
            await prisma.purchaseInvoice.update({
              where: { id: alloc.invoiceId },
              data: { status: "ACC_PAID" },
            })
          } else {
            await prisma.purchaseInvoice.update({
              where: { id: alloc.invoiceId },
              data: { status: "PARTIALLY_PAID" },
            })
          }
        }
      }
    }

    revalidatePath("/finance")
    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error("POST /api/finance/bank/pay error:", error)
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    )
  }
}
