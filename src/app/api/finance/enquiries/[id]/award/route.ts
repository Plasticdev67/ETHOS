import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { responseId } = body as { responseId: string }

  if (!responseId) {
    return NextResponse.json({ error: "responseId is required" }, { status: 400 })
  }

  // Fetch the enquiry and winning response
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

  // Calculate total value from response lines
  const totalValue = winningResponse.lines.reduce(
    (sum, rl) => sum + (Number(rl.totalPrice) || 0),
    0
  )

  // Create PurchaseOrder from the winning response
  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: `PO-${String(nextNum).padStart(4, "0")}`,
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
}
