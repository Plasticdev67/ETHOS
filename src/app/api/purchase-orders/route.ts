import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const status = searchParams.get("status")
  const where: Record<string, unknown> = {}
  if (projectId) where.projectId = projectId
  if (status && status !== "ALL") where.status = status

  const pos = await prisma.purchaseOrder.findMany({
    where,
    orderBy: { dateRaised: "desc" },
    include: {
      project: { select: { projectNumber: true, name: true } },
      supplier: { select: { name: true } },
      _count: { select: { poLines: true } },
    },
  })
  return NextResponse.json(pos)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Auto-generate PO number
  const lastPo = await prisma.purchaseOrder.findFirst({
    orderBy: { poNumber: "desc" },
    select: { poNumber: true },
  })

  let nextNum = 1001
  if (lastPo) {
    const match = lastPo.poNumber.match(/\d+/)
    if (match) nextNum = parseInt(match[0], 10) + 1
  }

  // Calculate total from lines if provided and no explicit totalValue
  const lines: { description: string; quantity: number; unitCost: number; totalCost: number; bomLineId?: string }[] = body.lines || []
  const linesTotalValue = lines.reduce((sum: number, l: { totalCost: number }) => sum + (l.totalCost || 0), 0)
  const totalValue = body.totalValue
    ? parseFloat(body.totalValue)
    : linesTotalValue > 0
      ? linesTotalValue
      : null

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: `PO-${String(nextNum).padStart(4, "0")}`,
      projectId: body.projectId,
      supplierId: body.supplierId || null,
      status: body.status || "DRAFT",
      dateSent: body.dateSent ? new Date(body.dateSent) : null,
      expectedDelivery: body.expectedDelivery ? new Date(body.expectedDelivery) : null,
      totalValue,
      notes: body.notes || null,
      ...(lines.length > 0
        ? {
            poLines: {
              create: lines.map((l: { description: string; quantity: number; unitCost: number; totalCost: number; bomLineId?: string }) => ({
                description: l.description,
                quantity: l.quantity || 1,
                unitCost: l.unitCost || null,
                totalCost: l.totalCost || null,
                bomLineId: l.bomLineId || null,
              })),
            },
          }
        : {}),
    },
  })

  revalidatePath("/finance")
  return NextResponse.json(po, { status: 201 })
}
