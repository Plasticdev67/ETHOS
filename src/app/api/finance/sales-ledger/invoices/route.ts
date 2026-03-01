import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getNextSequenceNumber } from "@/lib/finance/sequences"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const customerId = searchParams.get("customerId")
    const isCreditNote = searchParams.get("isCreditNote")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10)

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (customerId) where.customerId = customerId
    if (isCreditNote !== null && isCreditNote !== undefined) {
      where.isCreditNote = isCreditNote === "true"
    }
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
      ]
    }

    const [invoices, total] = await Promise.all([
      prisma.salesInvoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customer: { select: { id: true, name: true, accountCode: true } },
          lines: {
            orderBy: { createdAt: "asc" },
          },
          _count: { select: { lines: true } },
        },
      }),
      prisma.salesInvoice.count({ where }),
    ])

    return NextResponse.json({
      data: invoices,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error("GET /api/finance/sales-ledger/invoices error:", error)
    return NextResponse.json(
      { error: "Failed to fetch sales invoices" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user
    const denied = await requirePermission("finance:edit")
    if (denied) return denied

    const body = await request.json()
    const { customerId, issueDate, dueDate, projectId, notes, status, lines } = body

    if (!customerId || !issueDate || !dueDate || !lines?.length) {
      return NextResponse.json(
        { error: "customerId, issueDate, dueDate, and lines are required" },
        { status: 400 }
      )
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // Generate invoice number via sequence counter
    const invoiceNumber = await getNextSequenceNumber("sales_invoice")

    // Calculate line amounts and totals
    let subtotal = 0
    let totalVat = 0

    const processedLines = await Promise.all(
      lines.map(async (line: {
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

    subtotal = Math.round(subtotal * 100) / 100
    totalVat = Math.round(totalVat * 100) / 100
    const totalAmount = Math.round((subtotal + totalVat) * 100) / 100

    const invoice = await prisma.salesInvoice.create({
      data: {
        invoiceNumber,
        customerId,
        projectId: projectId || null,
        status: status === "ACC_APPROVED" ? "SUBMITTED" : "DRAFT",
        subtotal,
        vatAmount: totalVat,
        total: totalAmount,
        applicationAmount: subtotal,
        netPayable: totalAmount,
        dateSubmitted: new Date(issueDate),
        dateDue: new Date(dueDate),
        notes: notes || null,
        createdBy: "system",
        lines: {
          create: processedLines,
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        lines: true,
      },
    })

    revalidatePath("/finance")
    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error("POST /api/finance/sales-ledger/invoices error:", error)
    return NextResponse.json(
      { error: "Failed to create sales invoice" },
      { status: 500 }
    )
  }
}
