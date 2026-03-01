import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { toDecimal } from "@/lib/api-utils"
import { recalcProjectNcrCost } from "@/lib/ncr-utils"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("ncrs:edit")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title
  if (body.description !== undefined) data.description = body.description
  if (body.severity !== undefined) data.severity = body.severity
  if (body.status !== undefined) data.status = body.status
  if (body.costImpact !== undefined) data.costImpact = toDecimal(body.costImpact)
  if (body.status === "CLOSED") data.closedDate = new Date()

  try {
    const ncr = await prisma.nonConformanceReport.update({
      where: { id },
      data,
    })

    await recalcProjectNcrCost(ncr.projectId)

    revalidatePath("/ncrs")
    revalidatePath("/projects")

    return NextResponse.json(ncr)
  } catch (error) {
    console.error("PATCH /api/ncrs/[id] error:", error)
    return NextResponse.json({ error: "Failed to update NCR" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("ncrs:edit")
  if (denied) return denied

  const { id } = await params
  const ncr = await prisma.nonConformanceReport.findUnique({ where: { id } })
  if (!ncr) {
    return NextResponse.json({ error: "NCR not found" }, { status: 404 })
  }

  // Soft-delete: quality records must never be hard-deleted
  await prisma.nonConformanceReport.update({
    where: { id },
    data: { isArchived: true, archivedAt: new Date() },
  })

  await recalcProjectNcrCost(ncr.projectId)

  revalidatePath("/ncrs")
  revalidatePath("/projects")

  return NextResponse.json({ success: true })
}
