import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

  try {
    const { searchParams } = new URL(request.url)
    const asAtDate = searchParams.get("asAtDate")
    const referenceDate = asAtDate ? new Date(asAtDate) : new Date()

    // Fetch all outstanding sales invoices (not fully paid or cancelled)
    const invoices = await prisma.salesInvoice.findMany({
      where: {
        status: {
          notIn: ["PAID"],
        },
        dateDue: { not: null },
        customerId: { not: null },
      },
      include: {
        customer: {
          select: { id: true, name: true, accountCode: true, creditLimit: true },
        },
      },
      orderBy: { dateDue: "asc" },
    })

    // Group by customer and age bucket
    const customerMap = new Map<string, {
      customerId: string
      customerName: string
      accountCode: string | null
      creditLimit: number | null
      current: number
      days30to60: number
      days60to90: number
      days90plus: number
      total: number
      invoices: Array<{
        id: string
        invoiceNumber: string
        dateSubmitted: Date | null
        dateDue: Date | null
        total: number
        paidAmount: number
        outstanding: number
        daysOverdue: number
        bucket: string
      }>
    }>()

    for (const inv of invoices) {
      if (!inv.customerId || !inv.customer || !inv.dateDue) continue

      const totalAmount = Number(inv.total || inv.netPayable || inv.applicationAmount || 0)
      const paidAmount = Number(inv.paidAmount || 0)
      const outstanding = totalAmount - paidAmount
      if (outstanding <= 0) continue

      const daysOverdue = Math.floor(
        (referenceDate.getTime() - new Date(inv.dateDue).getTime()) / (1000 * 60 * 60 * 24)
      )

      let bucket: string
      if (daysOverdue <= 30) {
        bucket = "current"
      } else if (daysOverdue <= 60) {
        bucket = "days30to60"
      } else if (daysOverdue <= 90) {
        bucket = "days60to90"
      } else {
        bucket = "days90plus"
      }

      const key = inv.customerId
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          customerId: inv.customerId,
          customerName: inv.customer.name,
          accountCode: inv.customer.accountCode,
          creditLimit: inv.customer.creditLimit ? Number(inv.customer.creditLimit) : null,
          current: 0,
          days30to60: 0,
          days60to90: 0,
          days90plus: 0,
          total: 0,
          invoices: [],
        })
      }

      const entry = customerMap.get(key)!
      entry[bucket as "current" | "days30to60" | "days60to90" | "days90plus"] += outstanding
      entry.total += outstanding
      entry.invoices.push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        dateSubmitted: inv.dateSubmitted,
        dateDue: inv.dateDue,
        total: totalAmount,
        paidAmount,
        outstanding,
        daysOverdue: Math.max(0, daysOverdue),
        bucket,
      })
    }

    const customers = Array.from(customerMap.values()).sort(
      (a, b) => b.total - a.total
    )

    // Calculate grand totals
    const totals = customers.reduce(
      (acc, c) => ({
        current: acc.current + c.current,
        days30to60: acc.days30to60 + c.days30to60,
        days60to90: acc.days60to90 + c.days60to90,
        days90plus: acc.days90plus + c.days90plus,
        total: acc.total + c.total,
      }),
      { current: 0, days30to60: 0, days60to90: 0, days90plus: 0, total: 0 }
    )

    return NextResponse.json({
      asAtDate: referenceDate.toISOString(),
      customers,
      totals: {
        current: Math.round(totals.current * 100) / 100,
        days30to60: Math.round(totals.days30to60 * 100) / 100,
        days60to90: Math.round(totals.days60to90 * 100) / 100,
        days90plus: Math.round(totals.days90plus * 100) / 100,
        total: Math.round(totals.total * 100) / 100,
      },
    })
  } catch (error) {
    console.error("GET /api/finance/sales-ledger/aged error:", error)
    return NextResponse.json(
      { error: "Failed to generate aged debtors report" },
      { status: 500 }
    )
  }
}
