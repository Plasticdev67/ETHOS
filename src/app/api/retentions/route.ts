import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const where = projectId ? { projectId } : {}

  const retentions = await prisma.retentionHoldback.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { projectNumber: true, name: true } },
    },
  })
  return NextResponse.json(retentions)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const retention = await prisma.retentionHoldback.create({
    data: {
      projectId: body.projectId,
      retentionPercent: body.retentionPercent ? parseFloat(body.retentionPercent) : null,
      retentionAmount: body.retentionAmount ? parseFloat(body.retentionAmount) : null,
      releaseDate: body.releaseDate ? new Date(body.releaseDate) : null,
      status: body.status || "HELD",
      notes: body.notes || null,
    },
  })
  revalidatePath("/finance")
  return NextResponse.json(retention, { status: 201 })
}
