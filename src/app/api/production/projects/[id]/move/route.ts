import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("production:manage")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()
  const { targetStage, isICUFlag, classification } = body

  const project = await prisma.project.findUnique({
    where: { id },
    include: { products: { select: { id: true, productionStatus: true } } },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}

  // Update swim lane (ICU flag or classification)
  if (isICUFlag !== undefined) {
    updates.isICUFlag = isICUFlag
    if (isICUFlag) updates.priority = "CRITICAL"
  }
  if (classification !== undefined) {
    updates.classification = classification
  }

  if (Object.keys(updates).length > 0) {
    await prisma.project.update({ where: { id }, data: updates })
  }

  // Move project to a new production stage
  if (targetStage) {
    // Update all production products to the new stage
    for (const product of project.products) {
      await prisma.product.update({
        where: { id: product.id },
        data: { productionStatus: targetStage },
      })
    }

    await logAudit({
      action: "UPDATE",
      entity: "Project",
      entityId: id,
      field: "productionStage",
      oldValue: project.products[0]?.productionStatus || null,
      newValue: targetStage,
      metadata: JSON.stringify({ productsUpdated: project.products.length }),
    })
  }

  if (isICUFlag !== undefined || classification !== undefined) {
    await logAudit({
      action: "UPDATE",
      entity: "Project",
      entityId: id,
      field: isICUFlag !== undefined ? "isICUFlag" : "classification",
      oldValue: isICUFlag !== undefined
        ? String(project.isICUFlag)
        : project.classification,
      newValue: isICUFlag !== undefined
        ? String(isICUFlag)
        : classification,
    })
  }

  return NextResponse.json({ success: true })
}
