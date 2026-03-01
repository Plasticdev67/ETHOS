import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    // Build journal line filter
    const journalLineWhere: Record<string, unknown> = {
      projectId: projectId ? projectId : { not: null },
      journal: {
        status: "POSTED",
      },
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {}
      if (dateFrom) dateFilter.gte = new Date(dateFrom)
      if (dateTo) dateFilter.lte = new Date(dateTo)
      ;(journalLineWhere.journal as Record<string, unknown>).date = dateFilter
    }

    // Get all posted journal lines tagged with a project
    const journalLines = await prisma.journalLine.findMany({
      where: journalLineWhere,
      include: {
        journal: {
          select: {
            date: true,
            description: true,
          },
        },
        account: {
          select: {
            code: true,
            name: true,
            type: true,
          },
        },
      },
    })

    // Get all projects that have journal entries
    const projectIds = [...new Set(journalLines.map((jl) => jl.projectId).filter(Boolean))] as string[]

    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        contractValue: true,
        currentCost: true,
        estimatedValue: true,
      },
    })

    const projectMap = new Map(projects.map((p) => [p.id, p]))

    // Sum costs by project
    const costsByProject: Record<string, {
      totalDebit: number
      totalCredit: number
      lines: Array<{
        date: Date
        description: string
        accountCode: string
        accountName: string
        debit: number
        credit: number
      }>
    }> = {}

    for (const line of journalLines) {
      const pid = line.projectId!
      if (!costsByProject[pid]) {
        costsByProject[pid] = { totalDebit: 0, totalCredit: 0, lines: [] }
      }
      const debit = Number(line.debit)
      const credit = Number(line.credit)
      costsByProject[pid].totalDebit += debit
      costsByProject[pid].totalCredit += credit
      costsByProject[pid].lines.push({
        date: line.journal.date,
        description: line.description || line.journal.description,
        accountCode: line.account.code,
        accountName: line.account.name,
        debit: Math.round(debit * 100) / 100,
        credit: Math.round(credit * 100) / 100,
      })
    }

    // Build report
    const report = projectIds.map((pid) => {
      const project = projectMap.get(pid)
      const costs = costsByProject[pid]

      const actualCost = Math.round((costs.totalDebit - costs.totalCredit) * 100) / 100
      const budgeted = project ? Number(project.contractValue || project.estimatedValue || 0) : 0
      const variance = Math.round((budgeted - actualCost) * 100) / 100
      const variancePercent = budgeted !== 0
        ? Math.round(((budgeted - actualCost) / budgeted) * 10000) / 100
        : 0

      return {
        project: project
          ? {
              id: project.id,
              projectNumber: project.projectNumber,
              name: project.name,
              contractValue: project.contractValue ? Number(project.contractValue) : null,
              estimatedValue: project.estimatedValue ? Number(project.estimatedValue) : null,
            }
          : { id: pid, projectNumber: "Unknown", name: "Unknown Project", contractValue: null, estimatedValue: null },
        budgeted: Math.round(budgeted * 100) / 100,
        actual: actualCost,
        variance,
        variancePercent,
        transactionCount: costs.lines.length,
      }
    })

    // Sort by project number
    report.sort((a, b) => a.project.projectNumber.localeCompare(b.project.projectNumber))

    const totals = report.reduce(
      (acc, r) => ({
        budgeted: acc.budgeted + r.budgeted,
        actual: acc.actual + r.actual,
        variance: acc.variance + r.variance,
      }),
      { budgeted: 0, actual: 0, variance: 0 }
    )

    return NextResponse.json({
      report,
      totals: {
        budgeted: Math.round(totals.budgeted * 100) / 100,
        actual: Math.round(totals.actual * 100) / 100,
        variance: Math.round(totals.variance * 100) / 100,
        projectCount: report.length,
      },
    })
  } catch (error) {
    console.error("Failed to generate job costing report:", error)
    return NextResponse.json(
      { error: "Failed to generate job costing report" },
      { status: 500 }
    )
  }
}
