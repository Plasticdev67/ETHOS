import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user

    const { id } = await params

    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        period: {
          select: { id: true, name: true, startDate: true, endDate: true, status: true },
        },
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
            vatCode: { select: { id: true, code: true, name: true, rate: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!entry) {
      return NextResponse.json(
        { error: "Journal entry not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(entry)
  } catch (error) {
    console.error("Journal GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch journal entry" },
      { status: 500 }
    )
  }
}
