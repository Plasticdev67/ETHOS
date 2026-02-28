import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Plus,
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
import { auth } from "@/lib/auth"
import { isManagerOrDirector } from "@/lib/permissions"

export const dynamic = 'force-dynamic'
export const revalidate = 60

async function getDashboardData() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const [
    projectsByStatus,
    departmentCounts,
    recentProjects,
    // Pipeline values
    pipelineProjects,
    // Quote stats
    quotesByStatus,
    // ICU projects
    icuProjects,
    // NCR stats
    openNcrs,
    // === New queries for department cards ===
    // Sales: Opportunities by status
    opportunitiesByStatus,
    // Sales: Won this month
    wonThisMonth,
    // Sales: Lost this month
    lostThisMonth,
    // Sales: Conversion rate (90-day window)
    wonLast90,
    lostLast90,
    // Design: active cards
    designActive,
    // Design: total cards
    designTotal,
    // Design: overdue cards
    designOverdue,
    // Production: products by production status
    productionByStage,
    // Installation: active projects
    installProjects,
    // Installation: upcoming
    installUpcoming,
    // Finance: contract value (on-order)
    financeContractValue,
    // Finance: PO spend
    financePoSpend,
    // Finance: outstanding invoices
    financeOutstanding,
    // Upcoming deadlines
    deadlineProjects,
    // Workstream performance
    workstreamProjects,
  ] = await Promise.all([
    prisma.project.groupBy({
      by: ["projectStatus"],
      _count: { id: true },
    }),
    prisma.product.groupBy({
      by: ["currentDepartment"],
      _count: { id: true },
    }),
    prisma.project.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        projectStatus: true,
        salesStage: true,
        ragStatus: true,
        targetCompletion: true,
        contractValue: true,
        estimatedValue: true,
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
    prisma.quote.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.project.findMany({
      where: { isICUFlag: true, projectStatus: { not: "COMPLETE" } },
      select: { id: true, projectNumber: true, name: true, customer: { select: { name: true } } },
    }),
    prisma.nonConformanceReport.count({
      where: { status: { in: ["OPEN", "INVESTIGATING"] } },
    }),
    // --- Sales card queries ---
    prisma.opportunity.groupBy({
      by: ["status"],
      where: { status: { notIn: ["DEAD_LEAD"] } },
      _sum: { estimatedValue: true },
      _count: { id: true },
    }),
    prisma.opportunity.findMany({
      where: { status: "WON", convertedAt: { gte: startOfMonth } },
      select: { estimatedValue: true },
    }),
    prisma.opportunity.count({
      where: { status: "LOST", updatedAt: { gte: startOfMonth } },
    }),
    prisma.opportunity.count({
      where: { status: "WON", updatedAt: { gte: ninetyDaysAgo } },
    }),
    prisma.opportunity.count({
      where: { status: "LOST", updatedAt: { gte: ninetyDaysAgo } },
    }),
    // --- Design card queries ---
    prisma.productDesignCard.count({
      where: { status: { in: ["IN_PROGRESS", "REVIEW"] } },
    }),
    prisma.productDesignCard.count(),
    prisma.productDesignCard.findMany({
      where: {
        targetEndDate: { lt: now },
        status: { notIn: ["COMPLETE"] },
      },
      orderBy: { targetEndDate: "asc" },
      take: 3,
      select: {
        id: true,
        targetEndDate: true,
        product: { select: { description: true } },
        project: { select: { projectNumber: true } },
      },
    }),
    // --- Production card query ---
    prisma.product.groupBy({
      by: ["productionStatus"],
      where: { currentDepartment: "PRODUCTION" },
      _count: { id: true },
    }),
    // --- Installation card queries ---
    prisma.project.count({
      where: { projectStatus: "INSTALLATION" },
    }),
    prisma.project.findMany({
      where: {
        projectStatus: "INSTALLATION",
        targetCompletion: { lte: thirtyDaysFromNow },
      },
      orderBy: { targetCompletion: "asc" },
      take: 5,
      select: {
        id: true,
        projectNumber: true,
        name: true,
        targetCompletion: true,
        customer: { select: { name: true } },
      },
    }),
    // --- Finance card queries ---
    prisma.project.aggregate({
      where: { salesStage: "ORDER", projectStatus: { not: "COMPLETE" } },
      _sum: { contractValue: true },
    }),
    prisma.purchaseOrder.aggregate({
      where: { status: { notIn: ["CANCELLED"] } },
      _sum: { totalValue: true },
    }),
    prisma.salesInvoice.findMany({
      where: { status: { notIn: ["PAID"] } },
      select: { netPayable: true },
    }),
    // --- Upcoming deadlines ---
    prisma.project.findMany({
      where: {
        targetCompletion: { not: null },
        projectStatus: { notIn: ["COMPLETE"] },
      },
      orderBy: { targetCompletion: "asc" },
      take: 5,
      select: {
        id: true,
        projectNumber: true,
        name: true,
        targetCompletion: true,
      },
    }),
    // --- Workstream performance (for management card) ---
    prisma.project.findMany({
      where: { projectStatus: { not: "OPPORTUNITY" } },
      select: {
        workStream: true,
        contractValue: true,
        currentCost: true,
        projectStatus: true,
        targetCompletion: true,
        actualCompletion: true,
      },
    }),
  ])

  // --- Derive existing counts ---
  const totalProjects = projectsByStatus.reduce((sum, g) => sum + g._count.id, 0)
  const activeProjects = projectsByStatus
    .filter((g) => g.projectStatus !== "COMPLETE")
    .reduce((sum, g) => sum + g._count.id, 0)
  const totalProducts = departmentCounts.reduce((sum, g) => sum + g._count.id, 0)

  const quoteCountMap: Record<string, number> = {}
  let totalQuotes = 0
  for (const g of quotesByStatus) {
    quoteCountMap[g.status] = g._count.id
    totalQuotes += g._count.id
  }

  let opportunityValue = 0
  let quotedValue = 0
  let orderValue = 0
  for (const g of pipelineProjects) {
    const value = Number(g._sum.contractValue || g._sum.estimatedValue || 0)
    if (g.salesStage === "OPPORTUNITY") opportunityValue = value
    else if (g.salesStage === "QUOTED") quotedValue = value
    else if (g.salesStage === "ORDER") orderValue = value
  }

  // --- Sales card data ---
  const stageWeights: Record<string, number> = {
    ACTIVE_LEAD: 0.1,
    PENDING_APPROVAL: 0.25,
    QUOTED: 0.5,
    WON: 1.0,
    LOST: 0,
  }
  let salesPipelineValue = 0
  let weightedForecast = 0
  const pipelineByStage: { stage: string; value: number; count: number }[] = []
  const stageLabels: Record<string, string> = {
    ACTIVE_LEAD: "Active Lead",
    PENDING_APPROVAL: "Pending Approval",
    QUOTED: "Quoted",
    WON: "Won",
    LOST: "Lost",
  }

  for (const g of opportunitiesByStatus) {
    const value = Number(g._sum.estimatedValue || 0)
    const weight = stageWeights[g.status] ?? 0
    if (g.status !== "WON" && g.status !== "LOST") {
      salesPipelineValue += value
    }
    weightedForecast += value * weight
    pipelineByStage.push({
      stage: stageLabels[g.status] || g.status,
      value,
      count: g._count.id,
    })
  }

  const wonValue = wonThisMonth.reduce((sum, o) => sum + Number(o.estimatedValue || 0), 0)
  const totalDecisions = wonLast90 + lostLast90
  const conversionRate = totalDecisions > 0 ? Math.round((wonLast90 / totalDecisions) * 100) : 0

  const salesData = {
    pipelineValue: salesPipelineValue,
    weightedForecast,
    wonThisMonth: { count: wonThisMonth.length, value: wonValue },
    lostThisMonth,
    conversionRate,
    quotesAwaiting: quoteCountMap["SUBMITTED"] || 0,
    pipelineByStage: pipelineByStage.filter((s) => s.stage !== "Lost"),
  }

  // --- Design card data ---
  const designOverdueItems = designOverdue.map((card) => {
    const daysOverdue = card.targetEndDate
      ? Math.floor((now.getTime() - new Date(card.targetEndDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0
    return {
      id: card.id,
      projectNumber: card.project.projectNumber,
      productDescription: card.product.description,
      daysOverdue,
    }
  })

  const designData = {
    activeCards: designActive,
    totalCards: designTotal,
    overdueCount: designOverdue.length,
    topOverdue: designOverdueItems,
  }

  // --- Production card data ---
  const productionStages = productionByStage
    .filter((g) => g.productionStatus !== null)
    .map((g) => ({
      stage: g.productionStatus as string,
      count: g._count.id,
    }))
    .sort((a, b) => b.count - a.count)

  const totalInProduction = productionStages.reduce((sum, s) => sum + s.count, 0)
  const activeStages = productionStages.filter(
    (s) => !["COMPLETED", "N_A", "DISPATCHED"].includes(s.stage)
  )
  const bottleneck = activeStages.length > 0 ? activeStages[0].stage : null

  const productionData = {
    totalInProduction,
    stages: productionStages,
    bottleneck,
  }

  // --- Installation card data ---
  const installationData = {
    activeInstalls: installProjects,
    upcoming: installUpcoming.map((p) => ({
      id: p.id,
      projectNumber: p.projectNumber,
      name: p.name,
      targetCompletion: p.targetCompletion,
      customer: p.customer?.name || "—",
    })),
  }

  // --- Finance card data ---
  const totalContractValue = Number(financeContractValue._sum.contractValue || 0)
  const totalCostCommitted = Number(financePoSpend._sum.totalValue || 0)
  const grossMarginPercent = totalContractValue > 0
    ? ((totalContractValue - totalCostCommitted) / totalContractValue) * 100
    : 0
  const outstandingValue = financeOutstanding.reduce(
    (sum, inv) => sum + Number(inv.netPayable || 0),
    0
  )

  const financeData = {
    totalContractValue,
    totalCostCommitted,
    grossMarginPercent,
    outstandingInvoices: { count: financeOutstanding.length, value: outstandingValue },
  }

  // --- Upcoming deadlines data ---
  const deadlines = deadlineProjects
    .filter((p) => p.targetCompletion !== null)
    .map((p) => {
      const target = new Date(p.targetCompletion!)
      const daysUntil = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return {
        id: p.id,
        projectNumber: p.projectNumber,
        name: p.name,
        targetCompletion: p.targetCompletion!,
        daysUntil,
      }
    })

  // --- Workstream performance data ---
  const wsLabels: Record<string, string> = {
    COMMUNITY: "Community",
    UTILITIES: "Utilities",
    BESPOKE: "Bespoke",
    BLAST: "Blast",
    BUND_CONTAINMENT: "Bund Containment",
    REFURBISHMENT: "Refurbishment",
  }
  const wsMap = new Map<string, { count: number; marginSum: number; marginCount: number; onTimeCount: number; completedCount: number }>()
  for (const p of workstreamProjects) {
    const ws = p.workStream
    if (!ws) continue
    let entry = wsMap.get(ws)
    if (!entry) {
      entry = { count: 0, marginSum: 0, marginCount: 0, onTimeCount: 0, completedCount: 0 }
      wsMap.set(ws, entry)
    }
    entry.count++
    const contract = Number(p.contractValue || 0)
    const cost = Number(p.currentCost || 0)
    if (contract > 0) {
      entry.marginSum += ((contract - cost) / contract) * 100
      entry.marginCount++
    }
    if (p.projectStatus === "COMPLETE" && p.actualCompletion && p.targetCompletion) {
      entry.completedCount++
      if (new Date(p.actualCompletion) <= new Date(p.targetCompletion)) {
        entry.onTimeCount++
      }
    }
  }
  const workstreamData = Array.from(wsMap.entries())
    .map(([ws, d]) => ({
      workStream: ws,
      label: wsLabels[ws] || ws,
      projectCount: d.count,
      avgMargin: d.marginCount > 0 ? d.marginSum / d.marginCount : 0,
      onTimePercent: d.completedCount > 0 ? (d.onTimeCount / d.completedCount) * 100 : null,
    }))
    .sort((a, b) => b.projectCount - a.projectCount)

  return {
    totalProjects,
    activeProjects,
    totalProducts,
    projectsByStatus,
    recentProjects,
    pipeline: { opportunityValue, quotedValue, orderValue, total: opportunityValue + quotedValue + orderValue },
    quotes: { total: totalQuotes, submitted: quoteCountMap["SUBMITTED"] || 0 },
    icuProjects,
    openNcrs,
    // Department cards
    salesData,
    designData,
    productionData,
    installationData,
    financeData,
    deadlines,
    workstreamData,
  }
}

export default async function DashboardPage() {
  const [data, session] = await Promise.all([getDashboardData(), auth()])
  const userRole = (session?.user as any)?.role || "STAFF"
  const showManagement = isManagerOrDirector(userRole)

  return (
    <div className="space-y-6">
      <DashboardTabs />

      {/* Page header with quick actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">MM Engineered Solutions — Overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/quotes/new">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              New Quote
            </Button>
          </Link>
          <Link href="/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>
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
