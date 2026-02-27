import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// GET /api/design/overdue — Cards past targetEndDate that are not COMPLETE
export async function GET(_request: NextRequest) {
  try {
    const now = new Date()

    const cards = await prisma.productDesignCard.findMany({
      where: {
        targetEndDate: { lt: now },
        status: { not: "COMPLETE" },
      },
      include: {
        product: {
          select: {
            id: true,
            description: true,
            partCode: true,
            quantity: true,
            productJobNumber: true,
          },
        },
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
            targetCompletion: true,
            customer: { select: { name: true } },
          },
        },
        assignedDesigner: {
          select: { id: true, name: true },
        },
      },
      orderBy: { targetEndDate: "asc" },
    })

    // Compute daysOverdue for each card
    const result = cards.map((card) => {
      const targetEnd = new Date(card.targetEndDate!)
      const diffMs = now.getTime() - targetEnd.getTime()
      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      return {
        ...card,
        daysOverdue,
      }
    })

    return NextResponse.json(JSON.parse(JSON.stringify(result)))
  } catch (error) {
    console.error("Failed to fetch overdue design cards:", error)
    return NextResponse.json({ error: "Failed to fetch overdue design cards" }, { status: 500 })
  }
}
