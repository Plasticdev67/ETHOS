import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { toDecimal } from "@/lib/api-utils"
import { validateBody, isValidationError, opportunityCreateSchema } from "@/lib/api-validation"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const prospectId = searchParams.get("prospectId")

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (prospectId) where.prospectId = prospectId

  const opportunities = await prisma.opportunity.findMany({
    where,
    orderBy: [{ prospectId: "asc" }, { sortOrder: "asc" }],
    include: {
      prospect: { select: { companyName: true, status: true } },
      convertedProject: { select: { id: true, projectNumber: true, name: true } },
    },
  })

  return NextResponse.json(opportunities)
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("crm:create")
  if (denied) return denied

  try {
    const body = await validateBody(request, opportunityCreateSchema)
    if (isValidationError(body)) return body

    // Get max sortOrder for this prospect to append at end
    const maxOrder = await prisma.opportunity.findFirst({
      where: { prospectId: body.prospectId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    })

    const opportunity = await prisma.opportunity.create({
      data: {
        prospectId: body.prospectId,
        name: body.name,
        description: body.description || null,
        estimatedValue: toDecimal(body.estimatedValue),
        contactPerson: body.contactPerson || null,
        leadSource: body.leadSource || "OTHER",
        status: body.status || "ACTIVE_LEAD",
        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
        notes: body.notes || null,
        sortOrder: (maxOrder?.sortOrder || 0) + 1,
      },
    })

    await logAudit({
      action: "CREATE",
      entity: "Opportunity",
      entityId: opportunity.id,
      metadata: opportunity.name,
    })

    revalidatePath("/crm")

    return NextResponse.json(opportunity, { status: 201 })
  } catch (error) {
    console.error("Failed to create opportunity:", error)
    return NextResponse.json(
      { error: "Failed to create opportunity" },
      { status: 500 }
    )
  }
}
