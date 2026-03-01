import { prisma } from "@/lib/db"
import { toDecimal } from "@/lib/api-utils"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const where = projectId ? { projectId } : {}

  const hires = await prisma.plantHire.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { projectNumber: true, name: true } },
      supplier: { select: { name: true } },
    },
  })
  return NextResponse.json(hires)
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("purchasing:edit")
  if (denied) return denied

  const body = await request.json()

  const hire = await prisma.plantHire.create({
    data: {
      projectId: body.projectId,
      supplierId: body.supplierId || null,
      description: body.description,
      hireStart: body.hireStart ? new Date(body.hireStart) : null,
      hireEnd: body.hireEnd ? new Date(body.hireEnd) : null,
      weeklyRate: toDecimal(body.weeklyRate),
      totalCost: toDecimal(body.totalCost),
      status: body.status || "ON_HIRE",
      notes: body.notes || null,
    },
  })
  return NextResponse.json(hire, { status: 201 })
}
