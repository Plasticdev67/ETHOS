import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get("role")
  const available = searchParams.get("available")

  const where: Record<string, unknown> = {}
  if (role) where.role = role
  if (available !== null) where.isAvailable = available === "true"

  const workers = await prisma.worker.findMany({
    where,
    orderBy: { name: "asc" },
  })

  return NextResponse.json(workers)
}
