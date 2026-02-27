import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const jobCard = await prisma.designJobCard.findUnique({
    where: { id },
    include: {
      designCard: {
        include: {
          jobCards: true,
          project: {
            select: { id: true, projectNumber: true, projectStatus: true },
          },
        },
      },
    },
  })

  if (!jobCard) {
    return NextResponse.json({ error: "Job card not found" }, { status: 404 })
  }

  if (jobCard.status !== "APPROVED") {
    return NextResponse.json(
      { error: `Cannot sign off: current status is ${jobCard.status}, expected APPROVED` },
      { status: 400 }
    )
  }

  const now = new Date()

  // Update job card status to SIGNED_OFF
  const updated = await prisma.designJobCard.update({
    where: { id },
    data: {
      status: "SIGNED_OFF",
      signedOffAt: now,
    },
  })

  // Check if ALL job cards on this design card are now SIGNED_OFF
  const allSignedOff = jobCard.designCard.jobCards.every(
    (jc) => jc.id === id ? true : jc.status === "SIGNED_OFF"
  )

  let designCardCompleted = false
  let projectAdvanced = false

  if (allSignedOff) {
    // Mark this design card as COMPLETE
    await prisma.productDesignCard.update({
      where: { id: jobCard.designCardId },
      data: {
        status: "COMPLETE",
        actualEndDate: now,
      },
    })
    designCardCompleted = true

    // Check if ALL design cards in the project are now COMPLETE
    const projectId = jobCard.designCard.projectId
    const remainingIncomplete = await prisma.productDesignCard.count({
      where: {
        projectId,
        status: { not: "COMPLETE" },
        id: { not: jobCard.designCardId }, // exclude the one we just completed
      },
    })

    if (remainingIncomplete === 0) {
      // All products in this project have completed design — advance project
      const project = jobCard.designCard.project
      if (project.projectStatus === "DESIGN") {
        await prisma.project.update({
          where: { id: projectId },
          data: { projectStatus: "DESIGN_FREEZE" },
        })
        projectAdvanced = true

        await logAudit({
          action: "UPDATE",
          entity: "Project",
          entityId: projectId,
          field: "projectStatus",
          oldValue: "DESIGN",
          newValue: "DESIGN_FREEZE",
          metadata: JSON.stringify({
            reason: "All design cards completed — auto-advanced from DESIGN to DESIGN_FREEZE",
          }),
        })
      }
    }
  }

  await logAudit({
    action: "UPDATE",
    entity: "DesignJobCard",
    entityId: id,
    field: "status",
    oldValue: "APPROVED",
    newValue: "SIGNED_OFF",
    metadata: JSON.stringify({
      designCardId: jobCard.designCardId,
      designCardCompleted,
      projectAdvanced,
    }),
  })

  revalidatePath("/design")
  return NextResponse.json(updated)
}
