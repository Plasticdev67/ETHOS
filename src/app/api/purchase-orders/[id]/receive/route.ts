import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("purchasing:edit")
  if (denied) return denied

  const { id: poId } = await params
  const body = await request.json()
  const { lineId, receivedQty, notes } = body

  if (!lineId || receivedQty == null) {
    return NextResponse.json({ error: "lineId and receivedQty required" }, { status: 400 })
  }

  // Update the PO line
  const line = await prisma.purchaseOrderLine.findUnique({
    where: { id: lineId },
    select: { poId: true, quantity: true },
  })

  if (!line || line.poId !== poId) {
    return NextResponse.json({ error: "Line not found" }, { status: 404 })
  }

  const qty = parseInt(receivedQty, 10)
  const fullyReceived = qty >= line.quantity

  await prisma.purchaseOrderLine.update({
    where: { id: lineId },
    data: {
      receivedQty: qty,
      receivedDate: new Date(),
      receivedNotes: notes || null,
      received: fullyReceived,
    },
  })

  // Check all lines on this PO to update PO status
  const allLines = await prisma.purchaseOrderLine.findMany({
    where: { poId },
    select: { quantity: true, receivedQty: true },
  })

  const allFullyReceived = allLines.every((l) => l.receivedQty >= l.quantity)
  const someReceived = allLines.some((l) => l.receivedQty > 0)

  let newStatus: string | undefined
  if (allFullyReceived && allLines.length > 0) {
    newStatus = "COMPLETE"
  } else if (someReceived) {
    newStatus = "PARTIALLY_RECEIVED"
  }

  if (newStatus) {
    await prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: newStatus as "COMPLETE" | "PARTIALLY_RECEIVED" },
    })
  }

  revalidatePath("/finance")
  return NextResponse.json({ success: true, poStatus: newStatus })
}
