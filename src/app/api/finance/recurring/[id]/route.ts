import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const template = await prisma.recurringTemplate.findUnique({
      where: { id },
      include: {
        lines: true,
      },
    })

    if (!template) {
      return NextResponse.json({ error: "Recurring template not found" }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error("Failed to fetch recurring template:", error)
    return NextResponse.json(
      { error: "Failed to fetch recurring template" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.recurringTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Recurring template not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.frequency !== undefined) updateData.frequency = body.frequency
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null
    if (body.maxRuns !== undefined) updateData.maxRuns = body.maxRuns ? parseInt(body.maxRuns) : null
    if (body.status !== undefined) updateData.status = body.status

    // Handle pause/resume
    if (body.action === "pause") {
      updateData.status = "REC_PAUSED"
    } else if (body.action === "resume") {
      updateData.status = "REC_ACTIVE"
    }

    const template = await prisma.recurringTemplate.update({
      where: { id },
      data: updateData,
      include: {
        lines: true,
      },
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error("Failed to update recurring template:", error)
    return NextResponse.json(
      { error: "Failed to update recurring template" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (body.action !== "run") {
      return NextResponse.json(
        { error: "Invalid action. Use action=run" },
        { status: 400 }
      )
    }

    const template = await prisma.recurringTemplate.findUnique({
      where: { id },
      include: { lines: true },
    })

    if (!template) {
      return NextResponse.json({ error: "Recurring template not found" }, { status: 404 })
    }

    if (template.status !== "REC_ACTIVE") {
      return NextResponse.json(
        { error: "Template is not active" },
        { status: 400 }
      )
    }

    // Check if max runs reached
    if (template.maxRuns && template.totalRuns >= template.maxRuns) {
      return NextResponse.json(
        { error: "Maximum number of runs reached" },
        { status: 400 }
      )
    }

    const runDate = body.date ? new Date(body.date) : new Date()
    const periodId = body.periodId

    if (!periodId) {
      return NextResponse.json(
        { error: "periodId is required to generate a journal entry" },
        { status: 400 }
      )
    }

    // Calculate totals from template lines
    const totalDebit = template.lines.reduce((sum, l) => sum + Number(l.debit), 0)
    const totalCredit = template.lines.reduce((sum, l) => sum + Number(l.credit), 0)

    // Generate journal entry
    const entryNumber = `REC-${template.id.slice(-6)}-${template.totalRuns + 1}`

    const journalEntry = await prisma.journalEntry.create({
      data: {
        entryNumber,
        date: runDate,
        periodId,
        description: template.description || template.name,
        source: template.source,
        sourceId: id,
        status: "POSTED",
        totalDebit,
        totalCredit,
        createdBy: body.createdBy || "system",
        postedAt: new Date(),
        lines: {
          create: template.lines.map((line) => ({
            accountId: line.accountId,
            description: line.description,
            debit: Number(line.debit),
            credit: Number(line.credit),
            vatCodeId: line.vatCodeId,
            costCentreId: line.costCentreId,
            projectId: line.projectId,
          })),
        },
      },
      include: {
        lines: true,
      },
    })

    // Calculate next run date
    const nextRunDate = new Date(runDate)
    switch (template.frequency) {
      case "WEEKLY":
        nextRunDate.setDate(nextRunDate.getDate() + 7)
        break
      case "FORTNIGHTLY":
        nextRunDate.setDate(nextRunDate.getDate() + 14)
        break
      case "REC_MONTHLY":
        nextRunDate.setMonth(nextRunDate.getMonth() + 1)
        break
      case "REC_QUARTERLY":
        nextRunDate.setMonth(nextRunDate.getMonth() + 3)
        break
      case "ANNUALLY":
        nextRunDate.setFullYear(nextRunDate.getFullYear() + 1)
        break
    }

    // Check if should expire
    const newTotalRuns = template.totalRuns + 1
    let newStatus: string = template.status
    if (template.maxRuns && newTotalRuns >= template.maxRuns) {
      newStatus = "REC_EXPIRED"
    } else if (template.endDate && nextRunDate > template.endDate) {
      newStatus = "REC_EXPIRED"
    }

    // Update template
    await prisma.recurringTemplate.update({
      where: { id },
      data: {
        lastRunDate: runDate,
        nextRunDate,
        totalRuns: newTotalRuns,
        status: newStatus as "REC_ACTIVE" | "REC_PAUSED" | "REC_EXPIRED",
      },
    })

    return NextResponse.json({
      journalEntry,
      template: {
        lastRunDate: runDate,
        nextRunDate,
        totalRuns: newTotalRuns,
        status: newStatus,
      },
    })
  } catch (error) {
    console.error("Failed to run recurring template:", error)
    return NextResponse.json(
      { error: "Failed to run recurring template" },
      { status: 500 }
    )
  }
}
