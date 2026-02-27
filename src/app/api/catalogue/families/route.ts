import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

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
        },
      },
    },
  })
  return NextResponse.json(families)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

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
}
