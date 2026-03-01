import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("design:manage")
  if (denied) return denied

  const { id } = await params

  const jobCard = await prisma.designJobCard.findUnique({
    where: { id },
    include: {
      designCard: true,
    },
  })

  if (!jobCard) {
    return NextResponse.json({ error: "Job card not found" }, { status: 404 })
  }

  if (jobCard.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: `Cannot submit for review: current status is ${jobCard.status}, expected IN_PROGRESS` },
      { status: 400 }
    )
  }

  // Parse optional body
  let reviewNotes: string | undefined
  let actualHours: number | undefined

  try {
    const body = await request.json()
    if (body.reviewNotes !== undefined) reviewNotes = body.reviewNotes
    if (body.actualHours !== undefined) actualHours = Number(body.actualHours)
  } catch {
    // No body provided, that's fine
  }

  const now = new Date()

  const data: Record<string, unknown> = {
    status: "SUBMITTED",
    submittedAt: now,
  }
  if (reviewNotes !== undefined) data.reviewNotes = reviewNotes
  if (actualHours !== undefined) data.actualHours = actualHours

  // Update job card
  const updated = await prisma.designJobCard.update({
    where: { id },
    data,
  })

  // Update parent design card status to REVIEW
  await prisma.productDesignCard.update({
    where: { id: jobCard.designCardId },
    data: { status: "REVIEW" },
  })

  await logAudit({
    action: "UPDATE",
    entity: "DesignJobCard",
    entityId: id,
    field: "status",
    oldValue: "IN_PROGRESS",
    newValue: "SUBMITTED",
    metadata: JSON.stringify({ designCardId: jobCard.designCardId }),
  })

  revalidatePath("/design")
  return NextResponse.json(updated)
}
