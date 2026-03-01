import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getNextSequenceNumber } from "@/lib/finance/sequences"
import { validateJournalLines } from "@/lib/finance/validation"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const source = searchParams.get("source")
    const search = searchParams.get("search")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10)

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (source) where.source = source
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {}
      if (dateFrom) dateFilter.gte = new Date(dateFrom)
      if (dateTo) dateFilter.lte = new Date(dateTo)
      where.date = dateFilter
    }
    if (search) {
      where.OR = [
        { entryNumber: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { reference: { contains: search, mode: "insensitive" } },
      ]
    }

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { lines: true } },
        },
      }),
      prisma.journalEntry.count({ where }),
    ])

    return NextResponse.json({
      data: entries,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error("Journals GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch journal entries" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user
    const denied = await requirePermission("finance:edit")
    if (denied) return denied

    const body = await request.json()

    const { date, description, reference, periodId, source, lines } = body

    if (!date || !description || !periodId || !lines || !Array.isArray(lines)) {
      return NextResponse.json(
        { error: "date, description, periodId, and lines are required" },
        { status: 400 }
      )
    }

    // Validate the period is open
    const period = await prisma.accountingPeriod.findUnique({
      where: { id: periodId },
    })
    if (!period) {
      return NextResponse.json(
        { error: "Accounting period not found" },
        { status: 404 }
      )
    }
    if (period.status === "PERIOD_CLOSED") {
      return NextResponse.json(
        { error: "Cannot post to a closed accounting period" },
        { status: 400 }
      )
    }
    if (period.status === "LOCKED") {
      return NextResponse.json(
        { error: "Cannot post to a locked accounting period" },
        { status: 400 }
      )
    }

    // Validate journal lines
    const validation = validateJournalLines(lines)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      )
    }

    // Generate entry number using sequence counter
    const entryNumber = await getNextSequenceNumber("journal")

    const entry = await prisma.journalEntry.create({
      data: {
        entryNumber,
        date: new Date(date),
        description,
        reference: reference || null,
        periodId,
        source: source || "MANUAL",
        status: "JOURNAL_DRAFT",
        totalDebit: validation.totalDebit.toNumber(),
        totalCredit: validation.totalCredit.toNumber(),
        createdBy: "system",
        lines: {
          create: lines.map(
            (line: {
              accountId: string
              description?: string
              debit?: number | string
              credit?: number | string
              vatCodeId?: string
              vatAmount?: number | string
              projectId?: string
              costCentreId?: string
            }) => ({
              accountId: line.accountId,
              description: line.description || null,
              debit: Number(line.debit || 0),
              credit: Number(line.credit || 0),
              vatCodeId: line.vatCodeId || null,
              vatAmount: line.vatAmount ? Number(line.vatAmount) : null,
              projectId: line.projectId || null,
              costCentreId: line.costCentreId || null,
            })
          ),
        },
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
    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error("Journal POST error:", error)
    return NextResponse.json(
      { error: "Failed to create journal entry" },
      { status: 500 }
    )
  }
}
