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
      designCard: true,
    },
  })

  if (!jobCard) {
    return NextResponse.json({ error: "Job card not found" }, { status: 404 })
  }

  if (jobCard.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: `Cannot reject: current status is ${jobCard.status}, expected SUBMITTED` },
      { status: 400 }
    )
  }

  let body: { rejectionReason?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Request body is required with rejectionReason" },
      { status: 400 }
    )
  }

  if (!body.rejectionReason) {
    return NextResponse.json(
      { error: "rejectionReason is required" },
      { status: 400 }
    )
  }

  const now = new Date()

  // Update job card status to REJECTED
  const updated = await prisma.designJobCard.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectedAt: now,
      rejectionReason: body.rejectionReason,
    },
  })

  // Move parent design card back to IN_PROGRESS (from REVIEW)
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
    newValue: "REJECTED",
    metadata: JSON.stringify({
      designCardId: jobCard.designCardId,
      rejectionReason: body.rejectionReason,
    }),
  })

  revalidatePath("/design")
  return NextResponse.json(updated)
}
