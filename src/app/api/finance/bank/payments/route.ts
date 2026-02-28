import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { journalOnSupplierPayment } from "@/lib/finance/auto-journal"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bankAccountId, date, reference, description, totalAmount, allocations } = body

    if (!bankAccountId || !totalAmount || !date) {
      return NextResponse.json(
        { error: "bankAccountId, totalAmount, and date are required" },
        { status: 400 }
      )
    }

    const paymentAmount = parseFloat(String(totalAmount))
    if (paymentAmount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be positive" },
        { status: 400 }
      )
    }

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

    // Validate allocations total if provided
    if (allocations?.length) {
      const allocTotal = allocations.reduce(
        (sum: number, a: { amount: number }) => sum + parseFloat(String(a.amount)),
        0
      )
      if (Math.abs(allocTotal - paymentAmount) > 0.01) {
        return NextResponse.json(
          { error: `Allocations total (${allocTotal.toFixed(2)}) does not match payment amount (${paymentAmount.toFixed(2)})` },
          { status: 400 }
        )
      }
    }

    // Determine supplierId from allocations (look up the first invoice's supplier)
    let supplierId: string | null = null
    if (allocations?.length) {
      const firstInvoice = await prisma.purchaseInvoice.findUnique({
        where: { id: allocations[0].purchaseInvoiceId },
        select: { supplierId: true },
      })
      supplierId = firstInvoice?.supplierId || null
    }

    // Create bank transaction (negative for payment out)
    const transaction = await prisma.bankTransaction.create({
      data: {
        bankAccountId,
        date: new Date(date),
        description: description || "Supplier Payment",
        reference: reference || null,
        amount: -paymentAmount,
        source: "MANUAL_PAYMENT",
        paymentAllocations: allocations?.length
          ? {
              create: allocations.map((alloc: { purchaseInvoiceId: string; amount: number }) => ({
                purchaseInvoiceId: alloc.purchaseInvoiceId,
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

    // Update purchase invoice paid amounts and statuses
    if (allocations?.length) {
      for (const alloc of allocations) {
        const allocAmount = parseFloat(String(alloc.amount))

        await prisma.purchaseInvoice.update({
          where: { id: alloc.purchaseInvoiceId },
          data: {
            paidAmount: {
              increment: allocAmount,
            },
          },
        })

        // Check if fully paid and update status
        const invoice = await prisma.purchaseInvoice.findUnique({
          where: { id: alloc.purchaseInvoiceId },
          select: { total: true, paidAmount: true },
        })

        if (invoice) {
          const remaining = Number(invoice.total) - Number(invoice.paidAmount)
          if (remaining <= 0.01) {
            await prisma.purchaseInvoice.update({
              where: { id: alloc.purchaseInvoiceId },
              data: { status: "ACC_PAID" },
            })
          } else {
            await prisma.purchaseInvoice.update({
              where: { id: alloc.purchaseInvoiceId },
              data: { status: "PARTIALLY_PAID" },
            })
          }
        }
      }
    }

    // Create auto-journal entry
    try {
      await journalOnSupplierPayment({
        bankAccountId,
        amount: paymentAmount.toFixed(2),
        supplierId: supplierId || "",
        description: description || "Supplier Payment",
        reference: reference || undefined,
        date: new Date(date),
      })
    } catch (journalError) {
      console.error("Auto-journal for supplier payment failed:", journalError)
      // Non-fatal: the payment is still recorded even if journaling fails
    }

    revalidatePath("/finance")
    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error("POST /api/finance/bank/payments error:", error)
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    )
  }
}
