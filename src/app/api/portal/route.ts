import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"

// Generate portal access token for a customer
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { customerId, projectId, expiryDays } = body

  if (!customerId) {
    return NextResponse.json({ error: "customerId required" }, { status: 400 })
  }

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + (expiryDays || 30))

  const portalToken = await prisma.customerPortalToken.create({
    data: {
      customerId,
      projectId: projectId || null,
      token,
      expiresAt,
    },
  })

  return NextResponse.json({
    ...portalToken,
    portalUrl: `/portal/${token}`,
  })
}

// List portal tokens
export async function GET(request: NextRequest) {
  const customerId = request.nextUrl.searchParams.get("customerId")

  const tokens = await prisma.customerPortalToken.findMany({
    where: customerId ? { customerId } : {},
    include: {
      customer: { select: { name: true } },
      project: { select: { projectNumber: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(tokens)
}
