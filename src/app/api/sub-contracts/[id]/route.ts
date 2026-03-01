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
  const denied = await requirePermission("projects:edit")
  if (denied) return denied

  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.subContractorWork.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Sub-contract not found" }, { status: 404 })

    if (body.status !== undefined && body.status !== existing.status) {
      const invalid = validateStatusTransition("subContract", existing.status, body.status)
      if (invalid) return invalid
    }

    if (!body.status || body.status === existing.status) {
      const locked = checkImmutability("subContract", existing.status)
      if (locked) return locked
    }

    const data: Record<string, unknown> = {}
    if (body.description !== undefined) data.description = body.description
    if (body.supplierId !== undefined) data.supplierId = body.supplierId || null
    if (body.productId !== undefined) data.productId = body.productId || null
    if (body.agreedValue !== undefined) data.agreedValue = toDecimal(body.agreedValue)
    if (body.invoicedToDate !== undefined) data.invoicedToDate = toDecimal(body.invoicedToDate)
    if (body.status !== undefined) data.status = body.status
    if (body.notes !== undefined) data.notes = body.notes

    const sub = await prisma.subContractorWork.update({ where: { id }, data })
    revalidatePath("/finance")
    return NextResponse.json(sub)
  } catch (error) {
    console.error("PATCH /api/sub-contracts/[id] error:", error)
    return NextResponse.json({ error: "Failed to update sub-contract" }, { status: 500 })
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
    const existing = await prisma.subContractorWork.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Sub-contract not found" }, { status: 404 })

    const locked = checkImmutability("subContract", existing.status)
    if (locked) return locked

    await prisma.subContractorWork.delete({ where: { id } })
    revalidatePath("/finance")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/sub-contracts/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete sub-contract" }, { status: 500 })
  }
}
