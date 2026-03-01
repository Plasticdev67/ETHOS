import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

// POST /api/design/ncr-rework — NCR-triggered rework: reset job cards and revert design card
export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("design:manage")
  if (denied) return denied

  try {
    const body = await request.json()
    const { designCardId, jobTypes, reason } = body

    if (!designCardId || typeof designCardId !== "string") {
      return NextResponse.json(
        { error: "designCardId is required" },
        { status: 400 }
      )
    }

    if (!jobTypes || !Array.isArray(jobTypes) || jobTypes.length === 0) {
      return NextResponse.json(
        { error: "jobTypes must be a non-empty array of DesignJobType values" },
        { status: 400 }
      )
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "reason is required" },
        { status: 400 }
      )
    }

    // Validate design card exists
    const designCard = await prisma.productDesignCard.findUnique({
      where: { id: designCardId },
      include: {
        jobCards: { orderBy: { sortOrder: "asc" } },
      },
    })

    if (!designCard) {
      return NextResponse.json(
        { error: "Design card not found" },
        { status: 404 }
      )
    }

    // Reset each specified job card
    let isFirst = true
    for (const jobType of jobTypes) {
      const jobCard = designCard.jobCards.find((jc) => jc.jobType === jobType)
      if (!jobCard) {
        continue // Skip if job type not found on this card
      }

      await prisma.designJobCard.update({
        where: { id: jobCard.id },
        data: {
          status: isFirst ? "IN_PROGRESS" : "READY",
          approvedAt: null,
          signedOffAt: null,
          submittedAt: null,
          rejectedAt: null,
          notes: `NCR Rework: ${reason.trim()}`,
        },
      })

      isFirst = false
    }

    // Revert the parent design card status to IN_PROGRESS
    await prisma.productDesignCard.update({
      where: { id: designCardId },
      data: { status: "IN_PROGRESS" },
    })

    // If a handover exists for this project and it's ACKNOWLEDGED, revert to DRAFT
    const handover = await prisma.designHandover.findUnique({
      where: { projectId: designCard.projectId },
    })

    if (handover && handover.status === "ACKNOWLEDGED") {
      await prisma.designHandover.update({
        where: { projectId: designCard.projectId },
        data: { status: "DRAFT" },
      })

      await logAudit({
        action: "UPDATE",
        entity: "DesignHandover",
        entityId: handover.id,
        field: "status",
        oldValue: "ACKNOWLEDGED",
        newValue: "DRAFT",
        metadata: JSON.stringify({
          trigger: "NCR rework",
          designCardId,
          reason: reason.trim(),
        }),
      })
    }

    // Log audit for the rework
    await logAudit({
      action: "UPDATE",
      entity: "ProductDesignCard",
      entityId: designCardId,
      field: "status",
      oldValue: designCard.status,
      newValue: "IN_PROGRESS",
      metadata: JSON.stringify({
        trigger: "NCR rework",
        jobTypesReset: jobTypes,
        reason: reason.trim(),
      }),
    })

    // Return updated design card with job cards
    const updatedCard = await prisma.productDesignCard.findUnique({
      where: { id: designCardId },
      include: {
        jobCards: { orderBy: { sortOrder: "asc" } },
      },
    })

    revalidatePath("/design")

    return NextResponse.json(JSON.parse(JSON.stringify(updatedCard)))
  } catch (error) {
    console.error("Failed to process NCR rework:", error)
    return NextResponse.json(
      { error: "Failed to process NCR rework" },
      { status: 500 }
    )
  }
}
