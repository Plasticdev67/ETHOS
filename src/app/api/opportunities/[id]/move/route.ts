import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

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

  const newProspectId = body.prospectId

  if (!newProspectId) {
    return NextResponse.json({ error: "prospectId required" }, { status: 400 })
  }

  try {
    // Get max sortOrder for new prospect to append at end
    const maxOrder = await prisma.opportunity.findFirst({
      where: { prospectId: newProspectId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    })

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: {
        prospectId: newProspectId,
        sortOrder: (maxOrder?.sortOrder || 0) + 1,
      },
    })

    return NextResponse.json(opportunity)
  } catch (error) {
    console.error("PATCH /api/opportunities/[id]/move error:", error)
    return NextResponse.json({ error: "Failed to move opportunity" }, { status: 500 })
  }
}
