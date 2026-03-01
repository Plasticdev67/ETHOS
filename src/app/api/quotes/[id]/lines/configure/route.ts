import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { computeBomCost } from "@/lib/bom-calculator"
import type { BomItem, BomModifier, CatalogueSpecChoice } from "@/lib/catalogue-types"
import { requireAuth, requirePermission } from "@/lib/api-auth"

/**
 * POST /api/quotes/[id]/lines/configure
 *
 * Receives variantId + specSelections + dimensions and returns
 * computed BOM + cost preview. Does NOT create a line.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("quotes:edit")
  if (denied) return denied

  await params // validate quote context exists
  const body = await request.json()

  const { variantId, specSelections, width, height } = body

  if (!variantId) {
    return NextResponse.json({ error: "variantId required" }, { status: 400 })
  }

  // Fetch variant with BOM and type spec data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variant = await (prisma.productVariant as any).findUnique({
    where: { id: variantId },
    include: {
      type: {
        include: {
          specFields: {
            include: {
              choices: true,
            },
          },
        },
      },
      baseBomItems: {
        orderBy: { sortOrder: "asc" },
        include: {
          modifiers: true,
        },
      },
    },
  })

  if (!variant) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 })
  }

  // Collect all choices and modifiers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allChoices: CatalogueSpecChoice[] = variant.type.specFields.flatMap((f: any) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    f.choices.map((c: any) => ({
      id: c.id,
      fieldId: c.fieldId,
      label: c.label,
      value: c.value,
      isDefault: c.isDefault,
      costModifier: Number(c.costModifier),
      costMultiplier: Number(c.costMultiplier),
      sortOrder: c.sortOrder,
    }))
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseBom: BomItem[] = variant.baseBomItems.map((b: any) => ({
    id: b.id,
    variantId: b.variantId,
    description: b.description,
    category: b.category as BomItem["category"],
    unitCost: Number(b.unitCost),
    quantity: Number(b.quantity),
    scalesWithSize: b.scalesWithSize,
    sortOrder: b.sortOrder,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modifiers: BomModifier[] = variant.baseBomItems.flatMap((b: any) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    b.modifiers.map((m: any) => ({
      id: m.id,
      bomItemId: m.bomItemId,
      choiceId: m.choiceId,
      action: m.action as BomModifier["action"],
      value: Number(m.value),
      description: m.description,
    }))
  )

  const result = computeBomCost(
    baseBom,
    specSelections || {},
    modifiers,
    allChoices,
    width ?? variant.defaultWidth,
    height ?? variant.defaultHeight,
    variant.defaultWidth,
    variant.defaultHeight
  )

  return NextResponse.json({
    variantCode: variant.code,
    variantName: variant.name,
    defaultWidth: variant.defaultWidth,
    defaultHeight: variant.defaultHeight,
    computedBom: result.items,
    computedCost: result.totalCost,
  })
}
