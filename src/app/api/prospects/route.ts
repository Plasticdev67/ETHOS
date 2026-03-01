import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  const where: Record<string, unknown> = {}
  if (status) where.status = status

  const prospects = await prisma.prospect.findMany({
    where,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      convertedCustomer: { select: { id: true, name: true } },
      _count: { select: { opportunities: true } },
    },
  })

  return NextResponse.json(prospects)
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("crm:edit")
  if (denied) return denied

  const body = await request.json()

  try {
    const prospect = await prisma.prospect.create({
      data: {
        companyName: body.companyName,
        contactName: body.contactName || null,
        contactEmail: body.contactEmail || null,
        contactPhone: body.contactPhone || null,
        address: body.address || null,
        sector: body.sector || null,
        source: body.source || "OTHER",
        status: body.status || "ACTIVE",
        notes: body.notes || null,
      },
    })

    await logAudit({
      action: "CREATE",
      entity: "Prospect",
      entityId: prospect.id,
      metadata: prospect.companyName,
    })

    return NextResponse.json(prospect, { status: 201 })

  } catch (error) {
    console.error("POST /api/prospects error:", error)
    return NextResponse.json({ error: "Failed to create prospect" }, { status: 500 })
  }
}
