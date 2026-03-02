import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { toDecimal } from "@/lib/api-utils"
import { getNextSequenceNumber } from "@/lib/finance/sequences"
import { recalcProjectNcrCost } from "@/lib/ncr-utils"
import { validateBody, isValidationError, ncrCreateSchema } from "@/lib/api-validation"

export async function GET(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")

  const where: Record<string, unknown> = { isArchived: false }
  if (projectId) where.projectId = projectId

  const ncrs = await prisma.nonConformanceReport.findMany({
    where,
    orderBy: { raisedDate: "desc" },
    include: {
      parentProject: { select: { id: true, projectNumber: true, name: true } },
      project: { select: { id: true, partCode: true, description: true } },
    },
  })

  return NextResponse.json(ncrs)
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("ncrs:create")
  if (denied) return denied

  try {
    const body = await validateBody(request, ncrCreateSchema)
    if (isValidationError(body)) return body

    const ncrNumber = await getNextSequenceNumber("ncr")

    const ncr = await prisma.nonConformanceReport.create({
      data: {
        ncrNumber,
        projectId: body.projectId,
        productId: body.productId || null,
        title: body.title,
        description: body.description || null,
        severity: body.severity || "MINOR",
        costImpact: toDecimal(body.costImpact),
        rootCause: body.rootCause || null,
        originStage: body.originStage || null,
        returnToStage: body.returnToStage || null,
      },
    })

    // Trigger design rework if requested
    if (body.requireDesignRework && body.productId) {
      const designCard = await prisma.productDesignCard.findUnique({
        where: { productId: body.productId },
        include: { jobCards: { select: { id: true, jobType: true, status: true } } },
      })

      if (designCard) {
        // Reset all non-BLOCKED job cards to require rework
        const jobTypes = designCard.jobCards
          .filter((j) => j.status !== "BLOCKED")
          .map((j) => j.jobType)

        if (jobTypes.length > 0) {
          // Call the NCR rework endpoint logic inline
          for (let i = 0; i < designCard.jobCards.length; i++) {
            const jc = designCard.jobCards[i]
            if (jc.status === "BLOCKED") continue
            await prisma.designJobCard.update({
              where: { id: jc.id },
              data: {
                status: i === 0 ? "IN_PROGRESS" : "READY",
                approvedAt: null,
                signedOffAt: null,
                submittedAt: null,
                rejectedAt: null,
                notes: `Rework required: NCR ${ncrNumber} — ${body.title}`,
              },
            })
          }
          await prisma.productDesignCard.update({
            where: { id: designCard.id },
            data: { status: "IN_PROGRESS" },
          })
        }
      }
    }

    // Recalculate project NCR cost total
    if (body.costImpact) {
      await recalcProjectNcrCost(body.projectId)
    }

    revalidatePath("/ncrs")
    revalidatePath("/projects")

    return NextResponse.json(ncr, { status: 201 })
  } catch (error) {
    console.error("Failed to create NCR:", error)
    return NextResponse.json(
      { error: "Failed to create NCR" },
      { status: 500 }
    )
  }
}
