import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

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
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  const fields = [
    "name", "description", "contactPerson", "leadSource",
    "status", "notes", "prospectId", "sortOrder", "quoteApproval",
  ]

  for (const field of fields) {
    if (body[field] !== undefined) {
      data[field] = body[field] === "" ? null : body[field]
    }
  }

  if (body.estimatedValue !== undefined) {
    data.estimatedValue = body.estimatedValue ? parseFloat(body.estimatedValue) : null
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
    data.estimatedWeight = body.estimatedWeight ? parseFloat(body.estimatedWeight) : null
  }
  if (body.maxLiftHeight !== undefined) {
    data.maxLiftHeight = body.maxLiftHeight ? parseFloat(body.maxLiftHeight) : null
  }
  if (body.liftingPlanCost !== undefined) {
    data.liftingPlanCost = body.liftingPlanCost ? parseFloat(body.liftingPlanCost) : null
  }

  // Dead lead fields
  if (body.deadReason !== undefined) data.deadReason = body.deadReason
  if (body.deadNotes !== undefined) data.deadNotes = body.deadNotes
  if (body.deadAt !== undefined) data.deadAt = body.deadAt ? new Date(body.deadAt) : null
  if (body.revivedAt !== undefined) data.revivedAt = body.revivedAt ? new Date(body.revivedAt) : null
  if (body.revivedFrom !== undefined) data.revivedFrom = body.revivedFrom

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
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.opportunity.delete({ where: { id } })

  revalidatePath("/crm")

  return NextResponse.json({ success: true })
}
