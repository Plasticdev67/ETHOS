import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  PoundSterling,
  FileText,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import { formatDate, formatCurrency, getProjectStatusColor, getSalesStageColor, getDepartmentColor, prettifyEnum, calculateScheduleRag, getRagColor } from "@/lib/utils"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { DashboardTimeline } from "@/components/dashboard/dashboard-timeline"
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { ICUCarousel } from "@/components/dashboard/icu-carousel"

export const dynamic = 'force-dynamic'
export const revalidate = 60

async function getDashboardData() {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [
    projectsByStatus,
    departmentCounts,
    recentProjects,
    overdueProducts,
    // Pipeline values
    pipelineProjects,
    // Quote stats (single groupBy replaces 4 count queries)
    quotesByStatus,
    // ICU projects
    icuProjects,
    // Recent quotes
    recentQuotes,
    // NCR stats
    openNcrs,
    // Monthly data
    allProjectsForChart,
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
      take: 10,
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
        coordinator: { select: { name: true } },
        projectManager: { select: { name: true } },
        _count: { select: { products: true, ncrs: true } },
      },
    }),
    prisma.product.findMany({
      where: {
        requiredCompletionDate: { lt: new Date() },
        currentDepartment: { notIn: ["COMPLETE", "REVIEW"] },
      },
      take: 10,
      orderBy: { requiredCompletionDate: "asc" },
      include: {
        project: { select: { id: true, projectNumber: true, name: true } },
      },
    }),
    // Pipeline values by sales stage — use groupBy to avoid fetching all rows
    prisma.project.groupBy({
      by: ["salesStage"],
      where: { projectStatus: { notIn: ["COMPLETE"] } },
      _sum: { estimatedValue: true, contractValue: true },
      _count: { id: true },
    }),
    // Quote stats — single groupBy instead of 4 separate counts
    prisma.quote.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    // ICU projects
    prisma.project.findMany({
      where: { isICUFlag: true, projectStatus: { not: "COMPLETE" } },
      select: { id: true, projectNumber: true, name: true, customer: { select: { name: true } } },
    }),
    // Recent quotes
    prisma.quote.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        totalSell: true,
        customer: { select: { name: true } },
      },
    }),
    // Open NCRs
    prisma.nonConformanceReport.count({
      where: { status: { in: ["OPEN", "INVESTIGATING"] } },
    }),
    // Monthly project data (last 6 months only)
    prisma.project.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, salesStage: true, projectStatus: true },
    }),
  ])

  // Derive project counts from projectsByStatus groupBy (saves 3 queries)
  const totalProjects = projectsByStatus.reduce((sum, g) => sum + g._count.id, 0)
  const activeProjects = projectsByStatus
    .filter((g) => g.projectStatus !== "COMPLETE")
    .reduce((sum, g) => sum + g._count.id, 0)
  const totalProducts = departmentCounts.reduce((sum, g) => sum + g._count.id, 0)
  const orderProjects = projectsByStatus
    .filter((g) => ["DESIGN", "MANUFACTURE", "DESIGN_FREEZE", "INSTALLATION", "REVIEW"].includes(g.projectStatus))
    .reduce((sum, g) => sum + g._count.id, 0)

  // Derive quote counts from quotesByStatus groupBy (saves 3 queries)
  const quoteCountMap: Record<string, number> = {}
  let totalQuotes = 0
  for (const g of quotesByStatus) {
    quoteCountMap[g.status] = g._count.id
    totalQuotes += g._count.id
  }

  // Calculate pipeline values from grouped aggregates
  let opportunityValue = 0
  let quotedValue = 0
  let orderValue = 0
  let opportunityCount = 0
  let quotedCount = 0
  let orderCount = 0
  for (const g of pipelineProjects) {
    const value = Number(g._sum.contractValue || g._sum.estimatedValue || 0)
    if (g.salesStage === "OPPORTUNITY") { opportunityValue = value; opportunityCount = g._count.id }
    else if (g.salesStage === "QUOTED") { quotedValue = value; quotedCount = g._count.id }
    else if (g.salesStage === "ORDER") { orderValue = value; orderCount = g._count.id }
  }

  // Build monthly chart data (last 6 months)
  const now = new Date()
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })

    const monthProjects = allProjectsForChart.filter((p) => {
      const created = new Date(p.createdAt)
      return created >= d && created <= monthEnd
    })

    return {
      month: label,
      quoted: monthProjects.filter((p) => p.salesStage === "QUOTED" || p.salesStage === "ORDER").length,
      ordered: monthProjects.filter((p) => p.salesStage === "ORDER").length,
      completed: monthProjects.filter((p) => p.projectStatus === "COMPLETE").length,
    }
  })

  // Chart-ready data
  const chartProjectsByStatus = projectsByStatus.map((g) => ({
    status: g.projectStatus,
    count: g._count.id,
  }))

  const chartDepartmentCounts = departmentCounts.map((d) => ({
    department: d.currentDepartment,
    count: d._count.id,
  }))

  const chartPipelineData = [
    { stage: "Opportunity", value: opportunityValue, count: opportunityCount },
    { stage: "Quoted", value: quotedValue, count: quotedCount },
    { stage: "On Order", value: orderValue, count: orderCount },
  ]

  return {
    totalProjects,
    activeProjects,
    totalProducts,
    orderProjects,
    projectsByStatus,
    departmentCounts,
    recentProjects,
    overdueProducts,
    pipeline: { opportunityValue, quotedValue, orderValue, total: opportunityValue + quotedValue + orderValue },
    quotes: { total: totalQuotes, draft: quoteCountMap["DRAFT"] || 0, submitted: quoteCountMap["SUBMITTED"] || 0, accepted: quoteCountMap["ACCEPTED"] || 0 },
    icuProjects,
    recentQuotes,
    openNcrs,
    charts: {
      projectsByStatus: chartProjectsByStatus,
      departmentCounts: chartDepartmentCounts,
      pipelineData: chartPipelineData,
      monthlyData,
    },
  }
}

function getQuoteStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    SUBMITTED: "bg-blue-100 text-blue-800",
    ACCEPTED: "bg-green-100 text-green-800",
    DECLINED: "bg-red-100 text-red-800",
    REVISED: "bg-amber-100 text-amber-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

export default async function DashboardPage() {
  const data = await getDashboardData()

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

      {/* Product pipeline by department */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Product Pipeline</CardTitle>
            <Link href="/projects?view=tracker" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Open Tracker <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {data.departmentCounts.map((dc) => (
              <Link key={dc.currentDepartment} href={`/projects?view=tracker&department=${dc.currentDepartment}`}>
                <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 transition-shadow hover:shadow-md cursor-pointer">
                  <Badge variant="secondary" className={getDepartmentColor(dc.currentDepartment)}>
                    {prettifyEnum(dc.currentDepartment)}
                  </Badge>
                  <span className="text-lg font-semibold text-gray-900">{dc._count.id}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <DashboardCharts
        projectsByStatus={data.charts.projectsByStatus}
        departmentCounts={data.charts.departmentCounts}
        pipelineData={data.charts.pipelineData}
        monthlyData={data.charts.monthlyData}
      />

      {/* Project Timeline */}
      <DashboardTimeline />

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Projects table - takes 2 cols */}
        <Card className="lg:col-span-2">
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

        {/* Right column */}
        <div className="space-y-6">
          {/* Recent Quotes */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Quotes</CardTitle>
                <Link href="/quotes" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  View all <ArrowRight className="ml-1 inline h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {data.recentQuotes.length > 0 ? (
                <div className="space-y-2">
                  {data.recentQuotes.map((quote) => (
                    <Link key={quote.id} href={`/quotes/${quote.id}`}>
                      <div className="flex items-center justify-between rounded-lg border border-border p-2.5 transition-shadow hover:shadow-sm cursor-pointer">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-medium text-gray-700">{quote.quoteNumber}</span>
                            <Badge variant="secondary" className={`${getQuoteStatusColor(quote.status)} text-[10px]`}>
                              {prettifyEnum(quote.status)}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{quote.customer.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono font-medium text-gray-900">
                            {quote.totalSell ? formatCurrency(Number(quote.totalSell)) : "—"}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No quotes yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Overdue / attention needed */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base font-semibold">Needs Attention</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {data.overdueProducts.length > 0 ? (
                <div className="space-y-2">
                  {data.overdueProducts.map((product) => (
                    <Link key={product.id} href={`/projects/${product.project.id}`}>
                      <div className="rounded-lg border border-red-100 bg-red-50 p-2.5 transition-shadow hover:shadow-sm cursor-pointer">
                        <p className="text-sm font-medium text-gray-900">{product.description}</p>
                        <p className="text-xs text-gray-500">
                          {product.project.projectNumber} — {product.project.name}
                        </p>
                        <p className="mt-1 text-xs font-medium text-red-600">
                          Due: {formatDate(product.requiredCompletionDate)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No overdue items. Everything on track.</p>
              )}
            </CardContent>
          </Card>

          {/* Projects by Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Projects by Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {data.projectsByStatus.map((group) => (
                  <Link key={group.projectStatus} href={`/projects?status=${group.projectStatus}`}>
                    <div className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-gray-50 cursor-pointer">
                      <Badge variant="secondary" className={getProjectStatusColor(group.projectStatus)}>
                        {prettifyEnum(group.projectStatus)}
                      </Badge>
                      <span className="text-sm font-semibold text-gray-900">{group._count.id}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
