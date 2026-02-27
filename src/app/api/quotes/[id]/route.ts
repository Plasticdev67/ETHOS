import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true } },
      project: {
        select: {
          id: true,
          projectNumber: true,
          name: true,
          products: {
            select: { id: true, partCode: true, description: true, quantity: true, catalogueItemId: true },
          },
        },
      },
      createdBy: { select: { name: true } },
      quoteLines: {
        orderBy: [{ isOptional: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          product: { select: { partCode: true, description: true } },
          catalogueItem: { select: { partCode: true, description: true, guideUnitCost: true } },
        },
      },
    },
  })

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 })
  }

  return NextResponse.json(quote)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.status !== undefined) data.status = body.status
  if (body.notes !== undefined) data.notes = body.notes
  if (body.subject !== undefined) data.subject = body.subject
  if (body.validUntil !== undefined) data.validUntil = body.validUntil ? new Date(body.validUntil) : null
  if (body.status === "SUBMITTED") data.dateSubmitted = new Date()

  // Recalculate totals from lines
  if (body.recalculate) {
    const lines = await prisma.quoteLine.findMany({ where: { quoteId: id } })
    let totalCost = 0
    let totalSell = 0
    for (const line of lines) {
      if (!line.isOptional) {
        totalCost += Number(line.costTotal || 0)
        totalSell += Number(line.sellPrice || 0)
      }
    }
    data.totalCost = totalCost
    data.totalSell = totalSell
    data.overallMargin = totalSell > 0 ? ((totalSell - totalCost) / totalSell) * 100 : 0
  }

  const quote = await prisma.quote.update({ where: { id }, data })

  revalidatePath("/quotes")
  revalidatePath("/finance")

  return NextResponse.json(quote)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.quote.delete({ where: { id } })

  revalidatePath("/quotes")
  revalidatePath("/finance")

  return NextResponse.json({ success: true })
}
