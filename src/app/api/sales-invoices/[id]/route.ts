import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}

  const stringFields = ["type", "status", "certRef", "notes"]
  const decimalFields = ["applicationAmount", "certifiedAmount", "retentionHeld", "cisDeduction", "netPayable", "paidAmount"]
  const dateFields = ["periodFrom", "periodTo", "dateSubmitted", "dateCertified", "dateDue", "datePaid"]

  stringFields.forEach((f) => { if (body[f] !== undefined) data[f] = body[f] })
  decimalFields.forEach((f) => { if (body[f] !== undefined) data[f] = body[f] ? parseFloat(body[f]) : null })
  dateFields.forEach((f) => { if (body[f] !== undefined) data[f] = body[f] ? new Date(body[f]) : null })

  // Recalculate net payable if amounts changed
  if (body.applicationAmount !== undefined || body.retentionHeld !== undefined || body.cisDeduction !== undefined) {
    const current = await prisma.salesInvoice.findUnique({ where: { id } })
    if (current) {
      const app = body.applicationAmount !== undefined ? parseFloat(body.applicationAmount) || 0 : Number(current.applicationAmount) || 0
      const ret = body.retentionHeld !== undefined ? parseFloat(body.retentionHeld) || 0 : Number(current.retentionHeld) || 0
      const cis = body.cisDeduction !== undefined ? parseFloat(body.cisDeduction) || 0 : Number(current.cisDeduction) || 0
      data.netPayable = app - ret - cis
    }
  }

  const invoice = await prisma.salesInvoice.update({ where: { id }, data })
  revalidatePath("/finance")
  return NextResponse.json(invoice)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.salesInvoice.delete({ where: { id } })
  revalidatePath("/finance")
  return NextResponse.json({ success: true })
}
