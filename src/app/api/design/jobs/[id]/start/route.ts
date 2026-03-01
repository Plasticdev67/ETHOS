import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { canStartJob } from "@/lib/design-utils"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("design:manage")
  if (denied) return denied

  const { id } = await params

  // Fetch job card with sibling job cards via the parent design card
  const jobCard = await prisma.designJobCard.findUnique({
    where: { id },
    include: {
      designCard: {
        include: {
          jobCards: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  })

  if (!jobCard) {
    return NextResponse.json({ error: "Job card not found" }, { status: 404 })
  }

  // Allow starting from READY (first time) or REJECTED (re-work)
  if (jobCard.status !== "READY" && jobCard.status !== "REJECTED") {
    return NextResponse.json(
      { error: `Cannot start job card: current status is ${jobCard.status}, expected READY or REJECTED` },
      { status: 400 }
    )
  }

  // Validate dependency is met (skip for re-work — it was already started before)
  if (jobCard.status === "READY") {
    const siblingCards = jobCard.designCard.jobCards
    if (!canStartJob(jobCard.jobType, siblingCards)) {
      return NextResponse.json(
        { error: "Cannot start this job: prerequisite job has not been approved or signed off" },
        { status: 400 }
      )
    }
  }

  const previousStatus = jobCard.status
  const now = new Date()

  try {
  // Update job card status to IN_PROGRESS (clear rejection data on re-work)
  const updateData: Record<string, unknown> = {
    status: "IN_PROGRESS",
    startedAt: now,
  }
  if (previousStatus === "REJECTED") {
    updateData.rejectedAt = null
    updateData.rejectionReason = null
  }

  const updated = await prisma.designJobCard.update({
    where: { id },
    data: updateData,
  })

  // If the parent design card is still QUEUED, move it to IN_PROGRESS
  if (jobCard.designCard.status === "QUEUED" || jobCard.designCard.status === "REVIEW") {
    await prisma.productDesignCard.update({
      where: { id: jobCard.designCardId },
      data: {
        status: "IN_PROGRESS",
        ...(jobCard.designCard.status === "QUEUED" ? { actualStartDate: now } : {}),
      },
    })
  }

  await logAudit({
    action: "UPDATE",
    entity: "DesignJobCard",
    entityId: id,
    field: "status",
    oldValue: previousStatus,
    newValue: "IN_PROGRESS",
    metadata: JSON.stringify({ designCardId: jobCard.designCardId, isRework: previousStatus === "REJECTED" }),
  })

  revalidatePath("/design")
  return NextResponse.json(updated)
  } catch (error) {
    console.error("POST /api/design/jobs/[id]/start error:", error)
    return NextResponse.json({ error: "Failed to start job card" }, { status: 500 })
  }
}
