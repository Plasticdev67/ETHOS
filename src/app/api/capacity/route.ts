import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET /api/capacity — get department capacities
export async function GET() {
  const capacities = await prisma.departmentCapacity.findMany({
    orderBy: { department: "asc" },
  })
  return NextResponse.json(JSON.parse(JSON.stringify(capacities)))
}

// POST /api/capacity — upsert department capacity
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { department, displayName, hoursPerWeek, headcount, notes } = body

  if (!department || !displayName || hoursPerWeek == null) {
    return NextResponse.json({ error: "department, displayName, and hoursPerWeek are required" }, { status: 400 })
  }

  const capacity = await prisma.departmentCapacity.upsert({
    where: { department },
    update: { displayName, hoursPerWeek, headcount: headcount || 1, notes },
    create: { department, displayName, hoursPerWeek, headcount: headcount || 1, notes },
  })

  return NextResponse.json(JSON.parse(JSON.stringify(capacity)))
}
