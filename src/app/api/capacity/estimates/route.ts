import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET /api/capacity/estimates — get project resource estimates
// ?projectId=xxx — filter by project
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")

  const where: Record<string, unknown> = {}
  if (projectId) where.projectId = projectId

  const estimates = await prisma.projectResourceEstimate.findMany({
    where,
    include: {
      project: {
        select: {
          id: true,
          projectNumber: true,
          name: true,
          projectStatus: true,
          targetCompletion: true,
          customer: { select: { name: true } },
        },
      },
    },
    orderBy: [{ plannedStart: "asc" }, { department: "asc" }],
  })

  return NextResponse.json(JSON.parse(JSON.stringify(estimates)))
}

// POST /api/capacity/estimates — upsert resource estimate for a project+department
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, department, estimatedHours, plannedStart, plannedEnd, actualHours, notes } = body

  if (!projectId || !department || estimatedHours == null) {
    return NextResponse.json(
      { error: "projectId, department, and estimatedHours are required" },
      { status: 400 }
    )
  }

  const estimate = await prisma.projectResourceEstimate.upsert({
    where: { projectId_department: { projectId, department } },
    update: {
      estimatedHours,
      plannedStart: plannedStart ? new Date(plannedStart) : null,
      plannedEnd: plannedEnd ? new Date(plannedEnd) : null,
      actualHours: actualHours ?? null,
      notes,
    },
    create: {
      projectId,
      department,
      estimatedHours,
      plannedStart: plannedStart ? new Date(plannedStart) : null,
      plannedEnd: plannedEnd ? new Date(plannedEnd) : null,
      actualHours: actualHours ?? null,
      notes,
    },
  })

  return NextResponse.json(JSON.parse(JSON.stringify(estimate)))
}
