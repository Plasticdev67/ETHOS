import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { requirePermission } from "@/lib/api-auth"
import { revalidatePath } from "next/cache"

// POST /api/design/jobs/:id/assign — Assign a designer to a specific job card
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission("design:assign")
  if (denied) return denied

  const { id } = await params

  let designerId: string
  try {
    const body = await request.json()
    designerId = body.designerId
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!designerId) {
    return NextResponse.json({ error: "designerId is required" }, { status: 400 })
  }

  const jobCard = await prisma.designJobCard.findUnique({
    where: { id },
    include: {
      designCard: {
        select: { id: true, assignedDesignerId: true, projectId: true, status: true },
      },
    },
  })

  if (!jobCard) {
    return NextResponse.json({ error: "Job card not found" }, { status: 404 })
  }

  const designer = await prisma.user.findUnique({
    where: { id: designerId },
    select: { id: true, name: true },
  })

  if (!designer) {
    return NextResponse.json({ error: "Designer not found" }, { status: 404 })
  }

  const oldAssignedToId = jobCard.assignedToId

  // Update job card assignment
  const updated = await prisma.designJobCard.update({
    where: { id },
    data: { assignedToId: designerId },
  })

  // Determine the primary designer for the design card:
  // After this assignment, find which designer has the most jobs assigned
  const allJobCards = await prisma.designJobCard.findMany({
    where: { designCardId: jobCard.designCardId },
    select: { assignedToId: true },
  })

  // Count assignments per designer
  const counts: Record<string, number> = {}
  for (const jc of allJobCards) {
    if (jc.assignedToId) {
      counts[jc.assignedToId] = (counts[jc.assignedToId] || 0) + 1
    }
  }

  // The designer with the most jobs becomes the card-level designer
  let primaryDesignerId = designerId
  let maxCount = 0
  for (const [did, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count
      primaryDesignerId = did
    }
  }

  const designCardUpdate: Record<string, unknown> = { assignedDesignerId: primaryDesignerId }
  if (jobCard.designCard.status === "QUEUED") {
    designCardUpdate.status = "IN_PROGRESS"
    designCardUpdate.actualStartDate = new Date()
  }
  await prisma.productDesignCard.update({
    where: { id: jobCard.designCardId },
    data: designCardUpdate,
  })

  await logAudit({
    action: "UPDATE",
    entity: "DesignJobCard",
    entityId: id,
    field: "assignedToId",
    oldValue: oldAssignedToId,
    newValue: designerId,
    metadata: JSON.stringify({
      designerName: designer.name,
      jobType: jobCard.jobType,
      designCardId: jobCard.designCardId,
      primaryDesignerId,
      statusChange: jobCard.designCard.status === "QUEUED" ? "QUEUED -> IN_PROGRESS" : null,
    }),
  })

  revalidatePath("/design")

  return NextResponse.json(updated)
}
