import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { DEFAULT_HANDOVER_CHECKLIST } from "@/lib/design-utils"
import { requirePermission } from "@/lib/api-auth"
import { revalidatePath } from "next/cache"

// GET /api/design/handover/[projectId] — Fetch existing handover + design cards
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  try {
    const handover = await prisma.designHandover.findUnique({
      where: { projectId },
      include: {
        initiatedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
      },
    })

    // Always fetch design cards for readiness check
    const designCards = await prisma.productDesignCard.findMany({
      where: { projectId },
      include: {
        jobCards: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(
      JSON.parse(JSON.stringify({ handover: handover ?? null, designCards }))
    )
  } catch (error) {
    console.error("Failed to fetch design handover:", error)
    return NextResponse.json(
      { error: "Failed to fetch design handover" },
      { status: 500 }
    )
  }
}

// POST /api/design/handover/[projectId] — Create or update handover to SUBMITTED
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const denied = await requirePermission("design:handover-create")
  if (denied) return denied

  const { projectId } = await params

  try {
    const body = await request.json()
    const { checklist, designNotes, initiatedById, includedProductIds } = body

    // Validate design cards for this project
    const designCards = await prisma.productDesignCard.findMany({
      where: { projectId },
      include: {
        product: { select: { id: true, description: true, partCode: true } },
      },
    })

    if (designCards.length === 0) {
      return NextResponse.json(
        { error: "No design cards found for this project" },
        { status: 400 }
      )
    }

    // If specific product IDs are provided, validate those products are complete (partial handover)
    // Otherwise require all cards to be complete (full handover)
    if (includedProductIds && Array.isArray(includedProductIds) && includedProductIds.length > 0) {
      const incompleteIncluded = designCards.filter(
        (c) => includedProductIds.includes(c.product.id) && c.status !== "COMPLETE"
      )
      if (incompleteIncluded.length > 0) {
        const cardNames = incompleteIncluded
          .map((c) => `${c.product.partCode || c.product.description} (${c.status})`)
          .join(", ")
        return NextResponse.json(
          { error: `Cannot include incomplete products in handover: ${cardNames}` },
          { status: 400 }
        )
      }
    } else {
      // Full handover: all cards must be complete
      const incompleteCards = designCards.filter((c) => c.status !== "COMPLETE")
      if (incompleteCards.length > 0) {
        const cardNames = incompleteCards
          .map((c) => `${c.product.partCode || c.product.description} (${c.status})`)
          .join(", ")
        return NextResponse.json(
          { error: `Cannot submit handover: the following design cards are not complete: ${cardNames}` },
          { status: 400 }
        )
      }
    }

    // Determine which product IDs to include
    const productIds = (includedProductIds && Array.isArray(includedProductIds) && includedProductIds.length > 0)
      ? includedProductIds
      : designCards.map((c) => c.product.id)

    // Check if a handover already exists
    const existing = await prisma.designHandover.findUnique({
      where: { projectId },
    })

    // Only allow create (no existing) or update if DRAFT/REJECTED/ACKNOWLEDGED
    // ACKNOWLEDGED is allowed for partial handovers — design manager can submit additional batches
    if (existing && existing.status !== "DRAFT" && existing.status !== "REJECTED" && existing.status !== "ACKNOWLEDGED") {
      return NextResponse.json(
        {
          error: `Handover is already ${existing.status} and cannot be resubmitted`,
        },
        { status: 400 }
      )
    }

    // Build checklist data
    const checklistData =
      checklist && Array.isArray(checklist) && checklist.length > 0
        ? checklist
        : DEFAULT_HANDOVER_CHECKLIST.map((item) => ({
            item,
            checked: false,
          }))

    const now = new Date()

    const handover = await prisma.designHandover.upsert({
      where: { projectId },
      create: {
        projectId,
        status: "SUBMITTED",
        initiatedById: initiatedById || null,
        initiatedAt: now,
        checklist: checklistData,
        designNotes: designNotes || null,
        includedProductIds: productIds,
      },
      update: {
        status: "SUBMITTED",
        initiatedById: initiatedById || undefined,
        initiatedAt: now,
        checklist: checklistData,
        designNotes: designNotes !== undefined ? designNotes : undefined,
        includedProductIds: productIds,
        rejectedAt: null,
        rejectionReason: null,
      },
      include: {
        initiatedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
      },
    })

    await logAudit({
      userId: initiatedById || null,
      action: existing ? "UPDATE" : "CREATE",
      entity: "DesignHandover",
      entityId: handover.id,
      field: "status",
      oldValue: existing?.status || null,
      newValue: "SUBMITTED",
      metadata: JSON.stringify({ projectId }),
    })

    revalidatePath("/production")
    revalidatePath("/production/dashboard")
    revalidatePath("/design")

    return NextResponse.json(JSON.parse(JSON.stringify(handover)))
  } catch (error) {
    console.error("Failed to submit design handover:", error)
    return NextResponse.json(
      { error: "Failed to submit design handover" },
      { status: 500 }
    )
  }
}
