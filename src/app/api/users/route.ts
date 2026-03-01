import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

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
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("settings:admin")
  if (denied) return denied

  try {
    const body = await request.json()

    const newUser = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: "placeholder",
        role: body.role || "STAFF",
      },
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error("POST /api/users error:", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}
