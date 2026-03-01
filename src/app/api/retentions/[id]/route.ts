import { prisma } from "@/lib/db"
import { toDecimal } from "@/lib/api-utils"
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
  const denied = await requirePermission("finance:edit")
  if (denied) return denied

  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.retentionHoldback.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Retention not found" }, { status: 404 })

    if (body.status !== undefined && body.status !== existing.status) {
      const invalid = validateStatusTransition("retention", existing.status, body.status)
      if (invalid) return invalid
    }

    if (!body.status || body.status === existing.status) {
      const locked = checkImmutability("retention", existing.status)
      if (locked) return locked
    }

    const data: Record<string, unknown> = {}
    if (body.retentionPercent !== undefined) data.retentionPercent = toDecimal(body.retentionPercent)
    if (body.retentionAmount !== undefined) data.retentionAmount = toDecimal(body.retentionAmount)
    if (body.releaseDate !== undefined) data.releaseDate = body.releaseDate ? new Date(body.releaseDate) : null
    if (body.status !== undefined) data.status = body.status
    if (body.notes !== undefined) data.notes = body.notes

    const retention = await prisma.retentionHoldback.update({ where: { id }, data })
    revalidatePath("/finance")
    return NextResponse.json(retention)
  } catch (error) {
    console.error("PATCH /api/retentions/[id] error:", error)
    return NextResponse.json({ error: "Failed to update retention" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("finance:edit")
  if (denied) return denied

  try {
    const { id } = await params
    const existing = await prisma.retentionHoldback.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Retention not found" }, { status: 404 })

    const locked = checkImmutability("retention", existing.status)
    if (locked) return locked

    await prisma.retentionHoldback.delete({ where: { id } })
    revalidatePath("/finance")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/retentions/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete retention" }, { status: 500 })
  }
}
