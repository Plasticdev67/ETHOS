import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bankAccountId, customerId, amount, date, reference, allocations } = body

    if (!bankAccountId || !customerId || !amount || !date) {
      return NextResponse.json(
        { error: "bankAccountId, customerId, amount, and date are required" },
        { status: 400 }
      )
    }

    const receiptAmount = parseFloat(amount)

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

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // Validate allocations total
    if (allocations?.length) {
      const allocTotal = allocations.reduce(
        (sum: number, a: { amount: number }) => sum + parseFloat(String(a.amount)),
        0
      )
      if (Math.abs(allocTotal - receiptAmount) > 0.01) {
        return NextResponse.json(
          { error: `Allocations total (${allocTotal}) does not match receipt amount (${receiptAmount})` },
          { status: 400 }
        )
      }
    }

    // Create bank transaction (positive for receipt in)
    const transaction = await prisma.bankTransaction.create({
      data: {
        bankAccountId,
        date: new Date(date),
        description: `Receipt from ${customer.name}`,
        reference: reference || null,
        amount: receiptAmount,
        source: "MANUAL_RECEIPT",
        paymentAllocations: allocations?.length
          ? {
              create: allocations.map((alloc: { invoiceId: string; amount: number }) => ({
                salesInvoiceId: alloc.invoiceId,
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

    // Update sales invoice paid amounts
    if (allocations?.length) {
      for (const alloc of allocations) {
        const allocAmount = parseFloat(String(alloc.amount))

        await prisma.salesInvoice.update({
          where: { id: alloc.invoiceId },
          data: {
            paidAmount: {
              increment: allocAmount,
            },
          },
        })

        // Check if fully paid and update status
        const invoice = await prisma.salesInvoice.findUnique({
          where: { id: alloc.invoiceId },
          select: { total: true, netPayable: true, applicationAmount: true, paidAmount: true },
        })

        if (invoice) {
          const invoiceTotal = Number(invoice.total || invoice.netPayable || invoice.applicationAmount || 0)
          const remaining = invoiceTotal - Number(invoice.paidAmount)
          if (remaining <= 0.01) {
            await prisma.salesInvoice.update({
              where: { id: alloc.invoiceId },
              data: {
                status: "PAID",
                datePaid: new Date(date),
              },
            })
          }
        }
      }
    }

    revalidatePath("/finance")
    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error("POST /api/finance/bank/receive error:", error)
    return NextResponse.json(
      { error: "Failed to record receipt" },
      { status: 500 }
    )
  }
}
