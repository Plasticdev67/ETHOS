import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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

  if (jobCard.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: `Cannot approve: current status is ${jobCard.status}, expected SUBMITTED` },
      { status: 400 }
    )
  }

  // Parse optional body
  let reviewNotes: string | undefined
  let reviewerId: string | undefined

  try {
    const body = await request.json()
    if (body.reviewNotes !== undefined) reviewNotes = body.reviewNotes
    if (body.reviewerId !== undefined) reviewerId = body.reviewerId
  } catch {
    // No body provided, that's fine
  }

  const now = new Date()

  const data: Record<string, unknown> = {
    status: "APPROVED",
    approvedAt: now,
  }
  if (reviewNotes !== undefined) data.reviewNotes = reviewNotes
  if (reviewerId !== undefined) data.reviewerId = reviewerId || null

  // Update job card
  const updated = await prisma.designJobCard.update({
    where: { id },
    data,
  })

  // UNLOCK NEXT: Find the next job card in sequence (sortOrder + 1 on the same design card)
  const nextJobCard = jobCard.designCard.jobCards.find(
    (jc) => jc.sortOrder === jobCard.sortOrder + 1
  )

  if (nextJobCard && nextJobCard.status === "BLOCKED") {
    await prisma.designJobCard.update({
      where: { id: nextJobCard.id },
      data: { status: "READY" },
    })
  }

  // Move parent design card back to IN_PROGRESS (since it was in REVIEW)
  if (jobCard.designCard.status === "REVIEW") {
    await prisma.productDesignCard.update({
      where: { id: jobCard.designCardId },
      data: { status: "IN_PROGRESS" },
    })
  }

  await logAudit({
    action: "UPDATE",
    entity: "DesignJobCard",
    entityId: id,
    field: "status",
    oldValue: "SUBMITTED",
    newValue: "APPROVED",
    metadata: JSON.stringify({
      designCardId: jobCard.designCardId,
      unlockedNextJob: nextJobCard && nextJobCard.status === "BLOCKED" ? nextJobCard.id : null,
    }),
  })

  revalidatePath("/design")
  return NextResponse.json(updated)
}
