import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { toDecimal } from "@/lib/api-utils"
import { getNextSequenceNumber } from "@/lib/finance/sequences"

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
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("purchasing:create")
  if (denied) return denied

  try {
    const body = await request.json()

    // Auto-generate PO number (concurrency-safe)
    const poNumber = await getNextSequenceNumber("purchase_order")

    // Calculate total from lines if provided and no explicit totalValue
    const lines: { description: string; quantity: number; unitCost: number; totalCost: number; bomLineId?: string }[] = body.lines || []
    const linesTotalValue = lines.reduce((sum: number, l: { totalCost: number }) => sum + (l.totalCost || 0), 0)
    const totalValue = body.totalValue
      ? toDecimal(body.totalValue)
      : linesTotalValue > 0
        ? linesTotalValue
        : null

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
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
  } catch (error) {
    console.error("POST /api/purchase-orders error:", error)
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    )
  }
}
