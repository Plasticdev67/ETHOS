import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invoice = await prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            accountCode: true,
            email: true,
            paymentTermsDays: true,
            creditLimit: true,
          },
        },
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        lines: {
          orderBy: { createdAt: "asc" },
        },
        payments: {
          orderBy: { date: "desc" },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Sales invoice not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("GET /api/finance/sales-ledger/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to fetch sales invoice" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.salesInvoice.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Sales invoice not found" },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (body.status) updateData.status = body.status
    if (body.customerId) updateData.customerId = body.customerId
    if (body.projectId !== undefined) updateData.projectId = body.projectId || null
    if (body.dateSubmitted) updateData.dateSubmitted = new Date(body.dateSubmitted)
    if (body.dateDue) updateData.dateDue = new Date(body.dateDue)
    if (body.dateCertified) updateData.dateCertified = new Date(body.dateCertified)
    if (body.datePaid) updateData.datePaid = new Date(body.datePaid)
    if (body.certifiedAmount !== undefined) updateData.certifiedAmount = body.certifiedAmount
    if (body.paidAmount !== undefined) updateData.paidAmount = body.paidAmount
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.journalEntryId !== undefined) updateData.journalEntryId = body.journalEntryId
    if (body.subtotal !== undefined) updateData.subtotal = body.subtotal
    if (body.vatAmount !== undefined) updateData.vatAmount = body.vatAmount
    if (body.total !== undefined) updateData.total = body.total
    if (body.applicationAmount !== undefined) updateData.applicationAmount = body.applicationAmount
    if (body.netPayable !== undefined) updateData.netPayable = body.netPayable
    if (body.retentionHeld !== undefined) updateData.retentionHeld = body.retentionHeld
    if (body.cisDeduction !== undefined) updateData.cisDeduction = body.cisDeduction

    const invoice = await prisma.salesInvoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true } },
        lines: true,
      },
    })

    revalidatePath("/finance")
    return NextResponse.json(invoice)
  } catch (error) {
    console.error("PUT /api/finance/sales-ledger/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to update sales invoice" },
      { status: 500 }
    )
  }
}
