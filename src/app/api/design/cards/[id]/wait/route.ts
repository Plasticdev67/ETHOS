import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

const VALID_REASONS = [
  "CALCS_FROM_SUB",
  "CLIENT_REVIEW",
  "CONSULTANT_REVIEW",
  "STRUCTURAL_ENGINEER",
  "ARCHITECT_REVIEW",
  "THIRD_PARTY_APPROVAL",
  "OTHER",
] as const

// GET — fetch wait events for a design card
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

  const { id } = await params

  const events = await prisma.designWaitEvent.findMany({
    where: { designCardId: id },
    orderBy: { triggeredAt: "desc" },
    include: {
      triggeredBy: { select: { id: true, name: true } },
      resolvedBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(events)
}

// POST — start a new wait event (moves card to AWAITING_RESPONSE)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("design:manage")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()

  const { reason, notes, externalParty } = body

  if (!reason || !VALID_REASONS.includes(reason)) {
    return NextResponse.json(
      { error: "Valid reason is required", validReasons: VALID_REASONS },
      { status: 400 }
    )
  }

  // Verify the design card exists and is in a workable state
  const designCard = await prisma.productDesignCard.findUnique({
    where: { id },
    select: { id: true, status: true, projectId: true },
  })

  if (!designCard) {
    return NextResponse.json({ error: "Design card not found" }, { status: 404 })
  }

  if (designCard.status === "COMPLETE" || designCard.status === "AWAITING_RESPONSE") {
    return NextResponse.json(
      { error: `Cannot set awaiting response: card is ${designCard.status}` },
      { status: 400 }
    )
  }

  const previousStatus = designCard.status

  try {
    // Create the wait event and update card status in a transaction
    const [waitEvent] = await prisma.$transaction([
      prisma.designWaitEvent.create({
        data: {
          designCardId: id,
          reason,
          notes: notes || null,
          externalParty: externalParty || null,
          triggeredById: typeof user === "object" && "id" in user ? (user as { id: string }).id : null,
        },
      }),
      prisma.productDesignCard.update({
        where: { id },
        data: { status: "AWAITING_RESPONSE" },
      }),
    ])

    await logAudit({
      action: "UPDATE",
      entity: "ProductDesignCard",
      entityId: id,
      field: "status",
      oldValue: previousStatus,
      newValue: "AWAITING_RESPONSE",
      metadata: JSON.stringify({ reason, externalParty, waitEventId: waitEvent.id }),
    })

    revalidatePath("/design")
    return NextResponse.json(waitEvent, { status: 201 })
  } catch (error) {
    console.error("POST /api/design/cards/[id]/wait error:", error)
    return NextResponse.json({ error: "Failed to create wait event" }, { status: 500 })
  }
}

// PATCH — resolve an active wait event (moves card back to IN_PROGRESS)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("design:manage")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()

  const { resolutionNotes } = body

  // Find the active (unresolved) wait event for this card
  const activeWait = await prisma.designWaitEvent.findFirst({
    where: { designCardId: id, resolvedAt: null },
    orderBy: { triggeredAt: "desc" },
  })

  if (!activeWait) {
    return NextResponse.json(
      { error: "No active wait event found for this design card" },
      { status: 400 }
    )
  }

  const designCard = await prisma.productDesignCard.findUnique({
    where: { id },
    select: { id: true, status: true },
  })

  if (!designCard) {
    return NextResponse.json({ error: "Design card not found" }, { status: 404 })
  }

  try {
    const now = new Date()

    const [resolved] = await prisma.$transaction([
      prisma.designWaitEvent.update({
        where: { id: activeWait.id },
        data: {
          resolvedAt: now,
          resolvedById: typeof user === "object" && "id" in user ? (user as { id: string }).id : null,
          resolutionNotes: resolutionNotes || null,
        },
        include: {
          triggeredBy: { select: { id: true, name: true } },
          resolvedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.productDesignCard.update({
        where: { id },
        data: { status: "IN_PROGRESS" },
      }),
    ])

    await logAudit({
      action: "UPDATE",
      entity: "ProductDesignCard",
      entityId: id,
      field: "status",
      oldValue: "AWAITING_RESPONSE",
      newValue: "IN_PROGRESS",
      metadata: JSON.stringify({
        waitEventId: activeWait.id,
        reason: activeWait.reason,
        waitDurationMs: now.getTime() - activeWait.triggeredAt.getTime(),
      }),
    })

    revalidatePath("/design")
    return NextResponse.json(resolved)
  } catch (error) {
    console.error("PATCH /api/design/cards/[id]/wait error:", error)
    return NextResponse.json({ error: "Failed to resolve wait event" }, { status: 500 })
  }
}
