import { prisma } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { toDecimal } from "@/lib/api-utils"
import { getNextSequenceNumber } from "@/lib/finance/sequences"
import { validateBody, isValidationError, variationCreateSchema } from "@/lib/api-validation"

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")
  const where = projectId ? { projectId } : {}

  const variations = await prisma.variation.findMany({
    where,
    include: { project: { select: { projectNumber: true, name: true } } },
    orderBy: { dateRaised: "desc" },
  })

  return NextResponse.json(JSON.parse(JSON.stringify(variations)))
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("variations:create")
  if (denied) return denied

  try {
    const body = await validateBody(request, variationCreateSchema)
    if (isValidationError(body)) return body

    const variationNumber = await getNextSequenceNumber("variation")

    const variation = await prisma.variation.create({
      data: {
        variationNumber,
        projectId: body.projectId,
        title: body.title,
        description: body.description || null,
        type: body.type || "CLIENT_INSTRUCTION",
        costImpact: toDecimal(body.costImpact),
        valueImpact: toDecimal(body.valueImpact),
        raisedBy: body.raisedBy || null,
        notes: body.notes || null,
      },
    })

    await logAudit({
      action: "CREATE",
      entity: "Variation",
      entityId: variation.id,
      newValue: `${variationNumber}: ${body.title}`,
    })

    revalidatePath("/finance")
    revalidatePath("/projects")

    return NextResponse.json(JSON.parse(JSON.stringify(variation)))
  } catch (error) {
    console.error("Failed to create variation:", error)
    return NextResponse.json(
      { error: "Failed to create variation" },
      { status: 500 }
    )
  }
}
