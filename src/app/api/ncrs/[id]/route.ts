import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title
  if (body.description !== undefined) data.description = body.description
  if (body.severity !== undefined) data.severity = body.severity
  if (body.status !== undefined) data.status = body.status
  if (body.costImpact !== undefined) data.costImpact = body.costImpact ? parseFloat(body.costImpact) : null
  if (body.status === "CLOSED") data.closedDate = new Date()

  const ncr = await prisma.nonConformanceReport.update({
    where: { id },
    data,
  })

  // Recalculate project NCR cost
  const ncrs = await prisma.nonConformanceReport.findMany({
    where: { projectId: ncr.projectId },
  })
  const totalNcrCost = ncrs.reduce(
    (sum, n) => sum + Number(n.costImpact || 0),
    0
  )
  await prisma.project.update({
    where: { id: ncr.projectId },
    data: { ncrCost: totalNcrCost },
  })

  revalidatePath("/ncrs")
  revalidatePath("/projects")

  return NextResponse.json(ncr)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ncr = await prisma.nonConformanceReport.findUnique({ where: { id } })
  if (!ncr) {
    return NextResponse.json({ error: "NCR not found" }, { status: 404 })
  }

  await prisma.nonConformanceReport.delete({ where: { id } })

  // Recalculate project NCR cost
  const ncrs = await prisma.nonConformanceReport.findMany({
    where: { projectId: ncr.projectId },
  })
  const totalNcrCost = ncrs.reduce(
    (sum, n) => sum + Number(n.costImpact || 0),
    0
  )
  await prisma.project.update({
    where: { id: ncr.projectId },
    data: { ncrCost: totalNcrCost },
  })

  revalidatePath("/ncrs")
  revalidatePath("/projects")

  return NextResponse.json({ success: true })
}
