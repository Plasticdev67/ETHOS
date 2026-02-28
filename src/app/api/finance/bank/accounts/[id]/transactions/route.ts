import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const reconciled = searchParams.get("reconciled")
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10)

    // Verify account exists
    const account = await prisma.bankAccount.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!account) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      )
    }

    const where: Record<string, unknown> = {
      bankAccountId: id,
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {}
      if (dateFrom) dateFilter.gte = new Date(dateFrom)
      if (dateTo) dateFilter.lte = new Date(dateTo)
      where.date = dateFilter
    }

    if (reconciled !== null && reconciled !== undefined) {
      where.isReconciled = reconciled === "true"
    }

    const [transactions, total] = await Promise.all([
      prisma.bankTransaction.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          paymentAllocations: {
            include: {
              salesInvoice: {
                select: { id: true, invoiceNumber: true, customerId: true },
              },
              purchaseInvoice: {
                select: { id: true, invoiceNumber: true, supplierId: true },
              },
            },
          },
        },
      }),
      prisma.bankTransaction.count({ where }),
    ])

    return NextResponse.json({
      data: transactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
        balance: t.balance ? Number(t.balance) : null,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error("GET /api/finance/bank/accounts/[id]/transactions error:", error)
    return NextResponse.json(
      { error: "Failed to fetch bank transactions" },
      { status: 500 }
    )
  }
}
