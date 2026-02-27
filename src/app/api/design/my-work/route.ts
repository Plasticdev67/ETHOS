import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const designerId = searchParams.get("designerId")

  if (!designerId) {
    return NextResponse.json(
      { error: "designerId query parameter is required" },
      { status: 400 }
    )
  }

  const designCards = await prisma.productDesignCard.findMany({
    where: { assignedDesignerId: designerId },
    include: {
      product: true,
      project: {
        select: {
          id: true,
          projectNumber: true,
          name: true,
          customer: {
            select: { name: true },
          },
        },
      },
      jobCards: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  // Group by project
  const grouped: Record<
    string,
    {
      project: { id: string; projectNumber: string; name: string; customer: { name: string } | null }
      designCards: typeof designCards
    }
  > = {}

  for (const card of designCards) {
    const projectId = card.project.id
    if (!grouped[projectId]) {
      grouped[projectId] = {
        project: card.project,
        designCards: [],
      }
    }
    grouped[projectId].designCards.push(card)
  }

  const result = Object.values(grouped)

  return NextResponse.json(result)
}
