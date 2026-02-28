import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        accountCode: true,
        creditLimit: true,
        paymentTermsDays: true,
        email: true,
        phone: true,
        address: true,
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // Outstanding invoices
    const outstandingInvoices = await prisma.salesInvoice.findMany({
      where: {
        customerId,
        status: { notIn: ["PAID"] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        netPayable: true,
        applicationAmount: true,
        paidAmount: true,
        dateDue: true,
        dateSubmitted: true,
        status: true,
        notes: true,
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
      },
      orderBy: { dateDue: "asc" },
    })

    // Payment history (recent paid invoices)
    const paymentHistory = await prisma.salesInvoice.findMany({
      where: {
        customerId,
        status: "PAID",
      },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        netPayable: true,
        paidAmount: true,
        dateDue: true,
        datePaid: true,
      },
      orderBy: { datePaid: "desc" },
      take: 20,
    })

    // Chasing log
    const chasingLog = await prisma.creditControlLog.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    // Calculate totals
    const now = new Date()
    let totalOutstanding = 0
    let totalOverdue = 0

    const invoicesWithAging = outstandingInvoices.map((inv) => {
      const amount = Number(inv.total || inv.netPayable || inv.applicationAmount || 0)
      const paid = Number(inv.paidAmount || 0)
      const outstanding = amount - paid

      if (outstanding > 0) totalOutstanding += outstanding

      const daysOverdue = inv.dateDue
        ? Math.max(
            0,
            Math.floor(
              (now.getTime() - new Date(inv.dateDue).getTime()) / (1000 * 60 * 60 * 24)
            )
          )
        : 0

      if (daysOverdue > 0 && outstanding > 0) totalOverdue += outstanding

      return {
        ...inv,
        total: amount,
        paidAmount: paid,
        outstanding,
        daysOverdue,
      }
    })

    // Average payment days from paid invoices
    let avgPaymentDays = 0
    const paymentDaysList = paymentHistory
      .filter((inv) => inv.dateDue && inv.datePaid)
      .map((inv) =>
        Math.floor(
          (new Date(inv.datePaid!).getTime() - new Date(inv.dateDue!).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )

    if (paymentDaysList.length > 0) {
      avgPaymentDays = Math.round(
        paymentDaysList.reduce((a, b) => a + b, 0) / paymentDaysList.length
      )
    }

    return NextResponse.json({
      customer,
      summary: {
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        totalOverdue: Math.round(totalOverdue * 100) / 100,
        creditLimit: customer.creditLimit ? Number(customer.creditLimit) : null,
        creditAvailable: customer.creditLimit
          ? Math.round((Number(customer.creditLimit) - totalOutstanding) * 100) / 100
          : null,
        overdueInvoiceCount: invoicesWithAging.filter((i) => i.daysOverdue > 0 && i.outstanding > 0).length,
        averagePaymentDays: avgPaymentDays,
        paymentTermsDays: customer.paymentTermsDays,
      },
      outstandingInvoices: invoicesWithAging,
      paymentHistory,
      chasingLog,
    })
  } catch (error) {
    console.error("GET /api/finance/credit-control/[customerId] error:", error)
    return NextResponse.json(
      { error: "Failed to fetch customer credit control detail" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params
    const body = await request.json()
    const { action, notes, nextActionDate, salesInvoiceId, contactedName, promisedDate, promisedAmount, createdBy } = body

    if (!action) {
      return NextResponse.json(
        { error: "action is required" },
        { status: 400 }
      )
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    const log = await prisma.creditControlLog.create({
      data: {
        customerId,
        action,
        notes: notes || null,
        salesInvoiceId: salesInvoiceId || null,
        contactedName: contactedName || null,
        promisedDate: promisedDate ? new Date(promisedDate) : null,
        promisedAmount: promisedAmount || null,
        nextFollowUp: nextActionDate ? new Date(nextActionDate) : null,
        createdBy: createdBy || "system",
      },
    })

    revalidatePath("/finance")
    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error("POST /api/finance/credit-control/[customerId] error:", error)
    return NextResponse.json(
      { error: "Failed to log chasing action" },
      { status: 500 }
    )
  }
}
