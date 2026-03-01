import { prisma } from "@/lib/db"
import { toDecimal } from "@/lib/api-utils"
import { logAudit } from "@/lib/audit"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { validateStatusTransition, checkImmutability } from "@/lib/status-guards"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("variations:edit")
  if (denied) return denied

  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.variation.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Variation not found" }, { status: 404 })

    // Validate status transition
    if (body.status !== undefined && body.status !== existing.status) {
      const invalid = validateStatusTransition("variation", existing.status, body.status)
      if (invalid) return invalid
    }

    // Block edits on locked variations (only status transitions allowed)
    if (!body.status || body.status === existing.status) {
      const locked = checkImmutability("variation", existing.status)
      if (locked) return locked
    }

    const variation = await prisma.variation.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.costImpact !== undefined && { costImpact: toDecimal(body.costImpact) }),
        ...(body.valueImpact !== undefined && { valueImpact: toDecimal(body.valueImpact) }),
        ...(body.dateApproved !== undefined && { dateApproved: body.dateApproved ? new Date(body.dateApproved) : null }),
        ...(body.dateClosed !== undefined && { dateClosed: body.dateClosed ? new Date(body.dateClosed) : null }),
        ...(body.approvedBy !== undefined && { approvedBy: body.approvedBy }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    })

    await logAudit({
      action: "UPDATE",
      entity: "Variation",
      entityId: id,
      field: body.status ? "status" : undefined,
      newValue: body.status || undefined,
    })

    revalidatePath("/finance")
    revalidatePath("/projects")

    return NextResponse.json(JSON.parse(JSON.stringify(variation)))
  } catch (error) {
    console.error("PATCH /api/variations/[id] error:", error)
    return NextResponse.json({ error: "Failed to update variation" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("variations:edit")
  if (denied) return denied

  try {
    const { id } = await params
    const existing = await prisma.variation.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Variation not found" }, { status: 404 })

    const locked = checkImmutability("variation", existing.status)
    if (locked) return locked

    await prisma.variation.delete({ where: { id } })

    await logAudit({ action: "DELETE", entity: "Variation", entityId: id })

    revalidatePath("/finance")
    revalidatePath("/projects")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/variations/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete variation" }, { status: 500 })
  }
}
