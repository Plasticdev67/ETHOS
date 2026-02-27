import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.json()

  const field = await prisma.specField.create({
    data: {
      typeId: body.typeId,
      name: body.name,
      code: body.code,
      fieldType: body.fieldType || "SELECT",
      required: body.required ?? false,
      sortOrder: body.sortOrder ?? 0,
      helpText: body.helpText || null,
      choices: body.choices
        ? {
            create: body.choices.map(
              (c: { label: string; value: string; isDefault?: boolean; costModifier?: number; costMultiplier?: number; sortOrder?: number }, i: number) => ({
                label: c.label,
                value: c.value,
                isDefault: c.isDefault ?? false,
                costModifier: c.costModifier ?? 0,
                costMultiplier: c.costMultiplier ?? 1,
                sortOrder: c.sortOrder ?? i,
              })
            ),
          }
        : undefined,
    },
    include: {
      choices: { orderBy: { sortOrder: "asc" } },
    },
  })

  return NextResponse.json(field, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()

  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 })
  }

  const field = await prisma.specField.update({
    where: { id: body.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.code !== undefined && { code: body.code }),
      ...(body.fieldType !== undefined && { fieldType: body.fieldType }),
      ...(body.required !== undefined && { required: body.required }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.helpText !== undefined && { helpText: body.helpText }),
    },
  })

  return NextResponse.json(field)
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 })
  }

  await prisma.specField.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
