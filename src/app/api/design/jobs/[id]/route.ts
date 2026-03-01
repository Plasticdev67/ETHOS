import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const jobCard = await prisma.designJobCard.findUnique({
    where: { id },
    include: {
      designCard: {
        include: {
          product: true,
          project: true,
        },
      },
      assignedTo: {
        select: { id: true, name: true },
      },
      reviewer: {
        select: { id: true, name: true },
      },
    },
  })

  if (!jobCard) {
    return NextResponse.json({ error: "Job card not found" }, { status: 404 })
  }

  const auditTrail = await prisma.auditLog.findMany({
    where: {
      entity: "DesignJobCard",
      entityId: id,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ jobCard, auditTrail })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("design:manage")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()

  const jobCard = await prisma.designJobCard.findUnique({ where: { id } })
  if (!jobCard) {
    return NextResponse.json({ error: "Job card not found" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}

  if (body.notes !== undefined) data.notes = body.notes
  if (body.estimatedHours !== undefined) {
    data.estimatedHours = body.estimatedHours === null ? null : Number(body.estimatedHours)
  }
  if (body.actualHours !== undefined) {
    data.actualHours = body.actualHours === null ? null : Number(body.actualHours)
  }
  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null
  if (body.reviewerId !== undefined) data.reviewerId = body.reviewerId || null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  try {
    const updated = await prisma.designJobCard.update({
      where: { id },
      data,
    })

    await logAudit({
      action: "UPDATE",
      entity: "DesignJobCard",
      entityId: id,
      metadata: JSON.stringify(data),
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("PATCH /api/design/jobs/[id] error:", error)
    return NextResponse.json({ error: "Failed to update job card" }, { status: 500 })
  }
}
