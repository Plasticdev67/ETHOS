import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import type { BomCategory } from "@/generated/prisma/client"
import { findVariantsWithBom, findFirstVariantWithBom } from "@/lib/repositories/product-variants"
import { requireAuth, requirePermission } from "@/lib/api-auth"

/**
 * Auto-populate BOM from catalogue variant data.
 *
 * Tries two paths:
 *   1. Product → catalogueItem → variants → baseBomItems (direct link)
 *   2. Product description → keyword match to ProductType → first variant with baseBomItems
 *
 * If no catalogue BOM data exists, the BOM starts empty — the designer
 * adds lines manually or data is imported from Sage 200.
 */
async function autoPopulateBom(designCardId: string, productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { catalogueItemId: true, description: true },
  })
  if (!product) return

  let baseBomItems: Array<{ description: string; category: string; stockCode: string | null; unitCost: unknown; quantity: unknown; sortOrder: number }> = []

  // 1. Try catalogue path: product → catalogueItem → variants → baseBomItems
  if (product.catalogueItemId) {
    const variants = await findVariantsWithBom(product.catalogueItemId, 1)
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
      const words = t.name.toLowerCase().split(" ").filter((w: string) => w.length > 2)
      const score = words.filter((w: string) => desc.includes(w)).length
      if (score >= 2 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { id: t.id, score }
      }
    }
    if (bestMatch) {
      const variant = await findFirstVariantWithBom(bestMatch.id)
      if (variant && variant.baseBomItems.length > 0) {
        baseBomItems = variant.baseBomItems
      }
    }
  }

  // If we found catalogue BOM data, create the design BOM lines
  if (baseBomItems.length > 0) {
    const lineData = baseBomItems.map((item, i) => ({
      designCardId,
      description: item.description,
      category: item.category as BomCategory,
      partNumber: item.stockCode || null,
      quantity: Number(item.quantity) || 1,
      unitCost: Number(item.unitCost) || 0,
      unit: "each" as const,
      sortOrder: i,
    }))

    await prisma.designBomLine.createMany({ data: lineData })
  }
  // If no catalogue data exists, BOM starts empty — designer adds lines manually
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

  // Auto-populate from catalogue on first load (empty BOM only)
  if (designCard.bomLines.length === 0) {
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
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("design:manage")
  if (denied) return denied

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

  try {
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
  } catch (error) {
    console.error("POST /api/design/bom/[designCardId] error:", error)
    return NextResponse.json({ error: "Failed to create BOM line" }, { status: 500 })
  }
}

// PATCH /api/design/bom/:designCardId — Update a BOM line (pass line id in body)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ designCardId: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("design:manage")
  if (denied) return denied

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

  try {
    const updated = await prisma.designBomLine.update({
      where: { id: body.id },
      data,
    })

    revalidatePath("/design")

    return NextResponse.json(JSON.parse(JSON.stringify(updated)))
  } catch (error) {
    console.error("PATCH /api/design/bom/[designCardId] error:", error)
    return NextResponse.json({ error: "Failed to update BOM line" }, { status: 500 })
  }
}

// DELETE /api/design/bom/:designCardId — Delete a BOM line (pass line id in query)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ designCardId: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("design:manage")
  if (denied) return denied

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

  try {
    await prisma.designBomLine.delete({ where: { id: lineId } })

    revalidatePath("/design")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/design/bom/[designCardId] error:", error)
    return NextResponse.json({ error: "Failed to delete BOM line" }, { status: 500 })
  }
}
