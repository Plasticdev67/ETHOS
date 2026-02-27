import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          coordinatedProjects: true,
          designedProducts: true,
          coordinatedProducts: true,
        },
      },
    },
  })
  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash: "placeholder",
      role: body.role || "STAFF",
    },
  })

  return NextResponse.json(user, { status: 201 })
}
