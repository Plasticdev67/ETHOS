import { prisma } from "@/lib/db"
import { toDecimal } from "@/lib/api-utils"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { validateStatusTransition, checkImmutability } from "@/lib/status-guards"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

  const { id } = await params
  const invoice = await prisma.salesInvoice.findUnique({
    where: { id },
    include: {
      project: {
        select: { id: true, projectNumber: true, name: true, customer: { select: { name: true } } },
      },
    },
  })
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(invoice)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("finance:edit")
  if (denied) return denied

  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.salesInvoice.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

    // Validate status transition
    if (body.status !== undefined && body.status !== existing.status) {
      const invalid = validateStatusTransition("salesInvoice", existing.status, body.status)
      if (invalid) return invalid
    }

    // Block edits on locked invoices (only status transitions allowed)
    if (!body.status || body.status === existing.status) {
      const locked = checkImmutability("salesInvoice", existing.status)
      if (locked) return locked
    }

    const data: Record<string, unknown> = {}

    const stringFields = ["type", "status", "certRef", "notes"]
    const decimalFields = ["applicationAmount", "certifiedAmount", "retentionHeld", "cisDeduction", "netPayable", "paidAmount"]
    const dateFields = ["periodFrom", "periodTo", "dateSubmitted", "dateCertified", "dateDue", "datePaid"]

    stringFields.forEach((f) => { if (body[f] !== undefined) data[f] = body[f] })
    decimalFields.forEach((f) => { if (body[f] !== undefined) data[f] = toDecimal(body[f]) })
    dateFields.forEach((f) => { if (body[f] !== undefined) data[f] = body[f] ? new Date(body[f]) : null })

    // Recalculate net payable if amounts changed
    if (body.applicationAmount !== undefined || body.retentionHeld !== undefined || body.cisDeduction !== undefined) {
      const app = body.applicationAmount !== undefined ? Number(toDecimal(body.applicationAmount) ?? 0) : Number(existing.applicationAmount) || 0
      const ret = body.retentionHeld !== undefined ? Number(toDecimal(body.retentionHeld) ?? 0) : Number(existing.retentionHeld) || 0
      const cis = body.cisDeduction !== undefined ? Number(toDecimal(body.cisDeduction) ?? 0) : Number(existing.cisDeduction) || 0
      data.netPayable = app - ret - cis
    }

    const invoice = await prisma.salesInvoice.update({ where: { id }, data })
    revalidatePath("/finance")
    return NextResponse.json(invoice)
  } catch (error) {
    console.error("PATCH /api/sales-invoices/[id] error:", error)
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("finance:edit")
  if (denied) return denied

  try {
    const { id } = await params
    const existing = await prisma.salesInvoice.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

    const locked = checkImmutability("salesInvoice", existing.status)
    if (locked) return locked

    await prisma.salesInvoice.delete({ where: { id } })
    revalidatePath("/finance")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/sales-invoices/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 })
  }
}
