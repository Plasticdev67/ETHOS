import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// GET /api/design/ready-for-handover — Projects where ALL design cards are COMPLETE
export async function GET(_request: NextRequest) {
  try {
    // Find all projects that have at least one design card
    const projectsWithDesignCards = await prisma.project.findMany({
      where: {
        designCards: { some: {} },
      },
      include: {
        customer: { select: { name: true } },
        designCards: {
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
            assignedDesigner: {
              select: { id: true, name: true },
            },
            jobCards: {
              select: { id: true, jobType: true, status: true },
            },
          },
        },
      },
    })

    // Filter to only projects where every design card has status COMPLETE
    const readyProjects = projectsWithDesignCards.filter((project) =>
      project.designCards.every((card) => card.status === "COMPLETE")
    )

    const result = readyProjects.map((project) => ({
      id: project.id,
      projectNumber: project.projectNumber,
      name: project.name,
      targetCompletion: project.targetCompletion,
      customer: project.customer,
      designCards: project.designCards,
    }))

    return NextResponse.json(JSON.parse(JSON.stringify(result)))
  } catch (error) {
    console.error("Failed to fetch projects ready for handover:", error)
    return NextResponse.json(
      { error: "Failed to fetch projects ready for handover" },
      { status: 500 }
    )
  }
}
