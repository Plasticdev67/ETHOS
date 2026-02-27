import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const [projects, designCards, productionTasks, installProducts] = await Promise.all([
    prisma.project.findMany({
      where: { salesStage: "ORDER" },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        projectStatus: true,
        p2Date: true,
        p3Date: true,
        p4Date: true,
        customer: { select: { name: true } },
        designHandover: { select: { acknowledgedAt: true } },
      },
      orderBy: { projectNumber: "asc" },
    }),
    prisma.productDesignCard.findMany({
      select: {
        projectId: true,
        actualStartDate: true,
        actualEndDate: true,
        actualHours: true,
        jobCards: { select: { actualHours: true } },
      },
    }),
    prisma.productionTask.findMany({
      where: { status: { in: ["COMPLETED", "IN_PROGRESS"] } },
      select: {
        projectId: true,
        actualMins: true,
      },
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { installPlannedStart: { not: null } },
          { installCompletionDate: { not: null } },
        ],
      },
      select: {
        projectId: true,
        installPlannedStart: true,
        installCompletionDate: true,
      },
    }),
  ])

  // Group by projectId
  const designByProject = new Map<string, typeof designCards>()
  for (const card of designCards) {
    const arr = designByProject.get(card.projectId) || []
    arr.push(card)
    designByProject.set(card.projectId, arr)
  }

  const prodMinsByProject = new Map<string, number>()
  for (const task of productionTasks) {
    const current = prodMinsByProject.get(task.projectId) || 0
    prodMinsByProject.set(task.projectId, current + (task.actualMins || 0))
  }

  const installByProject = new Map<string, typeof installProducts>()
  for (const prod of installProducts) {
    const arr = installByProject.get(prod.projectId) || []
    arr.push(prod)
    installByProject.set(prod.projectId, arr)
  }

  const summaries = projects.map((project) => {
    const cards = designByProject.get(project.id) || []
    const prodMins = prodMinsByProject.get(project.id) || 0
    const installs = installByProject.get(project.id) || []

    // --- DESIGN ---
    let designStart: Date | null = null
    let designEnd: Date | null = null
    let designWorkHours = 0

    for (const card of cards) {
      if (card.actualStartDate) {
        if (!designStart || card.actualStartDate < designStart) designStart = card.actualStartDate
      }
      if (card.actualEndDate) {
        if (!designEnd || card.actualEndDate > designEnd) designEnd = card.actualEndDate
      }
      if (card.actualHours) {
        designWorkHours += Number(card.actualHours)
      } else {
        for (const jc of card.jobCards) {
          if (jc.actualHours) designWorkHours += Number(jc.actualHours)
        }
      }
    }

    // Use handover acknowledgedAt as end if later
    if (project.designHandover?.acknowledgedAt) {
      const ack = project.designHandover.acknowledgedAt
      if (!designEnd || ack > designEnd) designEnd = ack
    }

    // Fallback to project milestones
    if (!designStart && project.p2Date) designStart = project.p2Date
    if (!designEnd && project.p3Date) designEnd = project.p3Date

    const designDays = calendarDays(designStart, designEnd)

    // --- PRODUCTION ---
    const prodDays = calendarDays(project.p3Date, project.p4Date)
    const prodWorkHours = prodMins > 0 ? Math.round((prodMins / 60) * 10) / 10 : null

    // --- INSTALLATION ---
    let installStart: Date | null = null
    let installEnd: Date | null = null
    for (const p of installs) {
      if (p.installPlannedStart) {
        if (!installStart || p.installPlannedStart < installStart) installStart = p.installPlannedStart
      }
      if (p.installCompletionDate) {
        if (!installEnd || p.installCompletionDate > installEnd) installEnd = p.installCompletionDate
      }
    }
    const installDays = calendarDays(installStart, installEnd)

    // --- TOTAL ---
    const allStarts = [designStart, project.p3Date, installStart].filter(Boolean) as Date[]
    const allEnds = [designEnd, project.p4Date, installEnd].filter(Boolean) as Date[]
    const overallStart = allStarts.length > 0 ? new Date(Math.min(...allStarts.map((d) => d.getTime()))) : null
    const overallEnd = allEnds.length > 0 ? new Date(Math.max(...allEnds.map((d) => d.getTime()))) : null
    const totalDays = calendarDays(overallStart, overallEnd)

    return {
      projectId: project.id,
      projectNumber: project.projectNumber,
      projectName: project.name,
      customerName: project.customer?.name || "—",
      projectStatus: project.projectStatus,
      designDays,
      designHours: designWorkHours > 0 ? Math.round(designWorkHours * 10) / 10 : null,
      prodDays,
      prodHours: prodWorkHours,
      installDays,
      totalDays,
    }
  })

  // Only return projects with at least one duration value
  const filtered = summaries.filter(
    (s) => s.designDays !== null || s.prodDays !== null || s.installDays !== null
  )

  return NextResponse.json(filtered)
}

function calendarDays(start: Date | null | undefined, end: Date | null | undefined): number | null {
  if (!start || !end) return null
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}
