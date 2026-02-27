import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, projectNumber: true, name: true } },
      supplier: { select: { id: true, name: true } },
      poLines: {
        orderBy: { createdAt: "asc" },
        include: { product: { select: { partCode: true, description: true } } },
      },
    },
  })
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(po)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.status !== undefined) data.status = body.status
  if (body.supplierId !== undefined) data.supplierId = body.supplierId || null
  if (body.notes !== undefined) data.notes = body.notes
  if (body.totalValue !== undefined) data.totalValue = body.totalValue ? parseFloat(body.totalValue) : null
  if (body.dateSent !== undefined) data.dateSent = body.dateSent ? new Date(body.dateSent) : null
  if (body.expectedDelivery !== undefined) data.expectedDelivery = body.expectedDelivery ? new Date(body.expectedDelivery) : null

  const po = await prisma.purchaseOrder.update({ where: { id }, data })
  revalidatePath("/finance")
  return NextResponse.json(po)
}

// Add a line to this PO
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  if (!body.description) {
    return NextResponse.json({ error: "description required" }, { status: 400 })
  }

  const qty = parseInt(body.quantity, 10) || 1
  const unitCost = body.unitCost ? parseFloat(body.unitCost) : null
  const totalCost = unitCost ? unitCost * qty : null

  const line = await prisma.purchaseOrderLine.create({
    data: {
      poId: id,
      description: body.description,
      quantity: qty,
      unitCost,
      totalCost,
    },
  })

  // Recalculate PO total from all lines
  const allLines = await prisma.purchaseOrderLine.findMany({
    where: { poId: id },
    select: { totalCost: true },
  })
  const newTotal = allLines.reduce((sum, l) => sum + (Number(l.totalCost) || 0), 0)
  if (newTotal > 0) {
    await prisma.purchaseOrder.update({ where: { id }, data: { totalValue: newTotal } })
  }

  revalidatePath("/finance")
  return NextResponse.json(line, { status: 201 })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.purchaseOrder.delete({ where: { id } })
  revalidatePath("/finance")
  return NextResponse.json({ success: true })
}
