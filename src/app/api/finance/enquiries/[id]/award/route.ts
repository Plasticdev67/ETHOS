import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { getNextSequenceNumber } from "@/lib/finance/sequences"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("purchasing:create")
  if (denied) return denied

  const body = await request.json()
  const { responseId } = body as { responseId: string }

  if (!responseId) {
    return NextResponse.json({ error: "responseId is required" }, { status: 400 })
  }

  // Fetch the enquiry and winning response
  try {
    const enquiry = await prisma.procurementEnquiry.findUnique({
      where: { id },
      include: {
        lines: { orderBy: { sortOrder: "asc" } },
        responses: {
          include: {
            supplier: { select: { id: true, name: true } },
            lines: {
              include: {
                enquiryLine: { select: { id: true, description: true, quantity: true } },
              },
            },
          },
        },
      },
    })

    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 })
    }

    const winningResponse = enquiry.responses.find((r) => r.id === responseId)
    if (!winningResponse) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 })
    }

    // Set winning response to AWARDED, others to DECLINED
    await prisma.enquiryResponse.update({
      where: { id: responseId },
      data: { status: "AWARDED" },
    })

    const otherResponseIds = enquiry.responses
      .filter((r) => r.id !== responseId)
      .map((r) => r.id)

    if (otherResponseIds.length > 0) {
      await prisma.enquiryResponse.updateMany({
        where: { id: { in: otherResponseIds } },
        data: { status: "DECLINED" },
      })
    }

    // Set enquiry status to AWARDED
    await prisma.procurementEnquiry.update({
      where: { id },
      data: { status: "AWARDED" },
    })

    // Auto-generate PO number (concurrency-safe)
    const poNumber = await getNextSequenceNumber("purchase_order")

    // Calculate total value from response lines
    const totalValue = winningResponse.lines.reduce(
      (sum, rl) => sum + (Number(rl.totalPrice) || 0),
      0
    )

    // Create PurchaseOrder from the winning response
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        projectId: enquiry.projectId,
        supplierId: winningResponse.supplierId,
        status: "DRAFT",
        totalValue: totalValue > 0 ? totalValue : null,
        notes: `Created from Enquiry ${enquiry.enquiryNumber} — ${enquiry.subject}`,
        poLines: {
          create: winningResponse.lines.map((rl) => ({
            description: rl.enquiryLine.description,
            quantity: Number(rl.enquiryLine.quantity) || 1,
            unitCost: rl.unitPrice ?? null,
            totalCost: rl.totalPrice ?? null,
          })),
        },
      },
    })

    revalidatePath("/purchasing/enquiries")
    revalidatePath("/purchasing")
    revalidatePath("/finance")

    return NextResponse.json({ poId: po.id, poNumber: po.poNumber })

  } catch (error) {
    console.error("POST /api/finance/enquiries/[id]/award error:", error)
    return NextResponse.json({ error: "Failed to award enquiry" }, { status: 500 })
  }
}
