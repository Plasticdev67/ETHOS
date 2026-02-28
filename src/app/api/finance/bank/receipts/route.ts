import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { journalOnCustomerPayment } from "@/lib/finance/auto-journal"

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

    const receiptAmount = parseFloat(String(totalAmount))
    if (receiptAmount <= 0) {
      return NextResponse.json(
        { error: "Receipt amount must be positive" },
        { status: 400 }
      )
    }

    // Verify bank account exists
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      select: { id: true, name: true },
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
      if (Math.abs(allocTotal - receiptAmount) > 0.01) {
        return NextResponse.json(
          { error: `Allocations total (${allocTotal.toFixed(2)}) does not match receipt amount (${receiptAmount.toFixed(2)})` },
          { status: 400 }
        )
      }
    }

    // Determine customerId from allocations (look up the first invoice's customer)
    let customerId: string | null = null
    if (allocations?.length) {
      const firstInvoice = await prisma.salesInvoice.findUnique({
        where: { id: allocations[0].salesInvoiceId },
        select: { customerId: true },
      })
      customerId = firstInvoice?.customerId || null
    }

    // Create bank transaction (positive for receipt in)
    const transaction = await prisma.bankTransaction.create({
      data: {
        bankAccountId,
        date: new Date(date),
        description: description || "Customer Receipt",
        reference: reference || null,
        amount: receiptAmount,
        source: "MANUAL_RECEIPT",
        paymentAllocations: allocations?.length
          ? {
              create: allocations.map((alloc: { salesInvoiceId: string; amount: number }) => ({
                salesInvoiceId: alloc.salesInvoiceId,
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
          increment: receiptAmount,
        },
      },
    })

    // Update sales invoice paid amounts and statuses
    if (allocations?.length) {
      for (const alloc of allocations) {
        const allocAmount = parseFloat(String(alloc.amount))

        await prisma.salesInvoice.update({
          where: { id: alloc.salesInvoiceId },
          data: {
            paidAmount: {
              increment: allocAmount,
            },
          },
        })

        // Check if fully paid and update status
        const invoice = await prisma.salesInvoice.findUnique({
          where: { id: alloc.salesInvoiceId },
          select: { total: true, netPayable: true, applicationAmount: true, paidAmount: true },
        })

        if (invoice) {
          const invoiceTotal = Number(invoice.total || invoice.netPayable || invoice.applicationAmount || 0)
          const remaining = invoiceTotal - Number(invoice.paidAmount)
          if (remaining <= 0.01) {
            await prisma.salesInvoice.update({
              where: { id: alloc.salesInvoiceId },
              data: {
                status: "PAID",
                datePaid: new Date(date),
              },
            })
          }
        }
      }
    }

    // Create auto-journal entry
    try {
      await journalOnCustomerPayment({
        bankAccountId,
        amount: receiptAmount.toFixed(2),
        customerId: customerId || "",
        description: description || "Customer Receipt",
        reference: reference || undefined,
        date: new Date(date),
      })
    } catch (journalError) {
      console.error("Auto-journal for customer receipt failed:", journalError)
      // Non-fatal: the payment is still recorded even if journaling fails
    }

    revalidatePath("/finance")
    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error("POST /api/finance/bank/receipts error:", error)
    return NextResponse.json(
      { error: "Failed to record receipt" },
      { status: 500 }
    )
  }
}
