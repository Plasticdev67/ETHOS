import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { getNextSequenceNumber } from "@/lib/finance/sequences"
import { toDecimal } from "@/lib/api-utils"

export async function GET(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const status = searchParams.get("status")

  const where: Record<string, unknown> = {}
  if (projectId) where.projectId = projectId
  if (status) where.status = status

  const invoices = await prisma.salesInvoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { id: true, projectNumber: true, name: true, customer: { select: { name: true } } } },
    },
  })
  return NextResponse.json(invoices)
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("finance:edit")
  if (denied) return denied

  const body = await request.json()

  // Auto-generate invoice number (concurrency-safe)
  try {
    const invoiceNumber = await getNextSequenceNumber("sales_invoice")

    // Calculate net payable
    const applicationAmount = Number(toDecimal(body.applicationAmount) ?? 0)
    const retentionHeld = Number(toDecimal(body.retentionHeld) ?? 0)
    const cisDeduction = Number(toDecimal(body.cisDeduction) ?? 0)
    const netPayable = applicationAmount - retentionHeld - cisDeduction

    const invoice = await prisma.salesInvoice.create({
      data: {
        invoiceNumber,
        projectId: body.projectId,
        type: body.type || "APPLICATION",
        status: body.status || "DRAFT",
        applicationAmount: applicationAmount || null,
        certifiedAmount: toDecimal(body.certifiedAmount),
        retentionHeld: retentionHeld || null,
        cisDeduction: cisDeduction || null,
        netPayable: netPayable || null,
        periodFrom: body.periodFrom ? new Date(body.periodFrom) : null,
        periodTo: body.periodTo ? new Date(body.periodTo) : null,
        dateSubmitted: body.dateSubmitted ? new Date(body.dateSubmitted) : null,
        dateDue: body.dateDue ? new Date(body.dateDue) : null,
        certRef: body.certRef || null,
        notes: body.notes || null,
      },
    })

    revalidatePath("/finance")
    return NextResponse.json(invoice, { status: 201 })

  } catch (error) {
    console.error("POST /api/sales-invoices error:", error)
    return NextResponse.json({ error: "Failed to create sales invoice" }, { status: 500 })
  }
}
