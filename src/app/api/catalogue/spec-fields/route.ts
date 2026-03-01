import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import {
  createSpecField,
  updateSpecField,
  deleteSpecField,
  type SpecFieldUpdateInput,
} from "@/lib/repositories/spec-fields"

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("catalogue:edit")
  if (denied) return denied

  try {
    const body = await request.json()

    if (!body.typeId || !body.name || !body.code) {
      return NextResponse.json(
        { error: "typeId, name, and code are required" },
        { status: 400 }
      )
    }

    const field = await createSpecField({
      typeId: body.typeId,
      name: body.name,
      code: body.code,
      fieldType: body.fieldType || "SELECT",
      required: body.required ?? false,
      sortOrder: body.sortOrder ?? 0,
      helpText: body.helpText || null,
      choices: body.choices,
    })

    return NextResponse.json(field, { status: 201 })
  } catch (error) {
    console.error("Failed to create spec field:", error)
    return NextResponse.json(
      { error: "Failed to create spec field" },
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

    const data: SpecFieldUpdateInput = {}
    if (body.name !== undefined) data.name = body.name
    if (body.code !== undefined) data.code = body.code
    if (body.fieldType !== undefined) data.fieldType = body.fieldType
    if (body.required !== undefined) data.required = body.required
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
    if (body.helpText !== undefined) data.helpText = body.helpText

    const field = await updateSpecField(body.id, data)

    return NextResponse.json(field)
  } catch (error) {
    console.error("Failed to update spec field:", error)
    return NextResponse.json(
      { error: "Failed to update spec field" },
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

    await deleteSpecField(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete spec field:", error)
    return NextResponse.json(
      { error: "Failed to delete spec field" },
      { status: 500 }
    )
  }
}
