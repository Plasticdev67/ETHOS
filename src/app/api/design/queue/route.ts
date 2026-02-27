import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// GET /api/design/queue — Projects with QUEUED design cards (unassigned backlog)
export async function GET(_request: NextRequest) {
  try {
    const cards = await prisma.productDesignCard.findMany({
      where: { status: "QUEUED" },
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
        jobCards: {
          select: { id: true, jobType: true, status: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    // Group by projectId
    const grouped: Record<string, { project: (typeof cards)[0]["project"]; cards: typeof cards }> = {}
    for (const card of cards) {
      if (!grouped[card.projectId]) {
        grouped[card.projectId] = { project: card.project, cards: [] }
      }
      grouped[card.projectId].cards.push(card)
    }

    const result = Object.values(grouped)

    return NextResponse.json(JSON.parse(JSON.stringify(result)))
  } catch (error) {
    console.error("Failed to fetch design queue:", error)
    return NextResponse.json({ error: "Failed to fetch design queue" }, { status: 500 })
  }
}
