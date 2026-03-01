import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { toDecimal } from "@/lib/api-utils"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      customer: true,
      coordinator: true,
      projectManager: { select: { id: true, name: true } },
      installManager: { select: { id: true, name: true } },
      products: {
        include: {
          designer: { select: { name: true } },
          coordinator: { select: { name: true } },
        },
      },
      ncrs: {
        orderBy: { raisedDate: "desc" },
        include: {
          project: { select: { partCode: true, description: true } },
        },
      },
      _count: {
        select: { products: true, quotes: true, purchaseOrders: true, documents: true, ncrs: true },
      },
    },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json(project)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("projects:edit")
  if (denied) return denied

  try {
    const { id } = await params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    const fields = [
      "name", "customerId", "coordinatorId", "projectManagerId", "installManagerId",
      "projectType", "workStream", "salesStage", "projectStatus", "contractType",
      "siteLocation", "deliveryType", "projectRegion", "notes",
      "priority", "classification", "ragStatus", "projectSubStatus",
      "lifecycleStage", "departmentStatus",
    ]
    for (const field of fields) {
      if (body[field] !== undefined) data[field] = body[field]
    }
    // Handle empty strings for optional FK fields
    for (const fk of ["customerId", "coordinatorId", "projectManagerId", "installManagerId"]) {
      if (data[fk] === "") data[fk] = null
    }
    // Handle ragStatus empty
    if (data.ragStatus === "") data.ragStatus = null

    const dateFields = ["enquiryReceived", "quoteSubmitted", "orderReceived", "targetCompletion", "actualCompletion", "p0Date", "p1Date", "p2Date", "p3Date", "p4Date", "p5Date"]
    for (const field of dateFields) {
      if (body[field] !== undefined) data[field] = body[field] ? new Date(body[field]) : null
    }

    // Boolean fields
    if (body.isICUFlag !== undefined) data.isICUFlag = body.isICUFlag === true || body.isICUFlag === "true"

    // Decimal fields
    const decimalFields = ["estimatedValue", "contractValue", "currentCost"]
    for (const field of decimalFields) {
      if (body[field] !== undefined) data[field] = toDecimal(body[field])
    }

    const project = await prisma.project.update({
      where: { id },
      data,
    })

    revalidatePath("/projects")
    revalidatePath("/")

    return NextResponse.json(project)
  } catch (error) {
    console.error("PATCH /api/projects/[id] error:", error)
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("projects:edit")
  if (denied) return denied

  try {
    const { id } = await params
    await prisma.project.delete({ where: { id } })

    revalidatePath("/projects")
    revalidatePath("/")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}
