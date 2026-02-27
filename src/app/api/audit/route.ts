import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const entity = request.nextUrl.searchParams.get("entity")
  const entityId = request.nextUrl.searchParams.get("entityId")
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50")

  const where: Record<string, unknown> = {}
  if (entity) where.entity = entity
  if (entityId) where.entityId = entityId

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  })

  return NextResponse.json(logs)
}
