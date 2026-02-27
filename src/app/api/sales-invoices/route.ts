import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(request: NextRequest) {
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
  const body = await request.json()

  // Auto-generate invoice number: INV-0001
  const lastInvoice = await prisma.salesInvoice.findFirst({
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  })

  let nextNum = 1
  if (lastInvoice) {
    const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }
  const invoiceNumber = `INV-${String(nextNum).padStart(4, "0")}`

  // Calculate net payable
  const applicationAmount = body.applicationAmount ? parseFloat(body.applicationAmount) : 0
  const retentionHeld = body.retentionHeld ? parseFloat(body.retentionHeld) : 0
  const cisDeduction = body.cisDeduction ? parseFloat(body.cisDeduction) : 0
  const netPayable = applicationAmount - retentionHeld - cisDeduction

  const invoice = await prisma.salesInvoice.create({
    data: {
      invoiceNumber,
      projectId: body.projectId,
      type: body.type || "APPLICATION",
      status: body.status || "DRAFT",
      applicationAmount: applicationAmount || null,
      certifiedAmount: body.certifiedAmount ? parseFloat(body.certifiedAmount) : null,
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
}
