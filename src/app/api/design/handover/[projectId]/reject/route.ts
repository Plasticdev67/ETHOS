import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

// POST /api/design/handover/[projectId]/reject — Reject a submitted handover
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  try {
    const body = await request.json()
    const { rejectionReason, receivedById } = body

    if (!rejectionReason || typeof rejectionReason !== "string" || rejectionReason.trim().length === 0) {
      return NextResponse.json(
        { error: "rejectionReason is required" },
        { status: 400 }
      )
    }

    // Fetch existing handover
    const handover = await prisma.designHandover.findUnique({
      where: { projectId },
    })

    if (!handover) {
      return NextResponse.json(
        { error: "No handover found for this project" },
        { status: 404 }
      )
    }

    if (handover.status !== "SUBMITTED") {
      return NextResponse.json(
        {
          error: `Handover status is ${handover.status}, only SUBMITTED handovers can be rejected`,
        },
        { status: 400 }
      )
    }

    const now = new Date()

    // Update handover to REJECTED
    const updatedHandover = await prisma.designHandover.update({
      where: { projectId },
      data: {
        status: "REJECTED",
        rejectedAt: now,
        rejectionReason: rejectionReason.trim(),
        receivedById: receivedById || null,
      },
      include: {
        initiatedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
      },
    })

    await logAudit({
      userId: receivedById || null,
      action: "UPDATE",
      entity: "DesignHandover",
      entityId: updatedHandover.id,
      field: "status",
      oldValue: "SUBMITTED",
      newValue: "REJECTED",
      metadata: JSON.stringify({
        projectId,
        rejectionReason: rejectionReason.trim(),
      }),
    })

    revalidatePath("/design")

    return NextResponse.json(JSON.parse(JSON.stringify(updatedHandover)))
  } catch (error) {
    console.error("Failed to reject design handover:", error)
    return NextResponse.json(
      { error: "Failed to reject design handover" },
      { status: 500 }
    )
  }
}
