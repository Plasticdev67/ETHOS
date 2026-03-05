import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const families = await (prisma.productFamily as any).findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      types: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { variants: true } },
          variants: {
            where: { active: true },
            orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
            select: {
              id: true,
              code: true,
              name: true,
              sageStockCode: true,
              defaultWidth: true,
              defaultHeight: true,
              typeId: true,
            },
          },
        },
      },
    },
  })

  // Add flat bomCodes array per family (all variants across all types)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched = families.map((f: any) => ({
    ...f,
    bomCodes: f.types.flatMap((t: any) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      t.variants.map((v: any) => ({
        id: v.id,
        code: v.code,
        name: v.name,
        sageStockCode: v.sageStockCode,
        defaultWidth: v.defaultWidth,
        defaultHeight: v.defaultHeight,
        typeId: v.typeId,
      }))
    ),
  }))

  return NextResponse.json(enriched)
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("catalogue:edit")
  if (denied) return denied

  const body = await request.json()

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const family = await (prisma.productFamily as any).create({
      data: {
        name: body.name,
        code: body.code,
        sortOrder: body.sortOrder ?? 0,
        active: body.active ?? true,
      },
    })

    return NextResponse.json(family, { status: 201 })
  } catch (error) {
    console.error("POST /api/catalogue/families error:", error)
    return NextResponse.json({ error: "Failed to create product family" }, { status: 500 })
  }
}
