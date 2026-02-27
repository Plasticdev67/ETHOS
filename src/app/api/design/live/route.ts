import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// GET /api/design/live — Projects with IN_PROGRESS or REVIEW design cards + per-project progress
export async function GET(_request: NextRequest) {
  try {
    const cards = await prisma.productDesignCard.findMany({
      where: {
        status: { in: ["IN_PROGRESS", "REVIEW"] },
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
        jobCards: {
          select: { id: true, jobType: true, status: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    // Group by projectId and compute progress
    const grouped: Record<
      string,
      {
        project: (typeof cards)[0]["project"]
        cards: typeof cards
        progress: { totalJobCards: number; completedJobCards: number; percentage: number }
      }
    > = {}

    for (const card of cards) {
      if (!grouped[card.projectId]) {
        grouped[card.projectId] = {
          project: card.project,
          cards: [],
          progress: { totalJobCards: 0, completedJobCards: 0, percentage: 0 },
        }
      }
      grouped[card.projectId].cards.push(card)

      // Accumulate job card counts for this project
      for (const jc of card.jobCards) {
        grouped[card.projectId].progress.totalJobCards++
        if (jc.status === "APPROVED" || jc.status === "SIGNED_OFF") {
          grouped[card.projectId].progress.completedJobCards++
        }
      }
    }

    // Compute percentage for each project
    for (const group of Object.values(grouped)) {
      const { totalJobCards, completedJobCards } = group.progress
      group.progress.percentage =
        totalJobCards > 0 ? Math.round((completedJobCards / totalJobCards) * 100) : 0
    }

    const result = Object.values(grouped)

    return NextResponse.json(JSON.parse(JSON.stringify(result)))
  } catch (error) {
    console.error("Failed to fetch live design projects:", error)
    return NextResponse.json({ error: "Failed to fetch live design projects" }, { status: 500 })
  }
}
