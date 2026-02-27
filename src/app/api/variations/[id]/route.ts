import { prisma } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const variation = await prisma.variation.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.costImpact !== undefined && { costImpact: body.costImpact ? parseFloat(body.costImpact) : null }),
      ...(body.valueImpact !== undefined && { valueImpact: body.valueImpact ? parseFloat(body.valueImpact) : null }),
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
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.variation.delete({ where: { id } })

  await logAudit({ action: "DELETE", entity: "Variation", entityId: id })

  revalidatePath("/finance")
  revalidatePath("/projects")

  return NextResponse.json({ success: true })
}
