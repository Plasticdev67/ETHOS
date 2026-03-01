import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { toDecimalOrDefault } from "@/lib/api-utils"
import {
  createBomItem,
  updateBomItem,
  deleteBomItem,
  type BomItemUpdateInput,
} from "@/lib/repositories/bom-items"

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("catalogue:edit")
  if (denied) return denied

  try {
    const body = await request.json()

    if (!body.variantId || !body.description) {
      return NextResponse.json(
        { error: "variantId and description are required" },
        { status: 400 }
      )
    }

    const item = await createBomItem({
      variantId: body.variantId,
      description: body.description,
      category: body.category || "MATERIALS",
      unitCost: toDecimalOrDefault(body.unitCost, 0),
      quantity: toDecimalOrDefault(body.quantity, 1),
      scalesWithSize: body.scalesWithSize ?? false,
      sortOrder: body.sortOrder ?? 0,
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error("Failed to create BOM item:", error)
    return NextResponse.json(
      { error: "Failed to create BOM item" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("catalogue:edit")
  if (denied) return denied

  try {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 })
    }

    const data: BomItemUpdateInput = {}
    if (body.description !== undefined) data.description = body.description
    if (body.category !== undefined) data.category = body.category
    if (body.unitCost !== undefined) data.unitCost = toDecimalOrDefault(body.unitCost, 0)
    if (body.quantity !== undefined) data.quantity = toDecimalOrDefault(body.quantity, 1)
    if (body.scalesWithSize !== undefined) data.scalesWithSize = body.scalesWithSize
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder

    const item = await updateBomItem(body.id, data)

    return NextResponse.json(item)
  } catch (error) {
    console.error("Failed to update BOM item:", error)
    return NextResponse.json(
      { error: "Failed to update BOM item" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("catalogue:edit")
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 })
    }

    await deleteBomItem(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete BOM item:", error)
    return NextResponse.json(
      { error: "Failed to delete BOM item" },
      { status: 500 }
    )
  }
}
