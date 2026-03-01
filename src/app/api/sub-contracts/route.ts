import { prisma } from "@/lib/db"
import { toDecimal } from "@/lib/api-utils"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const where = projectId ? { projectId } : {}

  const subs = await prisma.subContractorWork.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { projectNumber: true, name: true } },
      supplier: { select: { name: true } },
      product: { select: { partCode: true, description: true } },
    },
  })
  return NextResponse.json(subs)
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("purchasing:edit")
  if (denied) return denied

  const body = await request.json()

  try {
    const sub = await prisma.subContractorWork.create({
      data: {
        projectId: body.projectId,
        supplierId: body.supplierId || null,
        productId: body.productId || null,
        description: body.description,
        agreedValue: toDecimal(body.agreedValue),
        invoicedToDate: toDecimal(body.invoicedToDate),
        status: body.status || "IN_PROGRESS",
        notes: body.notes || null,
      },
    })
    revalidatePath("/finance")
    return NextResponse.json(sub, { status: 201 })

  } catch (error) {
    console.error("POST /api/sub-contracts error:", error)
    return NextResponse.json({ error: "Failed to create sub-contract" }, { status: 500 })
  }
}
