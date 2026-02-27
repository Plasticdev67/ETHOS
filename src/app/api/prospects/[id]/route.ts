import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const prospect = await prisma.prospect.findUnique({
    where: { id },
    include: {
      opportunities: {
        orderBy: { sortOrder: "asc" },
      },
      convertedCustomer: { select: { id: true, name: true } },
      _count: { select: { opportunities: true } },
    },
  })

  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
  }

  return NextResponse.json(prospect)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  const fields = [
    "companyName", "contactName", "contactEmail", "contactPhone",
    "address", "sector", "source", "status", "notes",
  ]

  for (const field of fields) {
    if (body[field] !== undefined) {
      data[field] = body[field] === "" ? null : body[field]
    }
  }

  const prospect = await prisma.prospect.update({
    where: { id },
    data,
  })

  return NextResponse.json(prospect)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.prospect.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
