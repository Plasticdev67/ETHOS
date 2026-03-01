import { prisma } from "@/lib/db"
import { toDecimal } from "@/lib/api-utils"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { validateStatusTransition, checkImmutability } from "@/lib/status-guards"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("projects:edit")
  if (denied) return denied

  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.plantHire.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Plant hire not found" }, { status: 404 })

    if (body.status !== undefined && body.status !== existing.status) {
      const invalid = validateStatusTransition("plantHire", existing.status, body.status)
      if (invalid) return invalid
    }

    if (!body.status || body.status === existing.status) {
      const locked = checkImmutability("plantHire", existing.status)
      if (locked) return locked
    }

    const data: Record<string, unknown> = {}
    if (body.description !== undefined) data.description = body.description
    if (body.supplierId !== undefined) data.supplierId = body.supplierId || null
    if (body.hireStart !== undefined) data.hireStart = body.hireStart ? new Date(body.hireStart) : null
    if (body.hireEnd !== undefined) data.hireEnd = body.hireEnd ? new Date(body.hireEnd) : null
    if (body.weeklyRate !== undefined) data.weeklyRate = toDecimal(body.weeklyRate)
    if (body.totalCost !== undefined) data.totalCost = toDecimal(body.totalCost)
    if (body.status !== undefined) data.status = body.status
    if (body.notes !== undefined) data.notes = body.notes

    const hire = await prisma.plantHire.update({ where: { id }, data })
    return NextResponse.json(hire)
  } catch (error) {
    console.error("PATCH /api/plant-hires/[id] error:", error)
    return NextResponse.json({ error: "Failed to update plant hire" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("projects:edit")
  if (denied) return denied

  try {
    const { id } = await params
    const existing = await prisma.plantHire.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Plant hire not found" }, { status: 404 })

    const locked = checkImmutability("plantHire", existing.status)
    if (locked) return locked

    await prisma.plantHire.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/plant-hires/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete plant hire" }, { status: 500 })
  }
}
