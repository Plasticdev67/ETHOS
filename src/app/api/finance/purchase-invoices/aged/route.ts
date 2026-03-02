import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

  try {
    const { searchParams } = new URL(request.url)
    const asAtDate = searchParams.get("asAtDate")
    const referenceDate = asAtDate ? new Date(asAtDate) : new Date()

    // Fetch all outstanding purchase invoices (not fully paid or cancelled)
    const invoices = await prisma.purchaseInvoice.findMany({
      where: {
        status: {
          notIn: ["ACC_PAID", "ACC_CANCELLED", "ACC_CREDIT_NOTE"],
        },
      },
      include: {
        supplier: {
          select: { id: true, name: true, accountCode: true },
        },
      },
      orderBy: { dueDate: "asc" },
    })

    // Group by supplier and age bucket
    const supplierMap = new Map<string, {
      supplierId: string
      supplierName: string
      accountCode: string | null
      current: number
      days30to60: number
      days60to90: number
      days90plus: number
      total: number
      invoices: Array<{
        id: string
        invoiceNumber: string
        invoiceDate: Date
        dueDate: Date
        total: number
        paidAmount: number
        outstanding: number
        daysOverdue: number
        bucket: string
      }>
    }>()

    for (const inv of invoices) {
      const outstanding = Number(inv.total) - Number(inv.paidAmount)
      if (outstanding <= 0) continue

      const daysOverdue = Math.floor(
        (referenceDate.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      )

      let bucket: string
      if (daysOverdue <= 0) {
        bucket = "current"
      } else if (daysOverdue <= 30) {
        bucket = "current"
      } else if (daysOverdue <= 60) {
        bucket = "days30to60"
      } else if (daysOverdue <= 90) {
        bucket = "days60to90"
      } else {
        bucket = "days90plus"
      }

      const key = inv.supplierId
      if (!supplierMap.has(key)) {
        supplierMap.set(key, {
          supplierId: inv.supplierId,
          supplierName: inv.supplier.name,
          accountCode: inv.supplier.accountCode,
          current: 0,
          days30to60: 0,
          days60to90: 0,
          days90plus: 0,
          total: 0,
          invoices: [],
        })
      }

      const entry = supplierMap.get(key)!
      entry[bucket as "current" | "days30to60" | "days60to90" | "days90plus"] += outstanding
      entry.total += outstanding
      entry.invoices.push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        total: Number(inv.total),
        paidAmount: Number(inv.paidAmount),
        outstanding,
        daysOverdue: Math.max(0, daysOverdue),
        bucket,
      })
    }

    const suppliers = Array.from(supplierMap.values()).sort(
      (a, b) => b.total - a.total
    )

    // Calculate grand totals
    const totals = suppliers.reduce(
      (acc, s) => ({
        current: acc.current + s.current,
        days30to60: acc.days30to60 + s.days30to60,
        days60to90: acc.days60to90 + s.days60to90,
        days90plus: acc.days90plus + s.days90plus,
        total: acc.total + s.total,
      }),
      { current: 0, days30to60: 0, days60to90: 0, days90plus: 0, total: 0 }
    )

    return NextResponse.json({
      asAtDate: referenceDate.toISOString(),
      suppliers,
      totals: {
        current: Math.round(totals.current * 100) / 100,
        days30to60: Math.round(totals.days30to60 * 100) / 100,
        days60to90: Math.round(totals.days60to90 * 100) / 100,
        days90plus: Math.round(totals.days90plus * 100) / 100,
        total: Math.round(totals.total * 100) / 100,
      },
    })
  } catch (error) {
    console.error("GET /api/finance/purchase-invoices/aged error:", error)
    return NextResponse.json(
      { error: "Failed to generate aged creditors report" },
      { status: 500 }
    )
  }
}
