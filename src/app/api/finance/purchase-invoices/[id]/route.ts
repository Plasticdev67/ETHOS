import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            accountCode: true,
            email: true,
            paymentTermsDays: true,
          },
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
        { error: "Purchase invoice not found" },
        { status: 404 }
      )
    }

    // Fetch linked journal if exists
    let journal = null
    if (invoice.journalEntryId) {
      journal = await prisma.journalEntry.findUnique({
        where: { id: invoice.journalEntryId },
        include: {
          lines: {
            include: {
              account: { select: { code: true, name: true } },
            },
          },
        },
      })
    }

    return NextResponse.json({ ...invoice, journal })
  } catch (error) {
    console.error("GET /api/finance/purchase-invoices/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to fetch purchase invoice" },
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

    const existing = await prisma.purchaseInvoice.findUnique({
      where: { id },
      select: { status: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Purchase invoice not found" },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (body.invoiceDate) updateData.invoiceDate = new Date(body.invoiceDate)
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate)
    if (body.status) updateData.status = body.status
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.invoiceNumber) updateData.invoiceNumber = body.invoiceNumber
    if (body.supplierId) updateData.supplierId = body.supplierId
    if (body.projectId !== undefined) updateData.projectId = body.projectId || null
    if (body.journalEntryId !== undefined) updateData.journalEntryId = body.journalEntryId
    if (body.paidAmount !== undefined) updateData.paidAmount = body.paidAmount

    // If lines are provided, recalculate totals
    if (body.lines) {
      // Delete existing lines and recreate
      await prisma.purchaseInvoiceLine.deleteMany({ where: { invoiceId: id } })

      let subtotal = 0
      let totalVat = 0

      const processedLines = await Promise.all(
        body.lines.map(async (line: {
          description: string
          accountId?: string
          quantity: number
          unitPrice: number
          vatCodeId?: string
          projectId?: string
        }) => {
          const netAmount = line.quantity * line.unitPrice

          let vatRate = 0
          if (line.vatCodeId) {
            const vatCode = await prisma.vatCode.findUnique({
              where: { id: line.vatCodeId },
              select: { rate: true },
            })
            if (vatCode) vatRate = Number(vatCode.rate)
          }

          const vatAmount = netAmount * (vatRate / 100)
          subtotal += netAmount
          totalVat += vatAmount

          return {
            invoiceId: id,
            description: line.description,
            accountId: line.accountId || null,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            netAmount: Math.round(netAmount * 100) / 100,
            vatCodeId: line.vatCodeId || null,
            vatAmount: Math.round(vatAmount * 100) / 100,
            projectId: line.projectId || null,
          }
        })
      )

      await prisma.purchaseInvoiceLine.createMany({ data: processedLines })

      updateData.subtotal = Math.round(subtotal * 100) / 100
      updateData.vatAmount = Math.round(totalVat * 100) / 100
      updateData.total = Math.round((subtotal + totalVat) * 100) / 100
    }

    const invoice = await prisma.purchaseInvoice.update({
      where: { id },
      data: updateData,
      include: {
        supplier: { select: { id: true, name: true } },
        lines: true,
      },
    })

    revalidatePath("/finance")
    return NextResponse.json(invoice)
  } catch (error) {
    console.error("PUT /api/finance/purchase-invoices/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to update purchase invoice" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id },
      select: { status: true },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Purchase invoice not found" },
        { status: 404 }
      )
    }

    if (invoice.status !== "ACC_DRAFT") {
      return NextResponse.json(
        { error: "Only draft invoices can be deleted" },
        { status: 400 }
      )
    }

    await prisma.purchaseInvoice.delete({ where: { id } })

    revalidatePath("/finance")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/finance/purchase-invoices/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to delete purchase invoice" },
      { status: 500 }
    )
  }
}
