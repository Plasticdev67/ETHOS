import { prisma } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { JOB_TYPE_ORDER, calculateDesignTargetDates } from "@/lib/design-utils"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("projects:edit")
  if (denied) return denied

  const { id } = await params

  // Parse optional body (designEstimatedCompletion)
  let designEstimatedCompletion: Date | null = null
  try {
    const body = await request.json()
    if (body.designEstimatedCompletion) {
      designEstimatedCompletion = new Date(body.designEstimatedCompletion)
    }
  } catch {
    // No body or invalid JSON — that's fine, field is optional
  }

  // Fetch project with products and any existing design cards
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            designCard: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Determine which products still need design cards
    const productsWithoutCards = project.products.filter((p) => !p.designCard)

    // If all products already have design cards, return early (idempotent)
    if (productsWithoutCards.length === 0) {
      const existingCards = await prisma.productDesignCard.findMany({
        where: { projectId: id },
        include: { jobCards: { orderBy: { sortOrder: "asc" } } },
        orderBy: { createdAt: "asc" },
      })
      return NextResponse.json(existingCards)
    }

    const productCount = project.products.length
    const dates = calculateDesignTargetDates(project.targetCompletion, productCount)

    // Create design cards and job cards for each product that doesn't have one yet
    const createdCards = []

    for (const product of productsWithoutCards) {
      const designCard = await prisma.productDesignCard.create({
        data: {
          projectId: id,
          productId: product.id,
          status: "QUEUED",
          targetStartDate: dates?.targetStart ?? null,
          targetEndDate: dates?.targetEnd ?? null,
          jobCards: {
            create: JOB_TYPE_ORDER.map((jobType, index) => ({
              jobType,
              sortOrder: index,
              status: index === 0 ? "READY" : "BLOCKED",
            })),
          },
        },
        include: {
          jobCards: { orderBy: { sortOrder: "asc" } },
        },
      })

      createdCards.push(designCard)

      await logAudit({
        action: "CREATE",
        entity: "ProductDesignCard",
        entityId: designCard.id,
        metadata: JSON.stringify({
          projectId: id,
          productId: product.id,
          jobCardsCreated: designCard.jobCards.length,
        }),
      })
    }

    // Save design estimate on the project if provided
    if (designEstimatedCompletion) {
      await prisma.project.update({
        where: { id },
        data: { designEstimatedCompletion },
      })
    }

    // Return all design cards for the project (existing + newly created)
    const allCards = await prisma.productDesignCard.findMany({
      where: { projectId: id },
      include: { jobCards: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "asc" },
    })

    revalidatePath("/design")
    return NextResponse.json(allCards)

  } catch (error) {
    console.error("POST /api/projects/[id]/activate-design error:", error)
    return NextResponse.json({ error: "Failed to activate design" }, { status: 500 })
  }
}
