import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")

    const now = new Date()

    // Fetch customers with overdue invoices
    const customerWhere: Record<string, unknown> = {
      salesInvoices: {
        some: {
          status: { notIn: ["PAID"] },
          dateDue: { lt: now },
        },
      },
    }

    if (search) {
      customerWhere.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { accountCode: { contains: search, mode: "insensitive" } },
      ]
    }

    const customers = await prisma.customer.findMany({
      where: customerWhere,
      select: {
        id: true,
        name: true,
        accountCode: true,
        creditLimit: true,
        paymentTermsDays: true,
        email: true,
        phone: true,
        salesInvoices: {
          where: {
            status: { notIn: ["PAID"] },
            dateDue: { not: null },
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
          },
          orderBy: { dateDue: "asc" },
        },
        creditControlLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            action: true,
            notes: true,
            nextFollowUp: true,
            createdAt: true,
            createdBy: true,
          },
        },
      },
      orderBy: { name: "asc" },
    })

    const result = customers.map((customer) => {
      let totalOutstanding = 0
      let oldestOverdueDays = 0
      let overdueCount = 0

      for (const inv of customer.salesInvoices) {
        const amount = Number(inv.total || inv.netPayable || inv.applicationAmount || 0)
        const paid = Number(inv.paidAmount || 0)
        const outstanding = amount - paid
        if (outstanding <= 0) continue

        totalOutstanding += outstanding

        if (inv.dateDue && inv.dateDue < now) {
          overdueCount++
          const days = Math.floor(
            (now.getTime() - new Date(inv.dateDue).getTime()) / (1000 * 60 * 60 * 24)
          )
          if (days > oldestOverdueDays) oldestOverdueDays = days
        }
      }

      const lastAction = customer.creditControlLogs[0] || null

      return {
        customerId: customer.id,
        customerName: customer.name,
        accountCode: customer.accountCode,
        creditLimit: customer.creditLimit ? Number(customer.creditLimit) : null,
        email: customer.email,
        phone: customer.phone,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        overdueInvoiceCount: overdueCount,
        oldestOverdueDays,
        lastAction: lastAction
          ? {
              action: lastAction.action,
              notes: lastAction.notes,
              nextFollowUp: lastAction.nextFollowUp,
              date: lastAction.createdAt,
              by: lastAction.createdBy,
            }
          : null,
        invoices: customer.salesInvoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          total: Number(inv.total || inv.netPayable || inv.applicationAmount || 0),
          paidAmount: Number(inv.paidAmount || 0),
          outstanding:
            Number(inv.total || inv.netPayable || inv.applicationAmount || 0) -
            Number(inv.paidAmount || 0),
          dateDue: inv.dateDue,
          status: inv.status,
          daysOverdue: inv.dateDue
            ? Math.max(
                0,
                Math.floor(
                  (now.getTime() - new Date(inv.dateDue).getTime()) / (1000 * 60 * 60 * 24)
                )
              )
            : 0,
        })),
      }
    })

    // Sort by total outstanding descending
    result.sort((a, b) => b.totalOutstanding - a.totalOutstanding)

    return NextResponse.json({
      data: result,
      summary: {
        totalCustomers: result.length,
        totalOutstanding: Math.round(
          result.reduce((sum, c) => sum + c.totalOutstanding, 0) * 100
        ) / 100,
        totalOverdueInvoices: result.reduce((sum, c) => sum + c.overdueInvoiceCount, 0),
      },
    })
  } catch (error) {
    console.error("GET /api/finance/credit-control error:", error)
    return NextResponse.json(
      { error: "Failed to fetch credit control dashboard" },
      { status: 500 }
    )
  }
}
