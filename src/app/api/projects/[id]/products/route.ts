import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("projects:edit")
  if (denied) return denied

  const { id: projectId } = await params
  const body = await request.json()

  try {
    const product = await prisma.product.create({
      data: {
        projectId,
        catalogueItemId: body.catalogueItemId || null,
        variantId: body.variantId || null,
        partCode: body.partCode,
        description: body.description,
        additionalDetails: body.additionalDetails || null,
        quantity: body.quantity || 1,
        allocatedDesignerId: body.allocatedDesignerId || null,
        coordinatorId: body.coordinatorId || null,
        requiredCompletionDate: body.requiredCompletionDate ? new Date(body.requiredCompletionDate) : null,
        currentDepartment: "PLANNING",
      },
    })

    return NextResponse.json(product, { status: 201 })

  } catch (error) {
    console.error("POST /api/projects/[id]/products error:", error)
    return NextResponse.json({ error: "Failed to add product to project" }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  const products = await prisma.product.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    include: {
      designer: { select: { name: true } },
      coordinator: { select: { name: true } },
    },
  })

  return NextResponse.json(products)
}
