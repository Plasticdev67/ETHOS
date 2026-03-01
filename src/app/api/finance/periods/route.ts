import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET() {
  try {
    const periods = await prisma.accountingPeriod.findMany({
      orderBy: { startDate: "asc" },
      include: {
        _count: {
          select: { journalEntries: true, vatReturns: true },
        },
      },
    })

    return NextResponse.json(periods)
  } catch (error) {
    console.error("Periods GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch accounting periods" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { name, startDate, endDate, yearEnd } = body

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "name, startDate, and endDate are required" },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (end <= start) {
      return NextResponse.json(
        { error: "endDate must be after startDate" },
        { status: 400 }
      )
    }

    // Check for overlapping periods
    const overlap = await prisma.accountingPeriod.findFirst({
      where: {
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    })

    if (overlap) {
      return NextResponse.json(
        { error: `Period overlaps with existing period '${overlap.name}'` },
        { status: 409 }
      )
    }

    const period = await prisma.accountingPeriod.create({
      data: {
        name,
        startDate: start,
        endDate: end,
        yearEnd: yearEnd ?? false,
        status: "OPEN",
      },
    })

    revalidatePath("/finance")
    return NextResponse.json(period, { status: 201 })
  } catch (error) {
    console.error("Period POST error:", error)
    return NextResponse.json(
      { error: "Failed to create accounting period" },
      { status: 500 }
    )
  }
}
