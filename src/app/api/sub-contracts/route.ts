import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

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
  const body = await request.json()

  const sub = await prisma.subContractorWork.create({
    data: {
      projectId: body.projectId,
      supplierId: body.supplierId || null,
      productId: body.productId || null,
      description: body.description,
      agreedValue: body.agreedValue ? parseFloat(body.agreedValue) : null,
      invoicedToDate: body.invoicedToDate ? parseFloat(body.invoicedToDate) : null,
      status: body.status || "IN_PROGRESS",
      notes: body.notes || null,
    },
  })
  revalidatePath("/finance")
  return NextResponse.json(sub, { status: 201 })
}
