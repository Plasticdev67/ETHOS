import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supplierId = searchParams.get("supplierId")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10)

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (supplierId) where.supplierId = supplierId
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
      ]
    }

    const [invoices, total] = await Promise.all([
      prisma.purchaseInvoice.findMany({
        where,
        orderBy: { invoiceDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          supplier: { select: { id: true, name: true, accountCode: true } },
          _count: { select: { lines: true } },
        },
      }),
      prisma.purchaseInvoice.count({ where }),
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
    console.error("GET /api/finance/purchase-invoices error:", error)
    return NextResponse.json(
      { error: "Failed to fetch purchase invoices" },
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
    const {
      supplierId,
      invoiceNumber,
      invoiceDate,
      dueDate,
      reference,
      projectId,
      notes,
      lines,
      createdBy,
    } = body

    if (!supplierId || !invoiceNumber || !invoiceDate || !dueDate || !lines?.length) {
      return NextResponse.json(
        { error: "supplierId, invoiceNumber, invoiceDate, dueDate, and lines are required" },
        { status: 400 }
      )
    }

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

    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber,
        supplierId,
        projectId: projectId || null,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        subtotal,
        vatAmount: totalVat,
        total: totalAmount,
        status: "ACC_DRAFT",
        notes: notes || reference || null,
        createdBy: createdBy || "system",
        lines: {
          create: processedLines,
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        lines: true,
      },
    })

    revalidatePath("/finance")
    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error("POST /api/finance/purchase-invoices error:", error)
    return NextResponse.json(
      { error: "Failed to create purchase invoice" },
      { status: 500 }
    )
  }
}
