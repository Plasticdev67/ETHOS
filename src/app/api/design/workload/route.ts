import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// GET /api/design/workload — Per-designer workload: active cards, estimated/actual hours
export async function GET(_request: NextRequest) {
  try {
    const cards = await prisma.productDesignCard.findMany({
      where: {
        assignedDesignerId: { not: null },
        status: { notIn: ["COMPLETE", "ON_HOLD"] },
      },
      include: {
        assignedDesigner: {
          select: { id: true, name: true },
        },
      },
    })

    // Group by designer and aggregate
    const workloadMap: Record<
      string,
      {
        designerId: string
        designerName: string
        activeCards: number
        estimatedHours: number
        actualHours: number
      }
    > = {}

    for (const card of cards) {
      const designerId = card.assignedDesignerId!
      const designerName = card.assignedDesigner?.name ?? "Unknown"

      if (!workloadMap[designerId]) {
        workloadMap[designerId] = {
          designerId,
          designerName,
          activeCards: 0,
          estimatedHours: 0,
          actualHours: 0,
        }
      }

      workloadMap[designerId].activeCards++
      workloadMap[designerId].estimatedHours += card.estimatedHours
        ? Number(card.estimatedHours)
        : 0
      workloadMap[designerId].actualHours += card.actualHours
        ? Number(card.actualHours)
        : 0
    }

    const result = Object.values(workloadMap)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to fetch designer workload:", error)
    return NextResponse.json({ error: "Failed to fetch designer workload" }, { status: 500 })
  }
}
