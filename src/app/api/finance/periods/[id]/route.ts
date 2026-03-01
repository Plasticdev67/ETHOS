import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user
    const denied = await requirePermission("finance:edit")
    if (denied) return denied

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.accountingPeriod.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Accounting period not found" },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}

    // Handle close action
    if (body.action === "close") {
      if (existing.status === "PERIOD_CLOSED") {
        return NextResponse.json(
          { error: "Period is already closed" },
          { status: 400 }
        )
      }

      data.status = "PERIOD_CLOSED"
      data.closedAt = new Date()
      data.closedBy = body.closedBy || "system"
    }

    // Handle reopen action
    if (body.action === "reopen") {
      if (existing.status === "OPEN") {
        return NextResponse.json(
          { error: "Period is already open" },
          { status: 400 }
        )
      }

      data.status = "OPEN"
      data.closedAt = null
      data.closedBy = null
    }

    // Handle direct field updates
    if (body.name !== undefined) data.name = body.name
    if (body.startDate !== undefined) data.startDate = new Date(body.startDate)
    if (body.endDate !== undefined) data.endDate = new Date(body.endDate)
    if (body.yearEnd !== undefined) data.yearEnd = body.yearEnd
    if (body.status !== undefined && !body.action) data.status = body.status

    const period = await prisma.accountingPeriod.update({
      where: { id },
      data,
    })

    revalidatePath("/finance")
    return NextResponse.json(period)
  } catch (error) {
    console.error("Period PUT error:", error)
    return NextResponse.json(
      { error: "Failed to update accounting period" },
      { status: 500 }
    )
  }
}
