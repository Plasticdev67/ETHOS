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
  const denied = await requirePermission("purchasing:approve-high")
  if (denied) return denied

  const { id } = await params

  const body = await request.json()
  const { approved, notes } = body

  if (typeof approved !== "boolean") {
    return NextResponse.json({ error: "approved (boolean) is required" }, { status: 400 })
  }

  // Verify the PO exists
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: { id: true, status: true, poNumber: true },
  })

  if (!po) {
    return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
  }

  if (approved) {
    // Approve the PO
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: user.id,
        approvedAt: new Date(),
        notes: notes
          ? `${po.status === "DRAFT" ? "" : "(Re-approved) "}${notes}`
          : undefined,
      },
    })

    revalidatePath("/purchasing")
    revalidatePath("/finance")

    return NextResponse.json({
      success: true,
      action: "approved",
      poNumber: updated.poNumber,
      status: updated.status,
      approvedAt: updated.approvedAt,
    })
  } else {
    // Reject — keep as DRAFT, add rejection notes
    const existingNotes = po.status !== "DRAFT" ? `[Rejected back to DRAFT] ` : ""
    const rejectionNote = notes ? `${existingNotes}Rejection: ${notes}` : `${existingNotes}Rejected`

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: "DRAFT",
        notes: rejectionNote,
        approvedById: null,
        approvedAt: null,
      },
    })

    revalidatePath("/purchasing")
    revalidatePath("/finance")

    return NextResponse.json({
      success: true,
      action: "rejected",
      poNumber: updated.poNumber,
      status: updated.status,
      notes: rejectionNote,
    })
  }
}
