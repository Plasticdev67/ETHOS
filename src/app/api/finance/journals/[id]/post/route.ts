import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user
    const denied = await requirePermission("finance:edit")
    if (denied) return denied

    const { id } = await params

    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: { period: true },
    })

    if (!entry) {
      return NextResponse.json(
        { error: "Journal entry not found" },
        { status: 404 }
      )
    }

    if (entry.status !== "JOURNAL_DRAFT") {
      return NextResponse.json(
        { error: `Cannot post entry with status '${entry.status}'. Only JOURNAL_DRAFT entries can be posted.` },
        { status: 400 }
      )
    }

    if (entry.period.status === "PERIOD_CLOSED") {
      return NextResponse.json(
        { error: "Cannot post to a closed accounting period" },
        { status: 400 }
      )
    }

    if (entry.period.status === "LOCKED") {
      return NextResponse.json(
        { error: "Cannot post to a locked accounting period" },
        { status: 400 }
      )
    }

    const updated = await prisma.journalEntry.update({
      where: { id },
      data: {
        status: "POSTED",
        postingDate: new Date(),
        postedAt: new Date(),
      },
      include: {
        lines: {
          include: {
            account: { select: { code: true, name: true } },
          },
        },
      },
    })

    revalidatePath("/finance")
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Journal POST (post) error:", error)
    return NextResponse.json(
      { error: "Failed to post journal entry" },
      { status: 500 }
    )
  }
}
