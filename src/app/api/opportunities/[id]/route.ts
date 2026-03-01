import { prisma } from "@/lib/db"
import { toDecimal } from "@/lib/api-utils"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      prospect: true,
      convertedProject: { select: { id: true, projectNumber: true, name: true } },
    },
  })

  if (!opportunity) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 })
  }

  return NextResponse.json(opportunity)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("crm:edit")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  const fields = [
    "name", "description", "contactPerson", "leadSource",
    "status", "notes", "prospectId", "sortOrder", "quoteApproval",
  ]

  // Win probability (0-100)
  if (body.winProbability !== undefined) {
    data.winProbability = Math.max(0, Math.min(100, parseInt(body.winProbability, 10) || 0))
  }

  for (const field of fields) {
    if (body[field] !== undefined) {
      data[field] = body[field] === "" ? null : body[field]
    }
  }

  if (body.estimatedValue !== undefined) {
    data.estimatedValue = toDecimal(body.estimatedValue)
  }

  if (body.expectedCloseDate !== undefined) {
    data.expectedCloseDate = body.expectedCloseDate ? new Date(body.expectedCloseDate) : null
  }

  // Lifting plan fields (project-level)
  const liftingFields = [
    "liftingPlanStatus", "liftingPlanNotes", "craneRequired", "siteAccessNotes", "deliveryNotes",
  ]
  for (const field of liftingFields) {
    if (body[field] !== undefined) {
      data[field] = body[field] === "" ? null : body[field]
    }
  }
  if (body.liftingPlanRequired !== undefined) {
    data.liftingPlanRequired = !!body.liftingPlanRequired
  }
  if (body.estimatedWeight !== undefined) {
    data.estimatedWeight = body.estimatedWeight ? Number(toDecimal(body.estimatedWeight) ?? 0) : null
  }
  if (body.maxLiftHeight !== undefined) {
    data.maxLiftHeight = body.maxLiftHeight ? Number(toDecimal(body.maxLiftHeight) ?? 0) : null
  }
  if (body.liftingPlanCost !== undefined) {
    data.liftingPlanCost = toDecimal(body.liftingPlanCost)
  }

  // Dead lead fields
  if (body.deadReason !== undefined) data.deadReason = body.deadReason
  if (body.deadNotes !== undefined) data.deadNotes = body.deadNotes
  if (body.deadAt !== undefined) data.deadAt = body.deadAt ? new Date(body.deadAt) : null
  if (body.revivedAt !== undefined) data.revivedAt = body.revivedAt ? new Date(body.revivedAt) : null
  if (body.revivedFrom !== undefined) data.revivedFrom = body.revivedFrom

  // Auto-set win probability when status changes (unless manually provided)
  if (body.status && body.winProbability === undefined) {
    const probabilityDefaults: Record<string, number> = {
      DEAD_LEAD: 0,
      ACTIVE_LEAD: 10,
      PENDING_APPROVAL: 30,
      QUOTED: 50,
      WON: 100,
      LOST: 0,
    }
    if (probabilityDefaults[body.status] !== undefined) {
      data.winProbability = probabilityDefaults[body.status]
    }
  }

  // Handle dead history — append to existing history on status changes
  if (body.status === "DEAD_LEAD" && body.deadReason) {
    const existing = await prisma.opportunity.findUnique({
      where: { id },
      select: { deadHistory: true },
    })
    const history = (existing?.deadHistory as Array<Record<string, unknown>> || [])
    history.push({
      reason: body.deadReason,
      deadAt: body.deadAt || new Date().toISOString(),
      revivedAt: null,
    })
    data.deadHistory = history
  }

  // Handle revival — update last history entry
  if (body.revivedAt && body.status !== "DEAD_LEAD") {
    const existing = await prisma.opportunity.findUnique({
      where: { id },
      select: { deadHistory: true },
    })
    const history = (existing?.deadHistory as Array<Record<string, unknown>> || [])
    if (history.length > 0) {
      history[history.length - 1].revivedAt = body.revivedAt
    }
    data.deadHistory = history
  }

  try {
    const opportunity = await prisma.opportunity.update({
      where: { id },
      data,
      include: { convertedProject: { select: { id: true } } },
    })

    // Sync linked project status when CRM status changes
    if (body.status && opportunity.convertedProject) {
      const statusMap: Record<string, "OPPORTUNITY" | "QUOTATION" | "DESIGN"> = {
        ACTIVE_LEAD: "OPPORTUNITY",
        PENDING_APPROVAL: "QUOTATION",
        QUOTED: "QUOTATION",
        WON: "DESIGN",
      }
      const projectStatus = statusMap[body.status as string]
      if (projectStatus) {
        await prisma.project.update({
          where: { id: opportunity.convertedProject.id },
          data: { projectStatus },
        })
      }
    }

    revalidatePath("/crm")

    return NextResponse.json(opportunity)
  } catch (error) {
    console.error("PATCH /api/opportunities/[id] error:", error)
    return NextResponse.json({ error: "Failed to update opportunity" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("crm:edit")
  if (denied) return denied

  const { id } = await params

  try {
    await prisma.opportunity.delete({ where: { id } })

    revalidatePath("/crm")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/opportunities/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete opportunity" }, { status: 500 })
  }
}
