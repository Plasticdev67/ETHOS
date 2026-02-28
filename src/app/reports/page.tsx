import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { isManagerOrDirector } from "@/lib/permissions"
import { Suspense } from "react"
import { ReportsTabs } from "@/components/reports/reports-tabs"
import { WorkstreamPerformance } from "@/components/reports/workstream-performance"
import { PeoplePerformance } from "@/components/reports/people-performance"
import { TimingDelivery } from "@/components/reports/timing-delivery"
import { PipelineFinancials } from "@/components/reports/pipeline-financials"
import { formatCurrency, prettifyEnum } from "@/lib/utils"
import { ShieldAlert } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 120

// ── Helper: days between two dates ──
function daysBetween(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24))
}

// ── Workstream data ──
async function getWorkstreamData() {
  const WORKSTREAMS = ["COMMUNITY", "UTILITIES", "BESPOKE", "BLAST", "BUND_CONTAINMENT", "REFURBISHMENT"]

  const [completedProjects, designCards, products, ncrs] = await Promise.all([
    prisma.project.findMany({
      where: { projectStatus: { not: "OPPORTUNITY" } },
      select: {
        workStream: true,
        contractValue: true,
        currentCost: true,
        ncrCost: true,
        targetCompletion: true,
        actualCompletion: true,
        projectStatus: true,
        _count: { select: { ncrs: true } },
      },
    }),
    prisma.productDesignCard.findMany({
      where: { status: "COMPLETE" },
      select: {
        actualStartDate: true,
        actualEndDate: true,
        project: { select: { workStream: true } },
      },
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { productionCompletionDate: { not: null } },
          { installCompletionDate: { not: null } },
        ],
      },
      select: {
        productionPlannedStart: true,
        productionCompletionDate: true,
        installPlannedStart: true,
        installCompletionDate: true,
        project: { select: { workStream: true } },
      },
    }),
    prisma.nonConformanceReport.findMany({
      select: {
        costImpact: true,
        parentProject: { select: { workStream: true } },
      },
    }),
  ])

  return WORKSTREAMS.map((ws) => {
    const wsProjects = completedProjects.filter((p) => p.workStream === ws)
    const projectCount = wsProjects.length

    // Margin
    const projectsWithFinancials = wsProjects.filter(
      (p) => Number(p.contractValue) > 0 && Number(p.currentCost) > 0
    )
    const avgMargin =
      projectsWithFinancials.length > 0
        ? projectsWithFinancials.reduce((sum, p) => {
            const contract = Number(p.contractValue)
            const cost = Number(p.currentCost) + Number(p.ncrCost || 0)
            return sum + ((contract - cost) / contract) * 100
          }, 0) / projectsWithFinancials.length
        : 0

    // Design duration
    const wsDesignCards = designCards.filter((c) => c.project.workStream === ws)
    const designDays = wsDesignCards
      .map((c) => daysBetween(c.actualStartDate, c.actualEndDate))
      .filter((d): d is number => d !== null)
    const avgDesignDays = designDays.length > 0 ? designDays.reduce((a, b) => a + b, 0) / designDays.length : null

    // Production duration
    const wsProducts = products.filter((p) => p.project.workStream === ws)
    const prodDays = wsProducts
      .map((p) => daysBetween(p.productionPlannedStart, p.productionCompletionDate))
      .filter((d): d is number => d !== null)
    const avgProductionDays = prodDays.length > 0 ? prodDays.reduce((a, b) => a + b, 0) / prodDays.length : null

    // Install duration
    const installDays = wsProducts
      .map((p) => daysBetween(p.installPlannedStart, p.installCompletionDate))
      .filter((d): d is number => d !== null)
    const avgInstallDays = installDays.length > 0 ? installDays.reduce((a, b) => a + b, 0) / installDays.length : null

    // On-time delivery
    const completed = wsProjects.filter(
      (p) => p.projectStatus === "COMPLETE" && p.actualCompletion && p.targetCompletion
    )
    const onTime = completed.filter(
      (p) => new Date(p.actualCompletion!) <= new Date(p.targetCompletion!)
    )
    const onTimePercent = completed.length > 0 ? (onTime.length / completed.length) * 100 : null

    // NCR
    const wsNcrs = ncrs.filter((n) => n.parentProject.workStream === ws)
    const ncrRate = projectCount > 0 ? wsNcrs.length / projectCount : 0
    const ncrCost = wsNcrs.reduce((sum, n) => sum + Number(n.costImpact || 0), 0)

    return {
      workStream: ws,
      projectCount,
      avgMargin,
      avgDesignDays,
      avgProductionDays,
      avgInstallDays,
      onTimePercent,
      ncrRate,
      ncrCost,
    }
  })
}

// ── People data ──
async function getPeopleData() {
  const [designCards, jobCards, projects] = await Promise.all([
    prisma.productDesignCard.findMany({
      select: {
        status: true,
        actualStartDate: true,
        actualEndDate: true,
        estimatedHours: true,
        actualHours: true,
        assignedDesigner: { select: { id: true, name: true } },
      },
    }),
    prisma.designJobCard.findMany({
      select: {
        status: true,
        assignedTo: { select: { id: true, name: true } },
      },
    }),
    prisma.project.findMany({
      where: { projectManagerId: { not: null } },
      select: {
        projectStatus: true,
        contractValue: true,
        currentCost: true,
        ncrCost: true,
        targetCompletion: true,
        actualCompletion: true,
        projectManager: { select: { id: true, name: true } },
        _count: { select: { ncrs: true } },
      },
    }),
  ])

  // Designer metrics
  const designerMap = new Map<string, { name: string; cards: typeof designCards; jobs: typeof jobCards }>()
  for (const card of designCards) {
    if (!card.assignedDesigner) continue
    const { id, name } = card.assignedDesigner
    if (!designerMap.has(id)) designerMap.set(id, { name: name || "Unknown", cards: [], jobs: [] })
    designerMap.get(id)!.cards.push(card)
  }
  for (const job of jobCards) {
    if (!job.assignedTo) continue
    const { id } = job.assignedTo
    if (designerMap.has(id)) designerMap.get(id)!.jobs.push(job)
  }

  const designers = Array.from(designerMap.entries()).map(([id, { name, cards, jobs }]) => {
    const completed = cards.filter((c) => c.status === "COMPLETE")
    const inProgress = cards.filter((c) => c.status === "IN_PROGRESS" || c.status === "REVIEW")
    const completionDays = completed
      .map((c) => daysBetween(c.actualStartDate, c.actualEndDate))
      .filter((d): d is number => d !== null)
    const avgCompletionDays = completionDays.length > 0 ? completionDays.reduce((a, b) => a + b, 0) / completionDays.length : null

    const withHours = completed.filter((c) => Number(c.estimatedHours) > 0 && Number(c.actualHours) > 0)
    const hoursAccuracy =
      withHours.length > 0
        ? withHours.reduce((sum, c) => sum + Number(c.actualHours) / Number(c.estimatedHours), 0) / withHours.length
        : null

    const submitted = jobs.filter((j) => ["SUBMITTED", "APPROVED", "SIGNED_OFF", "REJECTED"].includes(j.status))
    const rejected = jobs.filter((j) => j.status === "REJECTED")
    const rejectionRate = submitted.length > 0 ? (rejected.length / submitted.length) * 100 : 0

    return {
      id,
      name,
      cardsCompleted: completed.length,
      cardsInProgress: inProgress.length,
      avgCompletionDays,
      hoursAccuracy,
      rejectionRate,
    }
  }).sort((a, b) => b.cardsCompleted - a.cardsCompleted)

  // PM metrics
  const pmMap = new Map<string, { name: string; projects: typeof projects }>()
  for (const p of projects) {
    if (!p.projectManager) continue
    const { id, name } = p.projectManager
    if (!pmMap.has(id)) pmMap.set(id, { name: name || "Unknown", projects: [] })
    pmMap.get(id)!.projects.push(p)
  }

  const projectManagers = Array.from(pmMap.entries()).map(([id, { name, projects: pmProjects }]) => {
    const active = pmProjects.filter((p) => p.projectStatus !== "COMPLETE")
    const completed = pmProjects.filter((p) => p.projectStatus === "COMPLETE")
    const completedWithDates = completed.filter((p) => p.actualCompletion && p.targetCompletion)
    const onTime = completedWithDates.filter(
      (p) => new Date(p.actualCompletion!) <= new Date(p.targetCompletion!)
    )
    const onTimePercent = completedWithDates.length > 0 ? (onTime.length / completedWithDates.length) * 100 : null

    const withFinancials = pmProjects.filter((p) => Number(p.contractValue) > 0)
    const avgMargin =
      withFinancials.length > 0
        ? withFinancials.reduce((sum, p) => {
            const contract = Number(p.contractValue)
            const cost = Number(p.currentCost || 0) + Number(p.ncrCost || 0)
            return sum + (contract > 0 ? ((contract - cost) / contract) * 100 : 0)
          }, 0) / withFinancials.length
        : 0

    const ncrCount = pmProjects.reduce((sum, p) => sum + p._count.ncrs, 0)

    return {
      id,
      name,
      activeProjects: active.length,
      completedProjects: completed.length,
      onTimePercent,
      avgMargin,
      ncrCount,
    }
  }).sort((a, b) => b.completedProjects - a.completedProjects)

  return { designers, projectManagers }
}

// ── Timing data ──
async function getTimingData() {
  const now = new Date()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [designCards, products, completedProjects, overdueProjects] = await Promise.all([
    prisma.productDesignCard.findMany({
      where: { status: "COMPLETE" },
      select: { actualStartDate: true, actualEndDate: true, estimatedHours: true, actualHours: true },
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { designCompletionDate: { not: null } },
          { productionCompletionDate: { not: null } },
          { installCompletionDate: { not: null } },
        ],
      },
      select: {
        designPlannedStart: true,
        designCompletionDate: true,
        productionPlannedStart: true,
        productionCompletionDate: true,
        productionEstimatedHours: true,
        installPlannedStart: true,
        installCompletionDate: true,
      },
    }),
    prisma.project.findMany({
      where: { projectStatus: "COMPLETE", actualCompletion: { not: null } },
      select: { actualCompletion: true, targetCompletion: true, orderReceived: true },
    }),
    prisma.project.findMany({
      where: {
        targetCompletion: { lt: now },
        projectStatus: { notIn: ["COMPLETE", "OPPORTUNITY"] },
      },
      orderBy: { targetCompletion: "asc" },
      take: 20,
      select: { id: true, projectNumber: true, name: true, targetCompletion: true },
    }),
  ])

  // Stage cycle times
  const designDays = designCards
    .map((c) => daysBetween(c.actualStartDate, c.actualEndDate))
    .filter((d): d is number => d !== null)
  const avgDesignDays = designDays.length > 0 ? designDays.reduce((a, b) => a + b, 0) / designDays.length : null

  const prodDays = products
    .map((p) => daysBetween(p.productionPlannedStart, p.productionCompletionDate))
    .filter((d): d is number => d !== null)
  const avgProductionDays = prodDays.length > 0 ? prodDays.reduce((a, b) => a + b, 0) / prodDays.length : null

  const instDays = products
    .map((p) => daysBetween(p.installPlannedStart, p.installCompletionDate))
    .filter((d): d is number => d !== null)
  const avgInstallDays = instDays.length > 0 ? instDays.reduce((a, b) => a + b, 0) / instDays.length : null

  // Lead time
  const leadTimes = completedProjects
    .map((p) => daysBetween(p.orderReceived, p.actualCompletion))
    .filter((d): d is number => d !== null && d > 0)
  const avgLeadTimeDays = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : null

  // Hours accuracy
  const designWithHours = designCards.filter((c) => Number(c.estimatedHours) > 0 && Number(c.actualHours) > 0)
  const designHoursAccuracy =
    designWithHours.length > 0
      ? designWithHours.reduce((sum, c) => sum + Number(c.actualHours) / Number(c.estimatedHours), 0) / designWithHours.length
      : null

  const prodWithHours = products.filter(
    (p) => Number(p.productionEstimatedHours) > 0 && p.productionCompletionDate
  )
  const productionHoursAccuracy = null // No actual production hours tracked at product level yet

  // On-time
  const withDates = completedProjects.filter((p) => p.targetCompletion)
  const onTime = withDates.filter(
    (p) => new Date(p.actualCompletion!) <= new Date(p.targetCompletion!)
  )
  const overallOnTimePercent = withDates.length > 0 ? (onTime.length / withDates.length) * 100 : null

  // Monthly on-time trend (last 6 months)
  const monthlyOnTime: { month: string; percent: number; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
    const monthCompleted = completedProjects.filter((p) => {
      const comp = new Date(p.actualCompletion!)
      return comp >= d && comp <= monthEnd && p.targetCompletion
    })
    const monthOnTime = monthCompleted.filter(
      (p) => new Date(p.actualCompletion!) <= new Date(p.targetCompletion!)
    )
    if (monthCompleted.length > 0) {
      monthlyOnTime.push({
        month: label,
        percent: (monthOnTime.length / monthCompleted.length) * 100,
        total: monthCompleted.length,
      })
    }
  }

  // Overdue
  const overdueList = overdueProjects
    .filter((p) => p.targetCompletion !== null)
    .map((p) => ({
      id: p.id,
      projectNumber: p.projectNumber,
      name: p.name,
      targetCompletion: p.targetCompletion!,
      daysOverdue: Math.ceil((now.getTime() - new Date(p.targetCompletion!).getTime()) / (1000 * 60 * 60 * 24)),
    }))

  return {
    avgDesignDays,
    avgProductionDays,
    avgInstallDays,
    avgLeadTimeDays,
    designHoursAccuracy,
    productionHoursAccuracy,
    overallOnTimePercent,
    monthlyOnTime,
    overdueProjects: overdueList,
  }
}

// ── Pipeline data ──
async function getPipelineData() {
  const [projects, quotes, ncrs, recentQuotes] = await Promise.all([
    prisma.project.findMany({
      select: {
        id: true,
        projectNumber: true,
        name: true,
        projectStatus: true,
        salesStage: true,
        workStream: true,
        estimatedValue: true,
        contractValue: true,
        currentCost: true,
        ncrCost: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.quote.findMany({
      select: { status: true, totalCost: true, totalSell: true, overallMargin: true },
    }),
    prisma.nonConformanceReport.findMany({
      select: { severity: true, status: true, costImpact: true },
    }),
    prisma.quote.findMany({
      take: 20,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        totalSell: true,
        overallMargin: true,
        customer: { select: { name: true } },
      },
    }),
  ])

  const pipelineByStage: Record<string, { count: number; value: number }> = {}
  const pipelineByWorkStream: Record<string, { count: number; value: number }> = {}
  for (const p of projects) {
    const stage = p.salesStage
    if (!pipelineByStage[stage]) pipelineByStage[stage] = { count: 0, value: 0 }
    pipelineByStage[stage].count++
    pipelineByStage[stage].value += Number(p.contractValue || p.estimatedValue || 0)

    const ws = p.workStream
    if (!pipelineByWorkStream[ws]) pipelineByWorkStream[ws] = { count: 0, value: 0 }
    pipelineByWorkStream[ws].count++
    pipelineByWorkStream[ws].value += Number(p.contractValue || p.estimatedValue || 0)
  }

  const totalPipeline = projects.reduce((sum, p) => sum + Number(p.contractValue || p.estimatedValue || 0), 0)
  const orderValue = projects
    .filter((p) => p.salesStage === "ORDER")
    .reduce((sum, p) => sum + Number(p.contractValue || p.estimatedValue || 0), 0)

  const quoteStats = {
    total: quotes.length,
    draft: quotes.filter((q) => q.status === "DRAFT").length,
    submitted: quotes.filter((q) => q.status === "SUBMITTED").length,
    accepted: quotes.filter((q) => q.status === "ACCEPTED").length,
    declined: quotes.filter((q) => q.status === "DECLINED").length,
    revised: quotes.filter((q) => q.status === "REVISED").length,
  }
  const conversionRate =
    quoteStats.accepted + quoteStats.declined > 0
      ? (quoteStats.accepted / (quoteStats.accepted + quoteStats.declined)) * 100
      : 0

  const quotesWithMargin = quotes.filter((q) => Number(q.totalSell) > 0)
  const avgMargin =
    quotesWithMargin.length > 0
      ? quotesWithMargin.reduce((sum, q) => sum + (Number(q.overallMargin) || 0), 0) / quotesWithMargin.length
      : 0
  const totalQuoteValue = quotesWithMargin.reduce((sum, q) => sum + Number(q.totalSell), 0)

  const ncrStats = {
    total: ncrs.length,
    open: ncrs.filter((n) => n.status === "OPEN" || n.status === "INVESTIGATING").length,
    minor: ncrs.filter((n) => n.severity === "MINOR").length,
    major: ncrs.filter((n) => n.severity === "MAJOR").length,
    critical: ncrs.filter((n) => n.severity === "CRITICAL").length,
    totalCost: ncrs.reduce((sum, n) => sum + (Number(n.costImpact) || 0), 0),
  }

  const profitableProjects = projects
    .filter((p) => Number(p.contractValue) > 0 && Number(p.currentCost) > 0)
    .map((p) => {
      const contract = Number(p.contractValue)
      const cost = Number(p.currentCost) + (Number(p.ncrCost) || 0)
      const profit = contract - cost
      const margin = contract > 0 ? (profit / contract) * 100 : 0
      return {
        id: p.id,
        projectNumber: p.projectNumber,
        name: p.name,
        projectStatus: p.projectStatus,
        customer: p.customer?.name || "—",
        contract,
        cost,
        profit,
        margin,
      }
    })
    .sort((a, b) => a.margin - b.margin)

  const formattedQuotes = recentQuotes.map((q) => ({
    id: q.id,
    quoteNumber: q.quoteNumber,
    status: q.status,
    customer: q.customer.name,
    sell: Number(q.totalSell) || 0,
    margin: Number(q.overallMargin) || 0,
  }))

  return {
    totalPipeline,
    orderValue,
    conversionRate,
    avgMargin,
    quoteStats,
    totalQuoteValue,
    pipelineByStage,
    pipelineByWorkStream,
    ncrStats,
    profitableProjects,
    recentQuotes: formattedQuotes,
  }
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  // Role gate
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role || "STAFF"

  if (!isManagerOrDirector(role)) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <ShieldAlert className="h-12 w-12 text-gray-300" />
        <h1 className="text-xl font-semibold text-gray-700">Access Restricted</h1>
        <p className="text-sm text-gray-500">Reports are available to Management and Directors only.</p>
      </div>
    )
  }

  const params = await searchParams
  const tab = params.tab || "workstream"

  // Fetch data based on active tab to avoid unnecessary queries
  const [workstreamData, peopleData, timingData, pipelineData] = await Promise.all([
    tab === "workstream" ? getWorkstreamData() : Promise.resolve(null),
    tab === "people" ? getPeopleData() : Promise.resolve(null),
    tab === "timing" ? getTimingData() : Promise.resolve(null),
    tab === "pipeline" ? getPipelineData() : Promise.resolve(null),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reports & KPIs</h1>
        <p className="text-sm text-gray-500">Performance metrics across workstreams, people, and delivery</p>
      </div>

      <ReportsTabs />

      <Suspense fallback={<div className="py-12 text-center text-gray-400">Loading...</div>}>
        {tab === "workstream" && workstreamData && (
          <WorkstreamPerformance data={workstreamData} />
        )}
        {tab === "people" && peopleData && (
          <PeoplePerformance designers={peopleData.designers} projectManagers={peopleData.projectManagers} />
        )}
        {tab === "timing" && timingData && (
          <TimingDelivery data={timingData} />
        )}
        {tab === "pipeline" && pipelineData && (
          <PipelineFinancials data={pipelineData} />
        )}
      </Suspense>
    </div>
  )
}
