import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

// ═══════════════════ Product-Type-Specific BOM Templates ═══════════════════
type BomTemplate = Array<{ description: string; category: string; unitCost: number; sortOrder: number }>

const FLOOD_DOOR_BOM: BomTemplate = [
  { description: "Steel Door Frame", category: "MATERIALS", unitCost: 380, sortOrder: 1 },
  { description: "Door Leaf Assembly", category: "MATERIALS", unitCost: 520, sortOrder: 2 },
  { description: "Hinge Set (3-piece)", category: "HARDWARE", unitCost: 95, sortOrder: 3 },
  { description: "Multi-point Lock Assembly", category: "HARDWARE", unitCost: 145, sortOrder: 4 },
  { description: "EPDM Seal Kit", category: "SEALS", unitCost: 65, sortOrder: 5 },
  { description: "Threshold Assembly", category: "MATERIALS", unitCost: 110, sortOrder: 6 },
  { description: "Hot-Dip Galvanising", category: "FINISH", unitCost: 180, sortOrder: 7 },
  { description: "Frame Fixings Pack", category: "HARDWARE", unitCost: 35, sortOrder: 8 },
  { description: "Labour — Fabrication", category: "LABOUR", unitCost: 320, sortOrder: 9 },
  { description: "Labour — Assembly & Test", category: "LABOUR", unitCost: 180, sortOrder: 10 },
]

const DOUBLE_FLOOD_DOOR_BOM: BomTemplate = [
  { description: "Steel Door Frame (Double)", category: "MATERIALS", unitCost: 580, sortOrder: 1 },
  { description: "Door Leaf — Left Hand", category: "MATERIALS", unitCost: 480, sortOrder: 2 },
  { description: "Door Leaf — Right Hand", category: "MATERIALS", unitCost: 480, sortOrder: 3 },
  { description: "Hinge Sets (6-piece)", category: "HARDWARE", unitCost: 180, sortOrder: 4 },
  { description: "Multi-point Lock — Active Leaf", category: "HARDWARE", unitCost: 165, sortOrder: 5 },
  { description: "Flush Bolts — Passive Leaf", category: "HARDWARE", unitCost: 75, sortOrder: 6 },
  { description: "EPDM Seal Kit (Double)", category: "SEALS", unitCost: 95, sortOrder: 7 },
  { description: "Meeting Stile Seal", category: "SEALS", unitCost: 40, sortOrder: 8 },
  { description: "Threshold Assembly (Double)", category: "MATERIALS", unitCost: 165, sortOrder: 9 },
  { description: "Hot-Dip Galvanising", category: "FINISH", unitCost: 280, sortOrder: 10 },
  { description: "Frame Fixings Pack", category: "HARDWARE", unitCost: 45, sortOrder: 11 },
  { description: "Labour — Fabrication", category: "LABOUR", unitCost: 480, sortOrder: 12 },
  { description: "Labour — Assembly & Test", category: "LABOUR", unitCost: 240, sortOrder: 13 },
]

const FLOOD_GATE_BOM: BomTemplate = [
  { description: "Gate Frame / Posts", category: "MATERIALS", unitCost: 450, sortOrder: 1 },
  { description: "Gate Panel Assembly", category: "MATERIALS", unitCost: 620, sortOrder: 2 },
  { description: "Heavy-Duty Hinge Set", category: "HARDWARE", unitCost: 130, sortOrder: 3 },
  { description: "Drop Bar / Bolt Assembly", category: "HARDWARE", unitCost: 85, sortOrder: 4 },
  { description: "Latch / Lock Mechanism", category: "HARDWARE", unitCost: 110, sortOrder: 5 },
  { description: "EPDM Seal Kit — Perimeter", category: "SEALS", unitCost: 80, sortOrder: 6 },
  { description: "Ground Seal / Channel", category: "SEALS", unitCost: 55, sortOrder: 7 },
  { description: "Hot-Dip Galvanising", category: "FINISH", unitCost: 220, sortOrder: 8 },
  { description: "Foundation Fixings Pack", category: "HARDWARE", unitCost: 50, sortOrder: 9 },
  { description: "Labour — Fabrication", category: "LABOUR", unitCost: 400, sortOrder: 10 },
  { description: "Labour — Assembly & Test", category: "LABOUR", unitCost: 200, sortOrder: 11 },
]

const DOUBLE_FLOOD_GATE_BOM: BomTemplate = [
  { description: "Gate Frame / Posts (Double)", category: "MATERIALS", unitCost: 680, sortOrder: 1 },
  { description: "Gate Panel — Left", category: "MATERIALS", unitCost: 560, sortOrder: 2 },
  { description: "Gate Panel — Right", category: "MATERIALS", unitCost: 560, sortOrder: 3 },
  { description: "Heavy-Duty Hinge Sets (x2)", category: "HARDWARE", unitCost: 250, sortOrder: 4 },
  { description: "Central Drop Bar / Shoot Bolt", category: "HARDWARE", unitCost: 120, sortOrder: 5 },
  { description: "Latch / Lock Mechanism", category: "HARDWARE", unitCost: 110, sortOrder: 6 },
  { description: "EPDM Seal Kit — Perimeter", category: "SEALS", unitCost: 110, sortOrder: 7 },
  { description: "Meeting Stile Seal", category: "SEALS", unitCost: 45, sortOrder: 8 },
  { description: "Ground Seal / Channel (Double)", category: "SEALS", unitCost: 80, sortOrder: 9 },
  { description: "Hot-Dip Galvanising", category: "FINISH", unitCost: 340, sortOrder: 10 },
  { description: "Foundation Fixings Pack", category: "HARDWARE", unitCost: 65, sortOrder: 11 },
  { description: "Labour — Fabrication", category: "LABOUR", unitCost: 560, sortOrder: 12 },
  { description: "Labour — Assembly & Test", category: "LABOUR", unitCost: 280, sortOrder: 13 },
]

const PEDESTRIAN_GATE_BOM: BomTemplate = [
  { description: "Gate Frame / Posts", category: "MATERIALS", unitCost: 320, sortOrder: 1 },
  { description: "Pedestrian Gate Leaf", category: "MATERIALS", unitCost: 380, sortOrder: 2 },
  { description: "Hinge Set", category: "HARDWARE", unitCost: 85, sortOrder: 3 },
  { description: "Handle Set (Internal / External)", category: "HARDWARE", unitCost: 60, sortOrder: 4 },
  { description: "Lock / Latch", category: "HARDWARE", unitCost: 90, sortOrder: 5 },
  { description: "Self-Closer Mechanism", category: "HARDWARE", unitCost: 75, sortOrder: 6 },
  { description: "EPDM Seal Kit", category: "SEALS", unitCost: 55, sortOrder: 7 },
  { description: "Threshold Assembly", category: "MATERIALS", unitCost: 85, sortOrder: 8 },
  { description: "Hot-Dip Galvanising", category: "FINISH", unitCost: 150, sortOrder: 9 },
  { description: "Fixings Pack", category: "HARDWARE", unitCost: 30, sortOrder: 10 },
  { description: "Labour — Fabrication", category: "LABOUR", unitCost: 280, sortOrder: 11 },
  { description: "Labour — Assembly & Test", category: "LABOUR", unitCost: 150, sortOrder: 12 },
]

const FLOOD_WALL_BOM: BomTemplate = [
  { description: "Support Posts / Stanchions", category: "MATERIALS", unitCost: 420, sortOrder: 1 },
  { description: "Wall Panels / Boards", category: "MATERIALS", unitCost: 650, sortOrder: 2 },
  { description: "Panel Capping / Edge Trim", category: "MATERIALS", unitCost: 80, sortOrder: 3 },
  { description: "Post Base Plates", category: "MATERIALS", unitCost: 90, sortOrder: 4 },
  { description: "Panel-to-Post Clamp / Seal", category: "SEALS", unitCost: 95, sortOrder: 5 },
  { description: "Ground Seal Strip", category: "SEALS", unitCost: 60, sortOrder: 6 },
  { description: "Panel Gaskets", category: "SEALS", unitCost: 45, sortOrder: 7 },
  { description: "Hot-Dip Galvanising", category: "FINISH", unitCost: 250, sortOrder: 8 },
  { description: "Foundation Fixings Pack", category: "HARDWARE", unitCost: 55, sortOrder: 9 },
  { description: "Labour — Fabrication", category: "LABOUR", unitCost: 360, sortOrder: 10 },
  { description: "Labour — Assembly & Test", category: "LABOUR", unitCost: 200, sortOrder: 11 },
]

const BLAST_DOOR_BOM: BomTemplate = [
  { description: "Blast-Rated Steel Frame", category: "MATERIALS", unitCost: 680, sortOrder: 1 },
  { description: "Blast Door Leaf (Reinforced)", category: "MATERIALS", unitCost: 950, sortOrder: 2 },
  { description: "Heavy-Duty Blast Hinges", category: "HARDWARE", unitCost: 220, sortOrder: 3 },
  { description: "Blast-Rated Lock Assembly", category: "HARDWARE", unitCost: 280, sortOrder: 4 },
  { description: "Pressure-Rated Seal Kit", category: "SEALS", unitCost: 140, sortOrder: 5 },
  { description: "Blast Threshold Assembly", category: "MATERIALS", unitCost: 160, sortOrder: 6 },
  { description: "Hot-Dip Galvanising", category: "FINISH", unitCost: 280, sortOrder: 7 },
  { description: "Frame Fixings Pack (HD)", category: "HARDWARE", unitCost: 55, sortOrder: 8 },
  { description: "Labour — Fabrication", category: "LABOUR", unitCost: 520, sortOrder: 9 },
  { description: "Labour — Assembly & Pressure Test", category: "LABOUR", unitCost: 320, sortOrder: 10 },
]

const SLIDING_GATE_BOM: BomTemplate = [
  { description: "Guide Rail / Track", category: "MATERIALS", unitCost: 380, sortOrder: 1 },
  { description: "Sliding Gate Panel", category: "MATERIALS", unitCost: 720, sortOrder: 2 },
  { description: "Roller Carriage Assembly", category: "HARDWARE", unitCost: 180, sortOrder: 3 },
  { description: "End Stop / Buffer", category: "HARDWARE", unitCost: 45, sortOrder: 4 },
  { description: "Locking / Clamping Mechanism", category: "HARDWARE", unitCost: 130, sortOrder: 5 },
  { description: "EPDM Seal Kit — Perimeter", category: "SEALS", unitCost: 90, sortOrder: 6 },
  { description: "Ground Seal / Channel", category: "SEALS", unitCost: 65, sortOrder: 7 },
  { description: "Hot-Dip Galvanising", category: "FINISH", unitCost: 260, sortOrder: 8 },
  { description: "Foundation Fixings Pack", category: "HARDWARE", unitCost: 55, sortOrder: 9 },
  { description: "Labour — Fabrication", category: "LABOUR", unitCost: 450, sortOrder: 10 },
  { description: "Labour — Assembly & Test", category: "LABOUR", unitCost: 220, sortOrder: 11 },
]

const BUND_GATE_BOM: BomTemplate = [
  { description: "Bund Gate Frame", category: "MATERIALS", unitCost: 350, sortOrder: 1 },
  { description: "Gate Panel / Leaf", category: "MATERIALS", unitCost: 420, sortOrder: 2 },
  { description: "Hinge Set", category: "HARDWARE", unitCost: 95, sortOrder: 3 },
  { description: "Latch / Bolt Assembly", category: "HARDWARE", unitCost: 80, sortOrder: 4 },
  { description: "EPDM Seal Kit", category: "SEALS", unitCost: 60, sortOrder: 5 },
  { description: "Ground Channel / Cill", category: "MATERIALS", unitCost: 75, sortOrder: 6 },
  { description: "Hot-Dip Galvanising", category: "FINISH", unitCost: 170, sortOrder: 7 },
  { description: "Foundation Fixings Pack", category: "HARDWARE", unitCost: 40, sortOrder: 8 },
  { description: "Labour — Fabrication", category: "LABOUR", unitCost: 300, sortOrder: 9 },
  { description: "Labour — Assembly & Test", category: "LABOUR", unitCost: 160, sortOrder: 10 },
]

// Generic fallback for anything else
const GENERIC_BARRIER_BOM: BomTemplate = [
  { description: "Primary Structure / Frame", category: "MATERIALS", unitCost: 400, sortOrder: 1 },
  { description: "Panel / Leaf Assembly", category: "MATERIALS", unitCost: 500, sortOrder: 2 },
  { description: "Hardware Set", category: "HARDWARE", unitCost: 150, sortOrder: 3 },
  { description: "Seal Kit", category: "SEALS", unitCost: 70, sortOrder: 4 },
  { description: "Hot-Dip Galvanising", category: "FINISH", unitCost: 200, sortOrder: 5 },
  { description: "Fixings Pack", category: "HARDWARE", unitCost: 40, sortOrder: 6 },
  { description: "Labour — Fabrication", category: "LABOUR", unitCost: 350, sortOrder: 7 },
  { description: "Labour — Assembly & Test", category: "LABOUR", unitCost: 180, sortOrder: 8 },
]

// Keyword-based matching: check product description to pick the right template
function getTemplateForProduct(description: string): BomTemplate {
  const d = description.toLowerCase()

  // Blast doors (check before generic "door")
  if (d.includes("blast")) return BLAST_DOOR_BOM

  // Bund gates (check before generic "gate")
  if (d.includes("bund")) return BUND_GATE_BOM

  // Sliding gates
  if (d.includes("sliding") || d.includes("slide")) return SLIDING_GATE_BOM

  // Pedestrian gates
  if (d.includes("pedestrian")) return PEDESTRIAN_GATE_BOM

  // Flood walls / barriers (not doors or gates)
  if (d.includes("wall") || d.includes("barrier") || d.includes("panel")) return FLOOD_WALL_BOM

  // Double flood gates
  if (d.includes("double") && d.includes("gate")) return DOUBLE_FLOOD_GATE_BOM

  // Single flood gates
  if (d.includes("gate")) return FLOOD_GATE_BOM

  // Double flood doors
  if (d.includes("double") && d.includes("door")) return DOUBLE_FLOOD_DOOR_BOM

  // Single flood doors (and any other "door")
  if (d.includes("door")) return FLOOD_DOOR_BOM

  return GENERIC_BARRIER_BOM
}

// Check if existing BOM was auto-generated with the old generic template
function isOldGenericTemplate(lines: Array<{ description: string }>): boolean {
  if (lines.length !== 10) return false
  const oldFirstItems = ["Steel Frame", "Panel / Leaf", "Hinge Set"]
  return oldFirstItems.every((name, i) => lines[i]?.description === name)
}

// Auto-populate BOM from catalogue or type-specific template
async function autoPopulateBom(designCardId: string, productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { catalogueItemId: true, description: true },
  })
  if (!product) return

  let baseBomItems: Array<{ description: string; category: string; stockCode: string | null; unitCost: unknown; quantity: unknown; sortOrder: number }> = []

  // 1. Try catalogue path: product → catalogueItem → variants → baseBomItems
  if (product.catalogueItemId) {
    const variants = await prisma.productVariant.findMany({
      where: { catalogueItemId: product.catalogueItemId },
      include: { baseBomItems: { orderBy: { sortOrder: "asc" } } },
      take: 1,
    })
    if (variants.length > 0 && variants[0].baseBomItems.length > 0) {
      baseBomItems = variants[0].baseBomItems
    }
  }

  // 2. Try keyword match to ProductType → first variant with baseBomItems
  if (baseBomItems.length === 0) {
    const desc = product.description.toLowerCase()
    const types = await prisma.productType.findMany({
      select: { id: true, name: true, code: true },
    })
    // Score each type by how many of its name words appear in the product description
    let bestMatch: { id: string; score: number } | null = null
    for (const t of types) {
      const words = t.name.toLowerCase().split(" ").filter((w) => w.length > 2)
      const score = words.filter((w) => desc.includes(w)).length
      if (score >= 2 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { id: t.id, score }
      }
    }
    if (bestMatch) {
      const variant = await prisma.productVariant.findFirst({
        where: { typeId: bestMatch.id },
        include: { baseBomItems: { orderBy: { sortOrder: "asc" } } },
      })
      if (variant && variant.baseBomItems.length > 0) {
        baseBomItems = variant.baseBomItems
      }
    }
  }

  // 3. Build lines — from catalogue or from type-specific template
  const lineData = baseBomItems.length > 0
    ? baseBomItems.map((item, i) => ({
        designCardId,
        description: item.description,
        category: item.category,
        partNumber: item.stockCode || null,
        quantity: Number(item.quantity) || 1,
        unitCost: Number(item.unitCost) || 0,
        unit: "each" as const,
        sortOrder: i,
      }))
    : getTemplateForProduct(product.description).map((item) => ({
        designCardId,
        description: item.description,
        category: item.category,
        partNumber: null,
        quantity: 1,
        unitCost: item.unitCost,
        unit: "each" as const,
        sortOrder: item.sortOrder,
      }))

  await prisma.designBomLine.createMany({ data: lineData })
}

// GET /api/design/bom/:designCardId — Get all BOM lines for a design card
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ designCardId: string }> }
) {
  const { designCardId } = await params

  const designCard = await prisma.productDesignCard.findUnique({
    where: { id: designCardId },
    select: {
      id: true,
      product: {
        select: { id: true, description: true, partCode: true, productJobNumber: true },
      },
      bomLines: {
        orderBy: { sortOrder: "asc" },
      },
    },
  })

  if (!designCard) {
    return NextResponse.json({ error: "Design card not found" }, { status: 404 })
  }

  // Auto-populate from catalogue on first load, or replace old generic template
  const needsPopulate = designCard.bomLines.length === 0
  const needsReplace = !needsPopulate && isOldGenericTemplate(designCard.bomLines)

  if (needsPopulate || needsReplace) {
    if (needsReplace) {
      // Delete old generic BOM lines before re-populating
      await prisma.designBomLine.deleteMany({ where: { designCardId } })
    }
    await autoPopulateBom(designCardId, designCard.product.id)
    // Re-fetch with newly created lines
    const refreshed = await prisma.productDesignCard.findUnique({
      where: { id: designCardId },
      select: {
        id: true,
        product: {
          select: { id: true, description: true, partCode: true, productJobNumber: true },
        },
        bomLines: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })
    return NextResponse.json(JSON.parse(JSON.stringify(refreshed)))
  }

  return NextResponse.json(JSON.parse(JSON.stringify(designCard)))
}

// POST /api/design/bom/:designCardId — Add a BOM line
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ designCardId: string }> }
) {
  const { designCardId } = await params

  const card = await prisma.productDesignCard.findUnique({ where: { id: designCardId } })
  if (!card) {
    return NextResponse.json({ error: "Design card not found" }, { status: 404 })
  }

  const body = await request.json()

  // Get next sort order
  const lastLine = await prisma.designBomLine.findFirst({
    where: { designCardId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  })
  const nextSort = (lastLine?.sortOrder ?? -1) + 1

  const line = await prisma.designBomLine.create({
    data: {
      designCardId,
      description: body.description || "New item",
      category: body.category || "MATERIALS",
      partNumber: body.partNumber || null,
      supplier: body.supplier || null,
      quantity: body.quantity ?? 1,
      unit: body.unit || "each",
      unitCost: body.unitCost ?? 0,
      notes: body.notes || null,
      sortOrder: nextSort,
    },
  })

  revalidatePath("/design")

  return NextResponse.json(JSON.parse(JSON.stringify(line)), { status: 201 })
}

// PATCH /api/design/bom/:designCardId — Update a BOM line (pass line id in body)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ designCardId: string }> }
) {
  const { designCardId } = await params
  const body = await request.json()

  if (!body.id) {
    return NextResponse.json({ error: "Line id is required" }, { status: 400 })
  }

  // Verify the line belongs to this design card
  const existing = await prisma.designBomLine.findFirst({
    where: { id: body.id, designCardId },
  })
  if (!existing) {
    return NextResponse.json({ error: "BOM line not found" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}
  if (body.description !== undefined) data.description = body.description
  if (body.category !== undefined) data.category = body.category
  if (body.partNumber !== undefined) data.partNumber = body.partNumber || null
  if (body.supplier !== undefined) data.supplier = body.supplier || null
  if (body.quantity !== undefined) data.quantity = body.quantity
  if (body.unit !== undefined) data.unit = body.unit
  if (body.unitCost !== undefined) data.unitCost = body.unitCost
  if (body.notes !== undefined) data.notes = body.notes || null
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder

  const updated = await prisma.designBomLine.update({
    where: { id: body.id },
    data,
  })

  revalidatePath("/design")

  return NextResponse.json(JSON.parse(JSON.stringify(updated)))
}

// DELETE /api/design/bom/:designCardId — Delete a BOM line (pass line id in query)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ designCardId: string }> }
) {
  const { designCardId } = await params
  const { searchParams } = new URL(request.url)
  const lineId = searchParams.get("lineId")

  if (!lineId) {
    return NextResponse.json({ error: "lineId query param is required" }, { status: 400 })
  }

  const existing = await prisma.designBomLine.findFirst({
    where: { id: lineId, designCardId },
  })
  if (!existing) {
    return NextResponse.json({ error: "BOM line not found" }, { status: 404 })
  }

  await prisma.designBomLine.delete({ where: { id: lineId } })

  revalidatePath("/design")

  return NextResponse.json({ success: true })
}
