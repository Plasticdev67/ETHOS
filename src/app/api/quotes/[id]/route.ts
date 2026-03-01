import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { validateStatusTransition, checkImmutability } from "@/lib/status-guards"

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
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("quotes:edit")
  if (denied) return denied

  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.quote.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Quote not found" }, { status: 404 })

    // Validate status transition if changing status
    if (body.status !== undefined && body.status !== existing.status) {
      const invalid = validateStatusTransition("quote", existing.status, body.status)
      if (invalid) return invalid
    }

    // Block edits on locked quotes (only status transitions allowed)
    if (!body.status || body.status === existing.status) {
      const locked = checkImmutability("quote", existing.status)
      if (locked) return locked
    }

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
  } catch (error) {
    console.error("PATCH /api/quotes/[id] error:", error)
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("quotes:edit")
  if (denied) return denied

  try {
    const { id } = await params
    const existing = await prisma.quote.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Quote not found" }, { status: 404 })

    const locked = checkImmutability("quote", existing.status)
    if (locked) return locked

    await prisma.quote.delete({ where: { id } })

    revalidatePath("/quotes")
    revalidatePath("/finance")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/quotes/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete quote" }, { status: 500 })
  }
}
