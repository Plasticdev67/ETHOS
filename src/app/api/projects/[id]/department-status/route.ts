import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("projects:edit")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()
  const { departmentStatus } = body

  const valid = ["TODO", "ONGOING", "REVIEW", "DONE"]
  if (!departmentStatus || !valid.includes(departmentStatus)) {
    return NextResponse.json({ error: "Invalid departmentStatus" }, { status: 400 })
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, projectStatus: true, designHandover: { select: { status: true } }, _count: { select: { designCards: true } } },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Block DONE for DESIGN when design cards exist — require handover flow
    if (
      departmentStatus === "DONE" &&
      project.projectStatus === "DESIGN" &&
      project._count.designCards > 0
    ) {
      if (!project.designHandover || project.designHandover.status !== "ACKNOWLEDGED") {
        return NextResponse.json(
          { error: "Design handover must be acknowledged before marking Design as Done. Use the handover flow instead." },
          { status: 400 }
        )
      }
    }

    // When marking DONE, advance the project to the next status
    const statusAdvance: Record<string, string> = {
      DESIGN: "DESIGN_FREEZE",
      DESIGN_FREEZE: "MANUFACTURE",
      MANUFACTURE: "INSTALLATION",
      INSTALLATION: "REVIEW",
    }

    const data: Record<string, unknown> = { departmentStatus }

    if (departmentStatus === "DONE" && statusAdvance[project.projectStatus]) {
      data.projectStatus = statusAdvance[project.projectStatus]
      data.departmentStatus = "TODO" // Reset for the next department

      // Set phase gate dates
      const now = new Date()
      if (project.projectStatus === "DESIGN") {
        data.p3Date = now // Design complete → enters freeze window
      } else if (project.projectStatus === "MANUFACTURE") {
        data.p4Date = now // Production complete
      } else if (project.projectStatus === "INSTALLATION") {
        data.p5Date = now // Installation complete
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)

  } catch (error) {
    console.error("PATCH /api/projects/[id]/department-status error:", error)
    return NextResponse.json({ error: "Failed to update department status" }, { status: 500 })
  }
}
