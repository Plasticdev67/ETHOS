
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { computeBomCost } from "@/lib/bom-calculator"
import type { BomItem, BomModifier, CatalogueSpecChoice } from "@/lib/catalogue-types"
import { requireAuth, requirePermission } from "@/lib/api-auth"

/**
 * POST /api/opportunities/[id]/configure
 *
 * BOM preview for CRM quote builder. Receives variantId + specSelections + dimensions,
 * returns computed BOM + cost + real BOM components/operations from imported data.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("crm:edit")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()

  // Validate opportunity exists
  const opp = await prisma.opportunity.findUnique({ where: { id }, select: { id: true } })
  if (!opp) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 })
  }

  const { variantId, specSelections, width, height } = body

  if (!variantId) {
    return NextResponse.json({ error: "variantId required" }, { status: 400 })
  }

  try {
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

  // --- Fetch real BOM components and operations from imported data ---
  // If variant has a direct Sage stock code, use exact match; otherwise prefix match by type code
  const typeCode = variant.type.code as string
  const sageStockCode = variant.sageStockCode as string | null

  const bomHeaders = await prisma.sageBomHeader.findMany({
    where: sageStockCode
      ? { headerRef: sageStockCode }
      : { headerRef: { startsWith: `${typeCode}-` } },
    include: {
      components: {
        orderBy: { sequenceNo: "asc" },
        include: {
          stockItem: {
            select: {
              name: true,
              productGroup: true,
              materialComposition: true,
              itemSetType: true,
            },
          },
        },
      },
      operations: {
        orderBy: { sequenceNo: "asc" },
      },
    },
  })

  // Flatten components from all matching headers
  const realComponents = bomHeaders.flatMap((header) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    header.components.map((comp: any) => ({
      headerRef: header.headerRef,
      headerDescription: header.description,
      stockCode: comp.stockCode,
      description: comp.description || comp.stockItem?.name || comp.stockCode,
      quantity: Number(comp.quantity),
      unitOfMeasure: comp.unitOfMeasure,
      sequenceNo: comp.sequenceNo,
      scrapPercent: Number(comp.scrapPercent),
      fixedQuantity: comp.fixedQuantity,
      productGroup: comp.stockItem?.productGroup,
      materialComposition: comp.stockItem?.materialComposition,
      itemSetType: comp.stockItem?.itemSetType,
    }))
  )

  // Flatten operations from all matching headers
  const realOperations = bomHeaders.flatMap((header) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    header.operations.map((op: any) => ({
      headerRef: header.headerRef,
      sequenceNo: op.sequenceNo,
      operationRef: op.operationRef,
      operationDescription: op.operationDescription,
      isSubcontract: op.isSubcontract,
      runTimeMinutes: op.runTimeHours * 60 + op.runTimeMinutes + op.runTimeSeconds / 60,
      labourDescription: op.labourDescription,
      labourRate: op.labourRate ? Number(op.labourRate) : null,
      labourMinutes: op.labourHours * 60 + op.labourMinutes + op.labourSeconds / 60,
      setupMinutes: op.setupHours * 60 + op.setupMinutes + op.setupSeconds / 60,
      machineRef: op.machineRef,
      machineDescription: op.machineDescription,
    }))
  )

  // --- Calculate shop floor labour cost from BOO ---
  const SHOP_FLOOR_RATE = 17 // £17 per hour
  const totalLabourHours = realOperations.reduce(
    (sum, op) => sum + op.labourMinutes / 60,
    0
  )
  const labourCost = Math.round(totalLabourHours * SHOP_FLOOR_RATE * 100) / 100

  return NextResponse.json({
    variantCode: variant.code,
    variantName: variant.name,
    typeCode,
    defaultWidth: variant.defaultWidth,
    defaultHeight: variant.defaultHeight,
    computedBom: result.items,
    computedCost: result.totalCost,
    // BOO labour cost
    labourCost,
    totalLabourHours: Math.round(totalLabourHours * 100) / 100,
    shopFloorRate: SHOP_FLOOR_RATE,
    // Real BOM data from imported database
    bomHeaders: bomHeaders.map((h) => ({
      headerRef: h.headerRef,
      description: h.description,
      componentCount: h.components.length,
      operationCount: h.operations.length,
    })),
    realComponents,
    realOperations,
  })
  } catch (error) {
    console.error("POST /api/opportunities/[id]/configure error:", error)
    return NextResponse.json({ error: "Failed to compute BOM configuration" }, { status: 500 })
  }
}
