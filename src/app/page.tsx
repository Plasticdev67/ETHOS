import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  TrendingUp,
  PoundSterling,
  FileText,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import { formatDate, formatCurrency, getProjectStatusColor, prettifyEnum, calculateScheduleRag, getRagColor } from "@/lib/utils"
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { ICUCarousel } from "@/components/dashboard/icu-carousel"
import { DepartmentSales } from "@/components/dashboard/department-sales"
import { DepartmentDesign } from "@/components/dashboard/department-design"
import { DepartmentProduction } from "@/components/dashboard/department-production"
import { DepartmentInstallation } from "@/components/dashboard/department-installation"
import { DepartmentFinance } from "@/components/dashboard/department-finance"
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines"
import { DashboardWorkstreamPerformance } from "@/components/dashboard/workstream-performance"
import { TabSales } from "@/components/dashboard/tab-sales"
import { TabDesign } from "@/components/dashboard/tab-design"
import { TabProduction } from "@/components/dashboard/tab-production"
import { TabInstallation } from "@/components/dashboard/tab-installation"
import { auth } from "@/lib/auth"
import { isManagerOrDirector } from "@/lib/permissions"

export const dynamic = 'force-dynamic'
export const revalidate = 60

// ─── Workstream label helper ─────────────────────────────────────────────────
const WS_LABELS: Record<string, string> = {
  COMMUNITY: "Community",
  UTILITIES: "Utilities",
  BESPOKE: "Bespoke",
  BLAST: "Blast",
  BUND_CONTAINMENT: "Bund Containment",
  REFURBISHMENT: "Refurbishment",
}

// ─── Overview Tab Data ──────────────────────────────────────────────────────
async function getOverviewData() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const [
    projectsByStatus, departmentCounts, recentProjects, pipelineProjects,
    quotesByStatus, icuProjects, openNcrs,
    opportunitiesByStatus, wonThisMonth, lostThisMonth, wonLast90, lostLast90,
    designActive, designTotal, designOverdue,
    productionByStage, installProjects, installUpcoming,
    financeContractValue, financePoSpend, financeOutstanding,
    deadlineProjects, workstreamProjects,
  ] = await Promise.all([
    prisma.project.groupBy({ by: ["projectStatus"], _count: { id: true } }),
    prisma.product.groupBy({ by: ["currentDepartment"], _count: { id: true } }),
    prisma.project.findMany({
      take: 5, orderBy: { updatedAt: "desc" },
      select: {
        id: true, projectNumber: true, name: true, projectStatus: true,
        salesStage: true, ragStatus: true, targetCompletion: true,
        contractValue: true, estimatedValue: true,
        customer: { select: { name: true } },
        projectManager: { select: { name: true } },
        _count: { select: { products: true } },
      },
    }),
    prisma.project.groupBy({
      by: ["salesStage"],
      where: { projectStatus: { notIn: ["COMPLETE"] } },
      _sum: { estimatedValue: true, contractValue: true },
      _count: { id: true },
    }),
    prisma.quote.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.project.findMany({
      where: { isICUFlag: true, projectStatus: { not: "COMPLETE" } },
      select: { id: true, projectNumber: true, name: true, customer: { select: { name: true } } },
    }),
    prisma.nonConformanceReport.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
    prisma.opportunity.groupBy({
      by: ["status"], where: { status: { notIn: ["DEAD_LEAD"] } },
      _sum: { estimatedValue: true }, _count: { id: true },
    }),
    prisma.opportunity.findMany({
      where: { status: "WON", convertedAt: { gte: startOfMonth } },
      select: { estimatedValue: true },
    }),
    prisma.opportunity.count({ where: { status: "LOST", updatedAt: { gte: startOfMonth } } }),
    prisma.opportunity.count({ where: { status: "WON", updatedAt: { gte: ninetyDaysAgo } } }),
    prisma.opportunity.count({ where: { status: "LOST", updatedAt: { gte: ninetyDaysAgo } } }),
    prisma.productDesignCard.count({ where: { status: { in: ["IN_PROGRESS", "REVIEW"] } } }),
    prisma.productDesignCard.count(),
    prisma.productDesignCard.findMany({
      where: { targetEndDate: { lt: now }, status: { notIn: ["COMPLETE"] } },
      orderBy: { targetEndDate: "asc" }, take: 3,
      select: { id: true, targetEndDate: true, product: { select: { description: true } }, project: { select: { projectNumber: true } } },
    }),
    prisma.product.groupBy({ by: ["productionStatus"], where: { currentDepartment: "PRODUCTION" }, _count: { id: true } }),
    prisma.project.count({ where: { projectStatus: "INSTALLATION" } }),
    prisma.project.findMany({
      where: { projectStatus: "INSTALLATION", targetCompletion: { lte: thirtyDaysFromNow } },
      orderBy: { targetCompletion: "asc" }, take: 5,
      select: { id: true, projectNumber: true, name: true, targetCompletion: true, customer: { select: { name: true } } },
    }),
    prisma.project.aggregate({ where: { salesStage: "ORDER", projectStatus: { not: "COMPLETE" } }, _sum: { contractValue: true } }),
    prisma.purchaseOrder.aggregate({ where: { status: { notIn: ["CANCELLED"] } }, _sum: { totalValue: true } }),
    prisma.salesInvoice.findMany({ where: { status: { notIn: ["PAID"] } }, select: { netPayable: true } }),
    prisma.project.findMany({
      where: { targetCompletion: { not: null }, projectStatus: { notIn: ["COMPLETE"] } },
      orderBy: { targetCompletion: "asc" }, take: 5,
      select: { id: true, projectNumber: true, name: true, targetCompletion: true },
    }),
    prisma.project.findMany({
      where: { projectStatus: { not: "OPPORTUNITY" } },
      select: { workStream: true, contractValue: true, currentCost: true, projectStatus: true, targetCompletion: true, actualCompletion: true },
    }),
  ])

  // Derive counts
  const totalProjects = projectsByStatus.reduce((sum, g) => sum + g._count.id, 0)
  const activeProjects = projectsByStatus.filter((g) => g.projectStatus !== "COMPLETE").reduce((sum, g) => sum + g._count.id, 0)
  const totalProducts = departmentCounts.reduce((sum, g) => sum + g._count.id, 0)

  const quoteCountMap: Record<string, number> = {}
  let totalQuotes = 0
  for (const g of quotesByStatus) { quoteCountMap[g.status] = g._count.id; totalQuotes += g._count.id }

  let opportunityValue = 0, quotedValue = 0, orderValue = 0
  for (const g of pipelineProjects) {
    const value = Number(g._sum.contractValue || g._sum.estimatedValue || 0)
    if (g.salesStage === "OPPORTUNITY") opportunityValue = value
    else if (g.salesStage === "QUOTED") quotedValue = value
    else if (g.salesStage === "ORDER") orderValue = value
  }

  // Sales card
  const stageWeights: Record<string, number> = { ACTIVE_LEAD: 0.1, PENDING_APPROVAL: 0.25, QUOTED: 0.5, WON: 1.0, LOST: 0 }
  let salesPipelineValue = 0, weightedForecast = 0
  const pipelineByStage: { stage: string; value: number; count: number }[] = []
  const stageLabels: Record<string, string> = { ACTIVE_LEAD: "Active Lead", PENDING_APPROVAL: "Pending Approval", QUOTED: "Quoted", WON: "Won", LOST: "Lost" }
  for (const g of opportunitiesByStatus) {
    const value = Number(g._sum.estimatedValue || 0)
    const weight = stageWeights[g.status] ?? 0
    if (g.status !== "WON" && g.status !== "LOST") salesPipelineValue += value
    weightedForecast += value * weight
    pipelineByStage.push({ stage: stageLabels[g.status] || g.status, value, count: g._count.id })
  }
  const wonValue = wonThisMonth.reduce((sum, o) => sum + Number(o.estimatedValue || 0), 0)
  const totalDecisions = wonLast90 + lostLast90
  const conversionRate = totalDecisions > 0 ? Math.round((wonLast90 / totalDecisions) * 100) : 0

  // Design card
  const now2 = new Date()
  const designOverdueItems = designOverdue.map((card) => ({
    id: card.id,
    projectNumber: card.project.projectNumber,
    productDescription: card.product.description,
    daysOverdue: card.targetEndDate ? Math.floor((now2.getTime() - new Date(card.targetEndDate).getTime()) / (1000 * 60 * 60 * 24)) : 0,
  }))

  // Production card
  const productionStages = productionByStage.filter((g) => g.productionStatus !== null)
    .map((g) => ({ stage: g.productionStatus as string, count: g._count.id }))
    .sort((a, b) => b.count - a.count)
  const totalInProduction = productionStages.reduce((sum, s) => sum + s.count, 0)
  const activeStages = productionStages.filter((s) => !["COMPLETED", "N_A", "DISPATCHED"].includes(s.stage))
  const bottleneck = activeStages.length > 0 ? activeStages[0].stage : null

  // Finance card
  const totalContractValue = Number(financeContractValue._sum.contractValue || 0)
  const totalCostCommitted = Number(financePoSpend._sum.totalValue || 0)
  const grossMarginPercent = totalContractValue > 0 ? ((totalContractValue - totalCostCommitted) / totalContractValue) * 100 : 0
  const outstandingValue = financeOutstanding.reduce((sum, inv) => sum + Number(inv.netPayable || 0), 0)

  // Deadlines
  const deadlines = deadlineProjects.filter((p) => p.targetCompletion !== null).map((p) => {
    const target = new Date(p.targetCompletion!)
    return { id: p.id, projectNumber: p.projectNumber, name: p.name, targetCompletion: p.targetCompletion!, daysUntil: Math.ceil((target.getTime() - now2.getTime()) / (1000 * 60 * 60 * 24)) }
  })

  // Workstream performance
  const wsMap = new Map<string, { count: number; marginSum: number; marginCount: number; onTimeCount: number; completedCount: number }>()
  for (const p of workstreamProjects) {
    const ws = p.workStream; if (!ws) continue
    let entry = wsMap.get(ws)
    if (!entry) { entry = { count: 0, marginSum: 0, marginCount: 0, onTimeCount: 0, completedCount: 0 }; wsMap.set(ws, entry) }
    entry.count++
    const contract = Number(p.contractValue || 0), cost = Number(p.currentCost || 0)
    if (contract > 0) { entry.marginSum += ((contract - cost) / contract) * 100; entry.marginCount++ }
    if (p.projectStatus === "COMPLETE" && p.actualCompletion && p.targetCompletion) {
      entry.completedCount++
      if (new Date(p.actualCompletion) <= new Date(p.targetCompletion)) entry.onTimeCount++
    }
  }
  const workstreamData = Array.from(wsMap.entries())
    .map(([ws, d]) => ({ workStream: ws, label: WS_LABELS[ws] || ws, projectCount: d.count, avgMargin: d.marginCount > 0 ? d.marginSum / d.marginCount : 0, onTimePercent: d.completedCount > 0 ? (d.onTimeCount / d.completedCount) * 100 : null }))
    .sort((a, b) => b.projectCount - a.projectCount)

  return {
    totalProjects, activeProjects, totalProducts,
    projectsByStatus, recentProjects,
    pipeline: { opportunityValue, quotedValue, orderValue, total: opportunityValue + quotedValue + orderValue },
    quotes: { total: totalQuotes, submitted: quoteCountMap["SUBMITTED"] || 0 },
    icuProjects, openNcrs,
    salesData: {
      pipelineValue: salesPipelineValue, weightedForecast,
      wonThisMonth: { count: wonThisMonth.length, value: wonValue },
      lostThisMonth, conversionRate,
      quotesAwaiting: quoteCountMap["SUBMITTED"] || 0,
      pipelineByStage: pipelineByStage.filter((s) => s.stage !== "Lost"),
    },
    designData: { activeCards: designActive, totalCards: designTotal, overdueCount: designOverdue.length, topOverdue: designOverdueItems },
    productionData: { totalInProduction, stages: productionStages, bottleneck },
    installationData: {
      activeInstalls: installProjects,
      upcoming: installUpcoming.map((p) => ({ id: p.id, projectNumber: p.projectNumber, name: p.name, targetCompletion: p.targetCompletion, customer: p.customer?.name || "—" })),
    },
    financeData: { totalContractValue, totalCostCommitted, grossMarginPercent, outstandingInvoices: { count: financeOutstanding.length, value: outstandingValue } },
    deadlines, workstreamData,
  }
}

// ─── Sales Tab Data ─────────────────────────────────────────────────────────
async function getSalesTabData() {
  const now = new Date()
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [activeOpps, wonLostHistory, wonCount90, lostCount90, quotedOpps, recentChanges] = await Promise.all([
    prisma.opportunity.findMany({
      where: { status: { notIn: ["DEAD_LEAD"] } },
      select: {
        id: true, name: true, status: true, estimatedValue: true, winProbability: true,
        expectedCloseDate: true, quotedPrice: true, quoteSentAt: true, updatedAt: true,
        prospect: { select: { companyName: true } },
        convertedProject: { select: { workStream: true } },
      },
    }),
    prisma.opportunity.findMany({
      where: { status: { in: ["WON", "LOST"] }, updatedAt: { gte: sixMonthsAgo } },
      select: { status: true, estimatedValue: true, updatedAt: true, convertedProject: { select: { workStream: true } } },
    }),
    prisma.opportunity.count({ where: { status: "WON", updatedAt: { gte: ninetyDaysAgo } } }),
    prisma.opportunity.count({ where: { status: "LOST", updatedAt: { gte: ninetyDaysAgo } } }),
    prisma.opportunity.findMany({
      where: { status: "QUOTED", quoteSentAt: { not: null } },
      select: { id: true, name: true, quotedPrice: true, quoteSentAt: true, prospect: { select: { companyName: true } } },
    }),
    prisma.opportunity.findMany({
      where: { updatedAt: { gte: ninetyDaysAgo }, status: { notIn: ["DEAD_LEAD"] } },
      orderBy: { updatedAt: "desc" }, take: 10,
      select: { id: true, name: true, status: true, updatedAt: true, prospect: { select: { companyName: true } } },
    }),
  ])

  // Pipeline by stage
  const stageLabels: Record<string, string> = { ACTIVE_LEAD: "Active Lead", PENDING_APPROVAL: "Pending Approval", QUOTED: "Quoted", WON: "Won", LOST: "Lost" }
  const stageProbs: Record<string, number> = { ACTIVE_LEAD: 10, PENDING_APPROVAL: 30, QUOTED: 50, WON: 100, LOST: 0 }
  const stageMap = new Map<string, { value: number; count: number }>()
  let pipelineValue = 0, weightedForecast = 0, dealCount = 0, dealValueSum = 0

  for (const opp of activeOpps) {
    const val = Number(opp.estimatedValue || 0)
    const prob = opp.winProbability
    const status = opp.status
    if (!stageMap.has(status)) stageMap.set(status, { value: 0, count: 0 })
    const entry = stageMap.get(status)!
    entry.value += val; entry.count++
    if (status !== "WON" && status !== "LOST") { pipelineValue += val; dealCount++; dealValueSum += val }
    weightedForecast += val * (prob / 100)
  }

  const pipelineByStage = Array.from(stageMap.entries())
    .filter(([s]) => s !== "LOST")
    .map(([s, d]) => ({ stage: stageLabels[s] || s, value: d.value, count: d.count, probability: stageProbs[s] || 0 }))

  // Top opportunities by weighted value
  const topOpportunities = activeOpps
    .filter((o) => o.status !== "WON" && o.status !== "LOST")
    .map((o) => ({
      id: o.id, name: o.name,
      companyName: o.prospect.companyName,
      estimatedValue: Number(o.estimatedValue || 0),
      winProbability: o.winProbability,
      expectedCloseDate: o.expectedCloseDate?.toISOString() || null,
      weightedValue: Number(o.estimatedValue || 0) * (o.winProbability / 100),
    }))
    .sort((a, b) => b.weightedValue - a.weightedValue)
    .slice(0, 10)

  // Monthly trend
  const monthBuckets = new Map<string, { won: number; lost: number }>()
  for (const h of wonLostHistory) {
    const d = new Date(h.updatedAt)
    const key = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
    if (!monthBuckets.has(key)) monthBuckets.set(key, { won: 0, lost: 0 })
    const b = monthBuckets.get(key)!
    const val = Number(h.estimatedValue || 0)
    if (h.status === "WON") b.won += val; else b.lost += val
  }
  const monthlyTrend = Array.from(monthBuckets.entries()).map(([month, d]) => ({ month, ...d }))

  // Quotes awaiting response
  const quotesAwaiting = quotedOpps.map((q) => ({
    id: q.id, name: q.name, companyName: q.prospect.companyName,
    quotedPrice: Number(q.quotedPrice || 0),
    daysSinceSent: q.quoteSentAt ? Math.floor((now.getTime() - new Date(q.quoteSentAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
  })).sort((a, b) => b.daysSinceSent - a.daysSinceSent)

  // Win/loss by workstream
  const wsWinLoss = new Map<string, { won: number; lost: number }>()
  for (const h of wonLostHistory) {
    const ws = h.convertedProject?.workStream
    if (!ws) continue
    const label = WS_LABELS[ws] || ws
    if (!wsWinLoss.has(label)) wsWinLoss.set(label, { won: 0, lost: 0 })
    const e = wsWinLoss.get(label)!
    if (h.status === "WON") e.won++; else e.lost++
  }
  const winLossByWorkstream = Array.from(wsWinLoss.entries()).map(([workstream, d]) => ({
    workstream, won: d.won, lost: d.lost,
    winRate: (d.won + d.lost) > 0 ? Math.round((d.won / (d.won + d.lost)) * 100) : 0,
  }))

  // Win rate
  const totalDecisions = wonCount90 + lostCount90
  const winRate = totalDecisions > 0 ? Math.round((wonCount90 / totalDecisions) * 100) : 0
  const avgDealSize = dealCount > 0 ? dealValueSum / dealCount : 0

  // Recent activity
  const recentActivity = recentChanges.map((a) => ({
    id: a.id, name: a.name, companyName: a.prospect.companyName,
    status: a.status, changedAt: formatDate(a.updatedAt),
  }))

  return { pipelineValue, weightedForecast, winRate, avgDealSize, pipelineByStage, topOpportunities, monthlyTrend, quotesAwaiting, winLossByWorkstream, recentActivity }
}

// ─── Design Tab Data ────────────────────────────────────────────────────────
async function getDesignTabData() {
  const now = new Date()

  const [allCards, handovers] = await Promise.all([
    prisma.productDesignCard.findMany({
      select: {
        id: true, status: true, targetStartDate: true, targetEndDate: true,
        actualStartDate: true, actualEndDate: true, estimatedHours: true, actualHours: true,
        assignedDesigner: { select: { id: true, name: true } },
        product: { select: { description: true } },
        project: { select: { id: true, projectNumber: true, workStream: true } },
      },
    }),
    prisma.designHandover.findMany({
      where: { status: "SUBMITTED" },
      select: { initiatedAt: true, project: { select: { projectNumber: true, name: true } } },
    }),
  ])

  // KPIs
  const activeCards = allCards.filter((c) => c.status === "IN_PROGRESS" || c.status === "REVIEW").length
  const completedCards = allCards.filter((c) => c.status === "COMPLETE").length
  const overdueCards = allCards.filter((c) => c.status !== "COMPLETE" && c.targetEndDate && new Date(c.targetEndDate) < now).length

  // Avg cycle time (completed cards with both dates)
  const completedWithDates = allCards.filter((c) => c.status === "COMPLETE" && c.actualStartDate && c.actualEndDate)
  const avgCycleTimeDays = completedWithDates.length > 0
    ? completedWithDates.reduce((sum, c) => sum + (new Date(c.actualEndDate!).getTime() - new Date(c.actualStartDate!).getTime()) / (1000 * 60 * 60 * 24), 0) / completedWithDates.length
    : 0

  // Cards by status
  const statusCounts = new Map<string, number>()
  for (const c of allCards) { statusCounts.set(c.status, (statusCounts.get(c.status) || 0) + 1) }
  const cardsByStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count }))

  // Designer workload
  const designerMap = new Map<string, { name: string; active: number; completed: number; totalDays: number; daysCount: number; estHours: number; actHours: number; hoursCount: number }>()
  for (const c of allCards) {
    const designer = c.assignedDesigner
    if (!designer) continue
    if (!designerMap.has(designer.id)) designerMap.set(designer.id, { name: designer.name, active: 0, completed: 0, totalDays: 0, daysCount: 0, estHours: 0, actHours: 0, hoursCount: 0 })
    const d = designerMap.get(designer.id)!
    if (c.status === "IN_PROGRESS" || c.status === "REVIEW") d.active++
    if (c.status === "COMPLETE") {
      d.completed++
      if (c.actualStartDate && c.actualEndDate) {
        d.totalDays += (new Date(c.actualEndDate).getTime() - new Date(c.actualStartDate).getTime()) / (1000 * 60 * 60 * 24)
        d.daysCount++
      }
    }
    if (c.estimatedHours && c.actualHours) {
      d.estHours += Number(c.estimatedHours)
      d.actHours += Number(c.actualHours)
      d.hoursCount++
    }
  }
  const designerWorkload = Array.from(designerMap.values())
    .map((d) => ({
      name: d.name, active: d.active, completed: d.completed,
      avgDays: d.daysCount > 0 ? d.totalDays / d.daysCount : 0,
      hoursAccuracy: d.estHours > 0 ? (d.actHours / d.estHours) * 100 : 100,
    }))
    .sort((a, b) => b.active - a.active)

  // By workstream
  const wsMap = new Map<string, { activeCards: number; totalDays: number; daysCount: number; estHours: number; actHours: number }>()
  for (const c of allCards) {
    const ws = c.project.workStream
    if (!ws) continue
    const label = WS_LABELS[ws] || ws
    if (!wsMap.has(label)) wsMap.set(label, { activeCards: 0, totalDays: 0, daysCount: 0, estHours: 0, actHours: 0 })
    const e = wsMap.get(label)!
    if (c.status === "IN_PROGRESS" || c.status === "REVIEW") e.activeCards++
    if (c.status === "COMPLETE" && c.actualStartDate && c.actualEndDate) {
      e.totalDays += (new Date(c.actualEndDate).getTime() - new Date(c.actualStartDate).getTime()) / (1000 * 60 * 60 * 24)
      e.daysCount++
    }
    if (c.estimatedHours && c.actualHours) {
      e.estHours += Number(c.estimatedHours)
      e.actHours += Number(c.actualHours)
    }
  }
  const byWorkstream = Array.from(wsMap.entries())
    .map(([workstream, d]) => ({
      workstream, activeCards: d.activeCards,
      avgDesignDays: d.daysCount > 0 ? d.totalDays / d.daysCount : 0,
      hoursAccuracy: d.estHours > 0 ? (d.actHours / d.estHours) * 100 : 100,
    }))
    .sort((a, b) => b.activeCards - a.activeCards)

  // Overdue list
  const overdueList = allCards
    .filter((c) => c.status !== "COMPLETE" && c.targetEndDate && new Date(c.targetEndDate) < now)
    .map((c) => ({
      id: c.id, projectNumber: c.project.projectNumber,
      productDescription: c.product.description,
      designer: c.assignedDesigner?.name || "—",
      daysOverdue: Math.floor((now.getTime() - new Date(c.targetEndDate!).getTime()) / (1000 * 60 * 60 * 24)),
      targetDate: c.targetEndDate?.toISOString() || null,
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 15)

  // Handovers pending
  const handoversPending = handovers.map((h) => ({
    projectNumber: h.project.projectNumber,
    projectName: h.project.name,
    submittedAt: h.initiatedAt?.toISOString() || "",
    daysWaiting: h.initiatedAt ? Math.floor((now.getTime() - new Date(h.initiatedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
  }))

  return { activeCards, completedCards, overdueCards, avgCycleTimeDays, cardsByStatus, designerWorkload, byWorkstream, overdueList, handoversPending }
}

// ─── Production Tab Data ────────────────────────────────────────────────────
async function getProductionTabData() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [productsInProd, completedTasks, openNcrs] = await Promise.all([
    prisma.product.findMany({
      where: { currentDepartment: "PRODUCTION" },
      select: {
        id: true, productionStatus: true, productionTargetDate: true,
        productionCompletionDate: true, description: true,
        project: {
          select: {
            id: true, projectNumber: true, workStream: true, contractValue: true,
            _count: { select: { products: true } },
          },
        },
      },
    }),
    prisma.productionTask.findMany({
      where: { status: "COMPLETED", completedAt: { gte: ninetyDaysAgo } },
      select: { stage: true, startedAt: true, completedAt: true },
    }),
    prisma.nonConformanceReport.findMany({
      where: { status: { in: ["OPEN", "INVESTIGATING"] }, parentProject: { projectStatus: "MANUFACTURE" } },
      select: { severity: true, parentProject: { select: { projectNumber: true } } },
    }),
  ])

  // Products by stage
  const stageCounts = new Map<string, number>()
  for (const p of productsInProd) {
    const stage = p.productionStatus || "AWAITING"
    stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1)
  }
  const productsByStage = Array.from(stageCounts.entries()).map(([stage, count]) => ({ stage, count }))
  const inProduction = productsInProd.length

  // Bottleneck
  const activeStages = productsByStage.filter((s) => !["COMPLETED", "N_A", "DISPATCHED"].includes(s.stage))
  const bottleneckStage = activeStages.sort((a, b) => b.count - a.count)[0]?.stage || null

  // Completing this month — products with target in current month OR in late stages
  const lateStages = ["PAINTING", "PACKING"]
  const completingProducts = productsInProd.filter((p) => {
    if (p.productionTargetDate) {
      const target = new Date(p.productionTargetDate)
      if (target >= startOfMonth && target <= endOfMonth) return true
    }
    if (p.productionStatus && lateStages.includes(p.productionStatus)) return true
    return false
  })

  // Estimate invoice value: prorate project contract value
  let estInvoiceValue = 0
  const completingThisMonthList = completingProducts.map((p) => {
    const projectValue = Number(p.project.contractValue || 0)
    const totalProducts = p.project._count.products || 1
    const prorated = projectValue / totalProducts
    estInvoiceValue += prorated
    return {
      projectId: p.project.id,
      projectNumber: p.project.projectNumber,
      productDescription: p.description,
      targetDate: p.productionTargetDate?.toISOString() || null,
      contractValue: prorated,
    }
  })

  // Stage throughput
  const throughputMap = new Map<string, { totalDays: number; count: number }>()
  for (const t of completedTasks) {
    if (!t.startedAt || !t.completedAt) continue
    const days = (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) / (1000 * 60 * 60 * 24)
    if (!throughputMap.has(t.stage)) throughputMap.set(t.stage, { totalDays: 0, count: 0 })
    const e = throughputMap.get(t.stage)!
    e.totalDays += days; e.count++
  }
  const stageThroughput = Array.from(throughputMap.entries())
    .map(([stage, d]) => ({ stage, avgDays: d.totalDays / d.count }))
    .sort((a, b) => b.avgDays - a.avgDays)

  // Overdue production
  const overdueProduction = productsInProd
    .filter((p) => p.productionTargetDate && new Date(p.productionTargetDate) < now && p.productionStatus !== "COMPLETED" && p.productionStatus !== "DISPATCHED")
    .map((p) => ({
      projectId: p.project.id,
      projectNumber: p.project.projectNumber,
      productDescription: p.description,
      daysOverdue: Math.floor((now.getTime() - new Date(p.productionTargetDate!).getTime()) / (1000 * 60 * 60 * 24)),
      targetDate: p.productionTargetDate?.toISOString() || null,
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 15)

  // By workstream
  const wsMap = new Map<string, number>()
  for (const p of productsInProd) {
    const ws = p.project.workStream
    if (!ws) continue
    const label = WS_LABELS[ws] || ws
    wsMap.set(label, (wsMap.get(label) || 0) + 1)
  }
  const byWorkstream = Array.from(wsMap.entries())
    .map(([workstream, count]) => ({ workstream, count }))
    .sort((a, b) => b.count - a.count)

  // Open NCRs
  const ncrMap = new Map<string, Map<string, number>>()
  for (const ncr of openNcrs) {
    const pn = ncr.parentProject.projectNumber
    if (!ncrMap.has(pn)) ncrMap.set(pn, new Map())
    const sevMap = ncrMap.get(pn)!
    sevMap.set(ncr.severity, (sevMap.get(ncr.severity) || 0) + 1)
  }
  const openNcrList: { projectNumber: string; severity: string; count: number }[] = []
  for (const [pn, sevMap] of ncrMap) {
    for (const [severity, count] of sevMap) {
      openNcrList.push({ projectNumber: pn, severity, count })
    }
  }

  return {
    inProduction, bottleneckStage, completingThisMonth: completingProducts.length, estInvoiceValue,
    productsByStage, completingThisMonthList, stageThroughput, overdueProduction, byWorkstream, openNcrs: openNcrList,
  }
}

// ─── Installation Tab Data ──────────────────────────────────────────────────
async function getInstallationTabData() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const thirtyDaysFromNow = new Date(); thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const [installProjects, completedProjects, upcomingProjects] = await Promise.all([
    prisma.project.findMany({
      where: { projectStatus: "INSTALLATION" },
      select: {
        id: true, projectNumber: true, name: true, workStream: true,
        contractValue: true, priority: true, targetCompletion: true, departmentStatus: true,
        customer: { select: { name: true } },
        projectManager: { select: { name: true } },
      },
    }),
    prisma.project.findMany({
      where: { projectStatus: "COMPLETE", actualCompletion: { gte: sixMonthsAgo } },
      select: { workStream: true, p4Date: true, actualCompletion: true, contractValue: true },
    }),
    prisma.project.findMany({
      where: {
        projectStatus: { in: ["MANUFACTURE", "DESIGN"] },
        targetCompletion: { lte: thirtyDaysFromNow, gte: now },
      },
      orderBy: { targetCompletion: "asc" }, take: 10,
      select: {
        id: true, projectNumber: true, name: true, targetCompletion: true,
        customer: { select: { name: true } },
      },
    }),
  ])

  // Active installs
  const activeInstalls = installProjects.length

  // Completing this month
  const completingList = installProjects
    .filter((p) => p.targetCompletion && new Date(p.targetCompletion) >= startOfMonth && new Date(p.targetCompletion) <= endOfMonth)
  let estInvoiceValue = 0
  const completingThisMonthList = completingList.map((p) => {
    const val = Number(p.contractValue || 0)
    estInvoiceValue += val
    const daysRemaining = p.targetCompletion ? Math.ceil((new Date(p.targetCompletion).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0
    return {
      projectId: p.id, projectNumber: p.projectNumber, name: p.name,
      customer: p.customer?.name || "—",
      targetCompletion: p.targetCompletion?.toISOString() || null,
      contractValue: val, daysRemaining,
    }
  })

  // Overdue
  const overdueList = installProjects
    .filter((p) => p.targetCompletion && new Date(p.targetCompletion) < now)
    .map((p) => ({
      projectId: p.id, projectNumber: p.projectNumber, name: p.name,
      customer: p.customer?.name || "—",
      targetCompletion: p.targetCompletion?.toISOString() || null,
      daysOverdue: Math.floor((now.getTime() - new Date(p.targetCompletion!).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)

  // Active install list
  const activeInstallList = installProjects.map((p) => ({
    projectId: p.id, projectNumber: p.projectNumber, name: p.name,
    customer: p.customer?.name || "—",
    status: p.departmentStatus,
    projectManager: p.projectManager?.name || "—",
    priority: p.priority,
    targetCompletion: p.targetCompletion?.toISOString() || null,
  }))

  // Upcoming installs (projects nearing install phase)
  const upcomingInstalls = upcomingProjects.map((p) => ({
    projectId: p.id, projectNumber: p.projectNumber, name: p.name,
    customer: p.customer?.name || "—",
    targetCompletion: p.targetCompletion?.toISOString() || null,
    daysUntil: p.targetCompletion ? Math.ceil((new Date(p.targetCompletion).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0,
  }))

  // By workstream
  const wsMap = new Map<string, number>()
  for (const p of installProjects) {
    const ws = p.workStream; if (!ws) continue
    const label = WS_LABELS[ws] || ws
    wsMap.set(label, (wsMap.get(label) || 0) + 1)
  }
  const byWorkstream = Array.from(wsMap.entries())
    .map(([workstream, count]) => ({ workstream, count }))
    .sort((a, b) => b.count - a.count)

  // Duration tracking by workstream (completed projects)
  const durationMap = new Map<string, { totalDays: number; count: number }>()
  for (const p of completedProjects) {
    if (!p.p4Date || !p.actualCompletion) continue
    const ws = p.workStream; if (!ws) continue
    const label = WS_LABELS[ws] || ws
    const days = (new Date(p.actualCompletion).getTime() - new Date(p.p4Date).getTime()) / (1000 * 60 * 60 * 24)
    if (days < 0 || days > 365) continue // skip invalid
    if (!durationMap.has(label)) durationMap.set(label, { totalDays: 0, count: 0 })
    const e = durationMap.get(label)!
    e.totalDays += days; e.count++
  }
  const durationByWorkstream = Array.from(durationMap.entries())
    .map(([workstream, d]) => ({ workstream, avgDays: d.totalDays / d.count, count: d.count }))

  return {
    activeInstalls, completingThisMonth: completingList.length, overdueInstalls: overdueList.length,
    estInvoiceValue, completingThisMonthList, activeInstallList, upcomingInstalls,
    overdueList, byWorkstream, durationByWorkstream,
  }
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const tab = params.tab || "overview"

  const session = await auth()
  const userRole = (session?.user as any)?.role || "STAFF"
  const showManagement = isManagerOrDirector(userRole)

  // Only fetch data for the active tab
  if (tab === "sales") {
    const data = await getSalesTabData()
    return (
      <div className="space-y-6">
        <DashboardTabs activeTab="sales" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Dashboard</h1>
          <p className="text-sm text-gray-500">Pipeline, opportunities, and conversion metrics</p>
        </div>
        <TabSales data={data} />
      </div>
    )
  }

  if (tab === "design") {
    const data = await getDesignTabData()
    return (
      <div className="space-y-6">
        <DashboardTabs activeTab="design" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Design Dashboard</h1>
          <p className="text-sm text-gray-500">Design cards, workload, and workstream performance</p>
        </div>
        <TabDesign data={data} />
      </div>
    )
  }

  if (tab === "production") {
    const data = await getProductionTabData()
    return (
      <div className="space-y-6">
        <DashboardTabs activeTab="production" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Production Dashboard</h1>
          <p className="text-sm text-gray-500">Stage pipeline, throughput, and month-end forecast</p>
        </div>
        <TabProduction data={data} />
      </div>
    )
  }

  if (tab === "installation") {
    const data = await getInstallationTabData()
    return (
      <div className="space-y-6">
        <DashboardTabs activeTab="installation" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Installation Dashboard</h1>
          <p className="text-sm text-gray-500">Active installs, completions, and invoicing forecast</p>
        </div>
        <TabInstallation data={data} />
      </div>
    )
  }

  // Default: Overview tab
  const data = await getOverviewData()

  return (
    <div className="space-y-6">
      <DashboardTabs activeTab="overview" />

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">MM Engineered Solutions — Overview</p>
      </div>

      {/* ICU Carousel */}
      <ICUCarousel projects={data.icuProjects} />

      {/* Pipeline value cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Pipeline Total</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(data.pipeline.total)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <PoundSterling className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Link href="/projects?salesStage=OPPORTUNITY">
          <Card className="transition-shadow hover:shadow-md cursor-pointer border-l-4 border-l-gray-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Opportunities</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(data.pipeline.opportunityValue)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                  <TrendingUp className="h-5 w-5 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/projects?salesStage=QUOTED">
          <Card className="transition-shadow hover:shadow-md cursor-pointer border-l-4 border-l-amber-400">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Quoted</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(data.pipeline.quotedValue)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                  <FileText className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/projects?salesStage=ORDER">
          <Card className="transition-shadow hover:shadow-md cursor-pointer border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">On Order</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(data.pipeline.orderValue)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Link href="/projects">
          <div className="rounded-lg border border-border p-3 text-center transition-shadow hover:shadow-md cursor-pointer">
            <div className="text-2xl font-semibold text-gray-900">{data.totalProjects}</div>
            <div className="text-xs text-gray-500">Total Projects</div>
          </div>
        </Link>
        <Link href="/projects">
          <div className="rounded-lg border border-border p-3 text-center transition-shadow hover:shadow-md cursor-pointer">
            <div className="text-2xl font-semibold text-emerald-700">{data.activeProjects}</div>
            <div className="text-xs text-gray-500">Active Projects</div>
          </div>
        </Link>
        <Link href="/projects?view=tracker">
          <div className="rounded-lg border border-border p-3 text-center transition-shadow hover:shadow-md cursor-pointer">
            <div className="text-2xl font-semibold text-gray-900">{data.totalProducts}</div>
            <div className="text-xs text-gray-500">Products</div>
          </div>
        </Link>
        <Link href="/quotes">
          <div className="rounded-lg border border-border p-3 text-center transition-shadow hover:shadow-md cursor-pointer">
            <div className="text-2xl font-semibold text-gray-900">{data.quotes.total}</div>
            <div className="text-xs text-gray-500">Quotes</div>
          </div>
        </Link>
        <div className="rounded-lg border border-border p-3 text-center">
          <div className="text-2xl font-semibold text-blue-700">{data.quotes.submitted}</div>
          <div className="text-xs text-gray-500">Awaiting Response</div>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <div className={`text-2xl font-semibold ${data.openNcrs > 0 ? "text-red-600" : "text-gray-900"}`}>{data.openNcrs}</div>
          <div className="text-xs text-gray-500">Open NCRs</div>
        </div>
      </div>

      {/* Department cards — row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DepartmentSales data={data.salesData} />
        <DepartmentDesign data={data.designData} />
        <DepartmentProduction data={data.productionData} />
      </div>

      {/* Department cards — row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DepartmentInstallation data={data.installationData} />
        <DepartmentFinance data={data.financeData} />
        <UpcomingDeadlines projects={data.deadlines} />
      </div>

      {/* Workstream performance — management only */}
      {showManagement && <DashboardWorkstreamPerformance data={data.workstreamData} />}

      {/* Recent Projects table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Projects</CardTitle>
            <Link href="/projects" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Items</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Value</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">RAG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recentProjects.map((project) => {
                  const scheduleRag = project.ragStatus as "GREEN" | "AMBER" | "RED" | null || calculateScheduleRag(project.targetCompletion)
                  return (
                    <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <Link href={`/projects/${project.id}`} className="font-mono text-xs font-medium text-blue-600 hover:text-blue-700">
                          {project.projectNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/projects/${project.id}`} className="font-medium text-gray-900 hover:text-blue-600 text-sm">
                          {project.name}
                        </Link>
                        {project.projectManager && (
                          <div className="text-xs text-gray-400">{project.projectManager.name}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{project.customer?.name || "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className={`${getProjectStatusColor(project.projectStatus)} text-[10px]`}>
                          {prettifyEnum(project.projectStatus)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-xs text-gray-600">{project._count.products}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-mono text-gray-700">
                        {project.contractValue || project.estimatedValue
                          ? formatCurrency(Number(project.contractValue || project.estimatedValue))
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className={`mx-auto h-3 w-3 rounded-full ${getRagColor(scheduleRag)}`} />
                      </td>
                    </tr>
                  )
                })}
                {data.recentProjects.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No projects yet. <Link href="/projects/new" className="text-blue-600 hover:text-blue-700">Create your first project</Link>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
