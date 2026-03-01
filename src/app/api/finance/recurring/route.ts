import { prisma } from "@/lib/db"
import { toDecimalOrDefault } from "@/lib/api-utils"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    const templates = await prisma.recurringTemplate.findMany({
      where,
      include: {
        lines: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Failed to fetch recurring templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch recurring templates" },
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

    const {
      name,
      description,
      frequency,
      startDate,
      endDate,
      maxRuns,
      lines,
      createdBy,
    } = body

    if (!name || !frequency || !startDate || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: name, frequency, startDate, lines" },
        { status: 400 }
      )
    }

    // Validate that debits equal credits
    const totalDebit = lines.reduce((sum: number, l: { debit?: number }) => sum + (parseFloat(String(l.debit)) || 0), 0)
    const totalCredit = lines.reduce((sum: number, l: { credit?: number }) => sum + (parseFloat(String(l.credit)) || 0), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: "Total debits must equal total credits" },
        { status: 400 }
      )
    }

    const template = await prisma.recurringTemplate.create({
      data: {
        name,
        description: description || null,
        frequency,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        nextRunDate: new Date(startDate),
        maxRuns: maxRuns ? parseInt(maxRuns) : null,
        status: "REC_ACTIVE",
        createdBy: createdBy || "system",
        lines: {
          create: lines.map((line: {
            accountId: string
            description?: string
            debit?: number
            credit?: number
            vatCodeId?: string
            costCentreId?: string
            projectId?: string
          }) => ({
            accountId: line.accountId,
            description: line.description || null,
            debit: toDecimalOrDefault(line.debit, 0),
            credit: toDecimalOrDefault(line.credit, 0),
            vatCodeId: line.vatCodeId || null,
            costCentreId: line.costCentreId || null,
            projectId: line.projectId || null,
          })),
        },
      },
      include: {
        lines: true,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error("Failed to create recurring template:", error)
    return NextResponse.json(
      { error: "Failed to create recurring template" },
      { status: 500 }
    )
  }
}
