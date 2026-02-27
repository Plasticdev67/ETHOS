import { prisma } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { JOB_TYPE_ORDER, calculateDesignTargetDates } from "@/lib/design-utils"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Fetch project with products and any existing design cards
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

  // Return all design cards for the project (existing + newly created)
  const allCards = await prisma.productDesignCard.findMany({
    where: { projectId: id },
    include: { jobCards: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "asc" },
  })

  revalidatePath("/design")
  return NextResponse.json(allCards)
}
