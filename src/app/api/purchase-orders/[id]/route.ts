import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { toDecimal } from "@/lib/api-utils"
import { validateStatusTransition, checkImmutability } from "@/lib/status-guards"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

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
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("purchasing:edit")
  if (denied) return denied

  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.purchaseOrder.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "PO not found" }, { status: 404 })

    // Validate status transition
    if (body.status !== undefined && body.status !== existing.status) {
      const invalid = validateStatusTransition("purchaseOrder", existing.status, body.status)
      if (invalid) return invalid
    }

    // Block edits on locked POs (only status transitions allowed)
    if (!body.status || body.status === existing.status) {
      const locked = checkImmutability("purchaseOrder", existing.status)
      if (locked) return locked
    }

    const data: Record<string, unknown> = {}
    if (body.status !== undefined) data.status = body.status
    if (body.supplierId !== undefined) data.supplierId = body.supplierId || null
    if (body.notes !== undefined) data.notes = body.notes
    if (body.totalValue !== undefined) data.totalValue = toDecimal(body.totalValue)
    if (body.dateSent !== undefined) data.dateSent = body.dateSent ? new Date(body.dateSent) : null
    if (body.expectedDelivery !== undefined) data.expectedDelivery = body.expectedDelivery ? new Date(body.expectedDelivery) : null

    const po = await prisma.purchaseOrder.update({ where: { id }, data })
    revalidatePath("/finance")
    return NextResponse.json(po)
  } catch (error) {
    console.error("PATCH /api/purchase-orders/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to update purchase order" },
      { status: 500 }
    )
  }
}

// Add a line to this PO
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("purchasing:edit")
  if (denied) return denied

  try {
    const { id } = await params

    // Block adding lines to locked POs
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "PO not found" }, { status: 404 })
    const locked = checkImmutability("purchaseOrder", existing.status)
    if (locked) return locked

    const body = await request.json()

    if (!body.description) {
      return NextResponse.json({ error: "description required" }, { status: 400 })
    }

    const qty = parseInt(body.quantity, 10) || 1
    const unitCost = toDecimal(body.unitCost)
    const totalCost = unitCost ? Number(unitCost) * qty : null

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
  } catch (error) {
    console.error("POST /api/purchase-orders/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to add purchase order line" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("purchasing:edit")
  if (denied) return denied

  try {
    const { id } = await params
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "PO not found" }, { status: 404 })

    const locked = checkImmutability("purchaseOrder", existing.status)
    if (locked) return locked

    await prisma.purchaseOrder.delete({ where: { id } })
    revalidatePath("/finance")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/purchase-orders/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to delete purchase order" },
      { status: 500 }
    )
  }
}
