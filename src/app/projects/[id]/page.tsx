import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Package,
  Edit,
  Flame,
  Siren,
  AlertTriangle,
  PoundSterling,
  CheckCircle,
  FileText,
} from "lucide-react"
import Link from "next/link"
import {
  formatDate,
  formatCurrency,
  getProjectStatusColor,
  getSalesStageColor,
  getDepartmentColor,
  getProductionStageColor,
  prettifyEnum,
  calculateScheduleRag,
  getRagColor,
} from "@/lib/utils"
import { ProductStatusActions } from "@/components/projects/product-status-actions"
import { AddProductDialog } from "@/components/projects/add-product-dialog"
import { RaiseNcrDialog } from "@/components/projects/raise-ncr-dialog"
import { DocumentManager } from "@/components/projects/document-manager"
import { ProjectActivityLog } from "@/components/projects/project-activity-log"
import { ProductHandoverButton } from "@/components/projects/product-handover-button"

export const dynamic = 'force-dynamic'

async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true } },
      coordinator: { select: { id: true, name: true } },
      projectManager: { select: { name: true } },
      installManager: { select: { name: true } },
      products: {
        include: {
          designer: { select: { name: true } },
          coordinator: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      ncrs: {
        orderBy: { raisedDate: "desc" },
        select: {
          id: true, ncrNumber: true, title: true, severity: true, status: true,
          costImpact: true, raisedDate: true, closedDate: true,
          project: { select: { partCode: true, description: true } },
        },
      },
      retentions: {
        orderBy: { createdAt: "desc" },
        select: { id: true, retentionPercent: true, retentionAmount: true, releaseDate: true, status: true, notes: true },
      },
      plantHires: {
        orderBy: { createdAt: "desc" },
        include: { supplier: { select: { name: true } } },
      },
      subContracts: {
        orderBy: { createdAt: "desc" },
        include: {
          supplier: { select: { name: true } },
          product: { select: { partCode: true, description: true } },
        },
      },
      costCategories: {
        orderBy: { costCode: "asc" },
        select: { id: true, costCode: true, description: true, budgetAmount: true, committedAmount: true, actualAmount: true },
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        include: {
          quoteLines: {
            orderBy: { sortOrder: "asc" },
            include: { spec: { include: { variant: { select: { code: true, name: true } } } } },
          },
        },
      },
      documents: {
        orderBy: { uploadedAt: "desc" },
        include: {
          product: { select: { id: true, partCode: true, description: true } },
        },
      },
      variations: {
        orderBy: { dateRaised: "desc" },
        select: { id: true, variationNumber: true, title: true, description: true, type: true, status: true, costImpact: true, valueImpact: true, dateRaised: true },
      },
      designCards: {
        include: {
          product: { select: { id: true, description: true, partCode: true, productJobNumber: true } },
          assignedDesigner: { select: { id: true, name: true } },
          jobCards: { orderBy: { sortOrder: "asc" }, select: { id: true, jobType: true, status: true } },
        },
      },
      designHandover: {
        select: { id: true, status: true, initiatedAt: true, acknowledgedAt: true },
      },
      projectNotes: {
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          products: true,
          quotes: true,
          purchaseOrders: true,
          documents: true,
          ncrs: true,
          variations: true,
          designCards: true,
          projectNotes: true,
        },
      },
    },
  })
  return project
}

async function getProjectAuditEntries(projectId: string) {
  return prisma.auditLog.findMany({
    where: {
      OR: [
        { entity: "Project", entityId: projectId },
        { entity: "DesignHandover", metadata: { contains: projectId } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
}

function getRagBadge(rag: string | null) {
  if (!rag) return null
  const colors: Record<string, string> = {
    GREEN: "bg-green-100 text-green-700",
    AMBER: "bg-amber-100 text-amber-700",
    RED: "bg-red-100 text-red-700",
  }
  return <Badge variant="secondary" className={colors[rag] || ""}>{rag}</Badge>
}

function getNcrSeverityColor(severity: string) {
  const colors: Record<string, string> = {
    MINOR: "bg-yellow-100 text-yellow-700",
    MAJOR: "bg-orange-100 text-orange-700",
    CRITICAL: "bg-red-100 text-red-700",
  }
  return colors[severity] || "bg-gray-100 text-gray-700"
}

function getNcrStatusColor(status: string) {
  const colors: Record<string, string> = {
    OPEN: "bg-red-100 text-red-700",
    INVESTIGATING: "bg-amber-100 text-amber-700",
    RESOLVED: "bg-blue-100 text-blue-700",
    CLOSED: "bg-green-100 text-green-700",
  }
  return colors[status] || "bg-gray-100 text-gray-700"
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [project, catalogueItems, users, auditEntries] = await Promise.all([
    getProject(id),
    prisma.productCatalogue.findMany({
      orderBy: { partCode: "asc" },
      select: { id: true, partCode: true, description: true },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getProjectAuditEntries(id),
  ])

  if (!project) {
    notFound()
  }

  // Calculate department breakdown
  const departmentCounts: Record<string, number> = {}
  project.products.forEach((p) => {
    departmentCounts[p.currentDepartment] = (departmentCounts[p.currentDepartment] || 0) + 1
  })

  // Map product ID → design card status for handover button
  const designCardStatusMap: Record<string, string> = {}
  for (const dc of project.designCards) {
    designCardStatusMap[dc.product.id] = dc.status
  }

  const estimatedValue = Number(project.estimatedValue) || 0
  const contractValue = Number(project.contractValue) || 0
  const currentCost = Number(project.currentCost) || 0
  const ncrCost = Number(project.ncrCost) || 0

  return (
    <div className="space-y-6">
      {/* Breadcrumb & header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/projects" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
            <Badge variant="secondary" className={getProjectStatusColor(project.projectStatus)}>
              {prettifyEnum(project.projectStatus)}
            </Badge>
            <Badge variant="secondary" className={getSalesStageColor(project.salesStage)}>
              {prettifyEnum(project.salesStage)}
            </Badge>
            {getRagBadge(project.ragStatus)}
            {project.isICUFlag && (
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                <Siren className="mr-1 h-3 w-3" /> ICU
              </Badge>
            )}
            {project.priority === "CRITICAL" && !project.isICUFlag && (
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                <Flame className="mr-1 h-3 w-3" /> Critical
              </Badge>
            )}
            {project.priority === "HIGH" && !project.isICUFlag && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                <AlertTriangle className="mr-1 h-3 w-3" /> High
              </Badge>
            )}
            {project.workStream && (() => {
              const wsLabels: Record<string, string> = { UTILITIES: "Utility", BESPOKE: "Bespoke", COMMUNITY: "Community", BLAST: "Blast", REFURBISHMENT: "Refurb" }
              const wsColors: Record<string, string> = { UTILITIES: "bg-blue-100 text-blue-700", BESPOKE: "bg-purple-100 text-purple-700", COMMUNITY: "bg-green-100 text-green-700", BLAST: "bg-orange-100 text-orange-700", REFURBISHMENT: "bg-teal-100 text-teal-700" }
              const label = wsLabels[project.workStream]
              if (!label) return null
              return <Badge variant="secondary" className={wsColors[project.workStream] || ""}>{label}</Badge>
            })()}
          </div>
          <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
            <span className="font-mono font-medium">{project.projectNumber}</span>
            <span>{prettifyEnum(project.projectType)}</span>
            <span>{prettifyEnum(project.workStream)}</span>
          </div>
        </div>
        <Link href={`/projects/${project.id}/edit`}>
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit Project
          </Button>
        </Link>
      </div>

      {/* Key info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-500">Customer</p>
                <p className="text-sm font-medium text-gray-900">
                  {project.customer ? (
                    <Link href={`/customers/${project.customer.id}`} className="text-blue-600 hover:text-blue-700">
                      {project.customer.name}
                    </Link>
                  ) : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-500">Project Manager</p>
                <p className="text-sm font-medium text-gray-900">{project.projectManager?.name || "Unassigned"}</p>
                {project.coordinator && (
                  <p className="text-xs text-gray-400">Coord: {project.coordinator.name}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-500">Products</p>
                <p className="text-sm font-medium text-gray-900">{project._count.products}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-500">Target Completion</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(project.targetCompletion)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial cards */}
      {(estimatedValue > 0 || contractValue > 0 || currentCost > 0 || ncrCost > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <PoundSterling className="h-3.5 w-3.5" /> Estimated Value
              </div>
              <div className="text-lg font-mono font-medium text-gray-900">
                {estimatedValue ? formatCurrency(estimatedValue) : "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <PoundSterling className="h-3.5 w-3.5" /> Contract Value
              </div>
              <div className="text-lg font-mono font-semibold text-blue-700">
                {contractValue ? formatCurrency(contractValue) : "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <PoundSterling className="h-3.5 w-3.5" /> Current Cost
              </div>
              <div className="text-lg font-mono font-medium text-gray-900">
                {currentCost ? formatCurrency(currentCost) : "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <PoundSterling className="h-3.5 w-3.5" /> NCR Cost
              </div>
              <div className={`text-lg font-mono font-medium ${ncrCost > 0 ? "text-red-600" : "text-gray-900"}`}>
                {ncrCost ? formatCurrency(ncrCost) : "—"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Products ({project._count.products})</TabsTrigger>
          <TabsTrigger value="quotes">Quotes ({project._count.quotes})</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ncrs">NCRs ({project._count.ncrs})</TabsTrigger>
          <TabsTrigger value="variations">Variations ({project._count.variations})</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          {project._count.designCards > 0 && (
            <TabsTrigger value="design">Design ({project._count.designCards})</TabsTrigger>
          )}
          <TabsTrigger value="documents">Documents ({project._count.documents})</TabsTrigger>
          <TabsTrigger value="activity">Activity ({project._count.projectNotes})</TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {Object.entries(departmentCounts).map(([dept, count]) => (
                <div key={dept} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5">
                  <Badge variant="secondary" className={getDepartmentColor(dept)}>
                    {prettifyEnum(dept)}
                  </Badge>
                  <span className="text-sm font-medium text-gray-700">{count}</span>
                </div>
              ))}
            </div>
            <AddProductDialog
              projectId={project.id}
              catalogueItems={catalogueItems}
              users={users}
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/50">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Job No.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Part</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Details</th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Production</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Designer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Due</th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">RAG</th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Handover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {project.products.map((product) => {
                      const scheduleRag = calculateScheduleRag(product.requiredCompletionDate)
                      return (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{product.productJobNumber || "—"}</td>
                          <td className="px-4 py-3 font-mono text-xs font-medium text-gray-700">{product.partCode}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{product.description}</td>
                          <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{product.additionalDetails || "—"}</td>
                          <td className="px-4 py-3 text-center font-mono">{product.quantity}</td>
                          <td className="px-4 py-3">
                            <ProductStatusActions
                              productId={product.id}
                              currentDepartment={product.currentDepartment}
                              currentProductionStage={product.productionStatus}
                            />
                          </td>
                          <td className="px-4 py-3">
                            {product.productionStatus ? (
                              <Badge variant="secondary" className={getProductionStageColor(product.productionStatus)}>
                                {prettifyEnum(product.productionStatus)}
                              </Badge>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{product.designer?.name || "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{formatDate(product.requiredCompletionDate)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className={`mx-auto h-3 w-3 rounded-full ${getRagColor(scheduleRag)}`} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <ProductHandoverButton
                              projectId={project.id}
                              productId={product.id}
                              designStatus={designCardStatusMap[product.id] || null}
                              productionStatus={product.productionStatus}
                            />
                          </td>
                        </tr>
                      )
                    })}
                    {project.products.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                          No products added to this project yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes" className="space-y-4">
          {project.quotes.map((quote) => (
            <Card key={quote.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <CardTitle className="text-base">{quote.quoteNumber}</CardTitle>
                      {quote.subject && (
                        <p className="text-sm text-gray-500">{quote.subject}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={
                        quote.status === "ACCEPTED"
                          ? "bg-green-100 text-green-700"
                          : quote.status === "SUBMITTED"
                            ? "bg-blue-100 text-blue-700"
                            : quote.status === "DECLINED"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                      }
                    >
                      {prettifyEnum(quote.status)}
                    </Badge>
                    {quote.totalSell && (
                      <span className="font-mono text-sm font-semibold text-blue-700">
                        {formatCurrency(Number(quote.totalSell))}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-border bg-gray-50/50">
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">#</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Variant</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Dimensions</th>
                        <th className="px-4 py-2 text-center text-xs font-medium uppercase text-gray-500">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Unit Cost</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {quote.quoteLines.map((line, idx) => (
                        <tr key={line.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-xs text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-2 text-gray-900">{line.description}</td>
                          <td className="px-4 py-2 text-xs text-gray-500">
                            {line.spec?.variant
                              ? `${line.spec.variant.code} — ${line.spec.variant.name}`
                              : "—"}
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-500">
                            {line.dimensions || (line.spec?.width && line.spec?.height
                              ? `${line.spec.width} x ${line.spec.height}`
                              : "—")}
                          </td>
                          <td className="px-4 py-2 text-center font-mono">{line.quantity}</td>
                          <td className="px-4 py-2 text-right font-mono text-sm">
                            {line.unitCost ? formatCurrency(Number(line.unitCost)) : "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-sm font-medium">
                            {line.costTotal ? formatCurrency(Number(line.costTotal)) : "—"}
                          </td>
                        </tr>
                      ))}
                      {quote.quoteLines.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                            No line items in this quote.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {quote.quoteLines.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-border bg-gray-50">
                          <td colSpan={5} />
                          <td className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total Cost</td>
                          <td className="px-4 py-2 text-right font-mono text-sm font-semibold text-gray-900">
                            {formatCurrency(
                              quote.quoteLines.reduce((s, l) => s + Number(l.costTotal || 0), 0)
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                {quote.notes && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="text-xs text-gray-500">{quote.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {project.quotes.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No quotes linked to this project.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* P0-P5 Lifecycle Gates */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Project Lifecycle</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const stages = [
                  { key: "P0", label: "Enquiry", date: project.p0Date },
                  { key: "P1", label: "Quotation", date: project.p1Date },
                  { key: "P2", label: "Order Handover", date: project.p2Date },
                  { key: "P3", label: "Design Review", date: project.p3Date },
                  { key: "P4", label: "Production Complete", date: project.p4Date },
                  { key: "P5", label: "Handover / Close", date: project.p5Date },
                ]
                const stageOrder = ["P0", "P1", "P2", "P3", "P4", "P5"]
                const currentIdx = stageOrder.indexOf(project.lifecycleStage)

                return (
                  <div className="flex items-center gap-0">
                    {stages.map((stage, idx) => {
                      const isComplete = idx < currentIdx
                      const isCurrent = idx === currentIdx
                      return (
                        <div key={stage.key} className="flex items-center flex-1">
                          <div className="flex flex-col items-center flex-1">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                              isComplete
                                ? "border-green-500 bg-green-500 text-white"
                                : isCurrent
                                  ? "border-blue-500 bg-blue-50 text-blue-700"
                                  : "border-gray-200 bg-white text-gray-400"
                            }`}>
                              {isComplete ? (
                                <CheckCircle className="h-5 w-5" />
                              ) : (
                                stage.key
                              )}
                            </div>
                            <span className={`mt-1.5 text-[10px] font-medium text-center ${
                              isCurrent ? "text-blue-700" : isComplete ? "text-green-700" : "text-gray-400"
                            }`}>
                              {stage.label}
                            </span>
                            {stage.date && (
                              <span className="text-[9px] text-gray-400">{formatDate(stage.date)}</span>
                            )}
                          </div>
                          {idx < stages.length - 1 && (
                            <div className={`h-0.5 flex-1 -mt-4 ${
                              idx < currentIdx ? "bg-green-500" : "bg-gray-200"
                            }`} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Project Number</p>
                    <p className="font-mono text-sm font-medium">{project.projectNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Contract Type</p>
                    <p className="text-sm">{prettifyEnum(project.contractType)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Project Type</p>
                    <p className="text-sm">{prettifyEnum(project.projectType)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Work Stream</p>
                    <p className="text-sm">{prettifyEnum(project.workStream)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Work Stream</p>
                    <p className="text-sm">{prettifyEnum(project.workStream)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Priority</p>
                    <p className="text-sm">{prettifyEnum(project.priority)}</p>
                  </div>
                </div>
                {project.siteLocation && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Site Location</p>
                    <p className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      {project.siteLocation}
                    </p>
                  </div>
                )}
                {project.projectRegion && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Region</p>
                    <p className="text-sm">{project.projectRegion}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Install Manager</p>
                    <p className="text-sm">{project.installManager?.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Delivery Type</p>
                    <p className="text-sm">{project.deliveryType || "—"}</p>
                  </div>
                </div>
                {project.notes && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Notes</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-sm text-gray-500">Enquiry Received</span>
                  <span className="text-sm font-medium">{formatDate(project.enquiryReceived)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-sm text-gray-500">Quote Submitted</span>
                  <span className="text-sm font-medium">{formatDate(project.quoteSubmitted)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-sm text-gray-500">Order Received</span>
                  <span className="text-sm font-medium">{formatDate(project.orderReceived)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-sm text-gray-500">Target Completion</span>
                  <span className="text-sm font-medium">{formatDate(project.targetCompletion)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Actual Completion</span>
                  <span className="text-sm font-medium">{formatDate(project.actualCompletion)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* NCRs Tab */}
        <TabsContent value="ncrs" className="space-y-4">
          <div className="flex justify-end">
            <RaiseNcrDialog
              projectId={project.id}
              products={project.products.map((p) => ({ id: p.id, partCode: p.partCode, description: p.description }))}
              productsWithDesignCards={project.designCards.map((dc) => dc.product.id)}
            />
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/50">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">NCR No.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Severity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Cost Impact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Raised</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Closed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {project.ncrs.map((ncr) => (
                      <tr key={ncr.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{ncr.ncrNumber}</td>
                        <td className="px-4 py-3 text-gray-900">{ncr.title}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {ncr.project ? `${ncr.project.partCode} — ${ncr.project.description}` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={getNcrSeverityColor(ncr.severity)}>
                            {ncr.severity}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={getNcrStatusColor(ncr.status)}>
                            {prettifyEnum(ncr.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {ncr.costImpact ? (
                            <span className="text-red-600">{formatCurrency(Number(ncr.costImpact))}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatDate(ncr.raisedDate)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatDate(ncr.closedDate)}</td>
                      </tr>
                    ))}
                    {project.ncrs.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                          No NCRs raised for this project.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Variations Tab */}
        <TabsContent value="variations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Variations & Change Orders</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {project.variations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t border-border bg-gray-50">
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">No.</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Title</th>
                        <th className="px-4 py-2 text-center text-xs font-medium uppercase text-gray-500">Type</th>
                        <th className="px-4 py-2 text-center text-xs font-medium uppercase text-gray-500">Status</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Cost Impact</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Value Impact</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Raised</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {project.variations.map((v) => {
                        const statusColors: Record<string, string> = {
                          PENDING: "bg-gray-100 text-gray-700",
                          SUBMITTED: "bg-blue-100 text-blue-700",
                          APPROVED: "bg-green-100 text-green-700",
                          REJECTED: "bg-red-100 text-red-700",
                          IMPLEMENTED: "bg-purple-100 text-purple-700",
                        }
                        const typeColors: Record<string, string> = {
                          CLIENT_INSTRUCTION: "bg-blue-50 text-blue-700",
                          DESIGN_CHANGE: "bg-purple-50 text-purple-700",
                          SITE_CONDITION: "bg-amber-50 text-amber-700",
                          SCOPE_CHANGE: "bg-orange-50 text-orange-700",
                          OMISSION: "bg-red-50 text-red-700",
                          ADDITION: "bg-green-50 text-green-700",
                        }
                        return (
                          <tr key={v.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono text-xs font-semibold">{v.variationNumber}</td>
                            <td className="px-4 py-2">
                              <div className="font-medium text-gray-900">{v.title}</div>
                              {v.description && <div className="text-xs text-gray-500 truncate max-w-xs">{v.description}</div>}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <Badge variant="secondary" className={`text-[10px] ${typeColors[v.type] || ""}`}>
                                {prettifyEnum(v.type)}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <Badge variant="secondary" className={`text-[10px] ${statusColors[v.status] || ""}`}>
                                {prettifyEnum(v.status)}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-xs">
                              {v.costImpact ? formatCurrency(Number(v.costImpact)) : "—"}
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-xs">
                              {v.valueImpact ? formatCurrency(Number(v.valueImpact)) : "—"}
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-500">{formatDate(v.dateRaised)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-4 py-12 text-center text-sm text-gray-500">
                  No variations raised on this project.
                </div>
              )}
              {/* Variation totals */}
              {project.variations.length > 0 && (
                <div className="border-t border-border px-4 py-3 bg-gray-50 flex items-center gap-6">
                  <div className="text-xs text-gray-500">
                    <strong>{project.variations.length}</strong> variation{project.variations.length !== 1 ? "s" : ""}
                  </div>
                  <div className="text-xs text-gray-500">
                    Cost Impact: <strong className="font-mono">{formatCurrency(project.variations.reduce((s, v) => s + Number(v.costImpact || 0), 0))}</strong>
                  </div>
                  <div className="text-xs text-gray-500">
                    Value Impact: <strong className="font-mono">{formatCurrency(project.variations.reduce((s, v) => s + Number(v.valueImpact || 0), 0))}</strong>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financials" className="space-y-6">
          {/* Retentions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Retention Holdbacks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/50">
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Retention %</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Release Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {project.retentions.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-right font-mono text-sm">{r.retentionPercent ? `${Number(r.retentionPercent)}%` : "—"}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm">{r.retentionAmount ? formatCurrency(Number(r.retentionAmount)) : "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{formatDate(r.releaseDate)}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="secondary" className={r.status === "RELEASED" ? "bg-green-100 text-green-700" : r.status === "PARTIALLY_RELEASED" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}>
                            {prettifyEnum(r.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{r.notes || "—"}</td>
                      </tr>
                    ))}
                    {project.retentions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No retention holdbacks recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Plant Hire */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plant Hire</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/50">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Start</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">End</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Weekly Rate</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Total Cost</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {project.plantHires.map((ph) => (
                      <tr key={ph.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-900">{ph.description}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{ph.supplier?.name || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{formatDate(ph.hireStart)}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{formatDate(ph.hireEnd)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm">{ph.weeklyRate ? formatCurrency(Number(ph.weeklyRate)) : "—"}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm font-medium">{ph.totalCost ? formatCurrency(Number(ph.totalCost)) : "—"}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="secondary" className={ph.status === "RETURNED" ? "bg-green-100 text-green-700" : ph.status === "OFF_HIRE" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}>
                            {prettifyEnum(ph.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {project.plantHires.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No plant hire recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Sub-Contractor Work */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sub-Contractor Work</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/50">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Product</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Agreed Value</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Invoiced</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {project.subContracts.map((sc) => (
                      <tr key={sc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-900">{sc.description}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{sc.supplier?.name || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{sc.product ? `${sc.product.partCode}` : "—"}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm">{sc.agreedValue ? formatCurrency(Number(sc.agreedValue)) : "—"}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm">{sc.invoicedToDate ? formatCurrency(Number(sc.invoicedToDate)) : "—"}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="secondary" className={sc.status === "COMPLETE" ? "bg-green-100 text-green-700" : sc.status === "DISPUTED" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>
                            {prettifyEnum(sc.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {project.subContracts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No sub-contractor work recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Cost Categories (Sage) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cost Categories (Sage)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/50">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Cost Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Budget</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Committed</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actual</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {project.costCategories.map((cc) => {
                      const budget = Number(cc.budgetAmount) || 0
                      const actual = Number(cc.actualAmount) || 0
                      const variance = budget - actual
                      return (
                        <tr key={cc.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-700">{cc.costCode}</td>
                          <td className="px-4 py-2.5 text-gray-900">{cc.description}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-sm">{budget ? formatCurrency(budget) : "—"}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-sm">{cc.committedAmount ? formatCurrency(Number(cc.committedAmount)) : "—"}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-sm">{actual ? formatCurrency(actual) : "—"}</td>
                          <td className={`px-4 py-2.5 text-right font-mono text-sm font-medium ${variance >= 0 ? "text-green-700" : "text-red-600"}`}>
                            {budget ? formatCurrency(variance) : "—"}
                          </td>
                        </tr>
                      )
                    })}
                    {project.costCategories.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No cost categories set up. Add via Sage integration.</td>
                      </tr>
                    )}
                    {project.costCategories.length > 0 && (
                      <tr className="bg-gray-50 font-medium">
                        <td colSpan={2} className="px-4 py-2.5 text-right text-sm text-gray-700">Totals</td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm text-gray-900">
                          {formatCurrency(project.costCategories.reduce((sum, cc) => sum + (Number(cc.budgetAmount) || 0), 0))}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm text-gray-900">
                          {formatCurrency(project.costCategories.reduce((sum, cc) => sum + (Number(cc.committedAmount) || 0), 0))}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm text-gray-900">
                          {formatCurrency(project.costCategories.reduce((sum, cc) => sum + (Number(cc.actualAmount) || 0), 0))}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono text-sm font-semibold ${
                          project.costCategories.reduce((sum, cc) => sum + ((Number(cc.budgetAmount) || 0) - (Number(cc.actualAmount) || 0)), 0) >= 0
                            ? "text-green-700"
                            : "text-red-600"
                        }`}>
                          {formatCurrency(project.costCategories.reduce((sum, cc) => sum + ((Number(cc.budgetAmount) || 0) - (Number(cc.actualAmount) || 0)), 0))}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Design Tab */}
        {project._count.designCards > 0 && (
          <TabsContent value="design" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  {project.designCards.filter((c) => c.status === "COMPLETE").length} of {project.designCards.length} products complete
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/design/handover/${project.id}`}>
                  <Button variant="outline" size="sm">Handover</Button>
                </Link>
              </div>
            </div>

            {project.designCards.map((card) => (
              <Card key={card.id} className="py-4">
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{card.product.description}</p>
                      <p className="text-xs text-gray-500">
                        {card.product.productJobNumber || card.product.partCode}
                        {card.assignedDesigner && <> &middot; {card.assignedDesigner.name}</>}
                      </p>
                    </div>
                    <Badge className={
                      card.status === "COMPLETE" ? "bg-green-100 text-green-700" :
                      card.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                      card.status === "REVIEW" ? "bg-amber-100 text-amber-700" :
                      card.status === "ON_HOLD" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }>
                      {prettifyEnum(card.status)}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    {card.jobCards.map((jc) => {
                      const color =
                        jc.status === "SIGNED_OFF" ? "bg-green-500" :
                        jc.status === "APPROVED" ? "bg-emerald-400" :
                        jc.status === "SUBMITTED" ? "bg-amber-400" :
                        jc.status === "IN_PROGRESS" ? "bg-blue-400" :
                        jc.status === "READY" ? "bg-slate-300" :
                        jc.status === "REJECTED" ? "bg-red-400" :
                        "bg-gray-200"
                      const labels: Record<string, string> = {
                        GA_DRAWING: "GA",
                        PRODUCTION_DRAWINGS: "Prod",
                        BOM_FINALISATION: "BOM",
                        DESIGN_REVIEW: "Review",
                      }
                      return (
                        <div key={jc.id} className="flex-1" title={`${jc.jobType}: ${jc.status}`}>
                          <Link href={`/design/jobs/${jc.id}`}>
                            <div className={`h-2 rounded-full ${color} hover:opacity-80 cursor-pointer`} />
                          </Link>
                          <p className="text-[9px] text-gray-400 mt-0.5 text-center">{labels[jc.jobType] || jc.jobType}</p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            {project.designHandover && (
              <Card className="py-4">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Handover Status</p>
                      <p className="text-xs text-gray-500">
                        {project.designHandover.status === "ACKNOWLEDGED"
                          ? `Acknowledged ${project.designHandover.acknowledgedAt ? new Date(project.designHandover.acknowledgedAt).toLocaleDateString("en-GB") : ""}`
                          : project.designHandover.status === "SUBMITTED"
                          ? "Awaiting Production acknowledgement"
                          : prettifyEnum(project.designHandover.status)}
                      </p>
                    </div>
                    <Badge className={
                      project.designHandover.status === "ACKNOWLEDGED" ? "bg-green-100 text-green-700" :
                      project.designHandover.status === "SUBMITTED" ? "bg-amber-100 text-amber-700" :
                      project.designHandover.status === "REJECTED" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }>
                      {prettifyEnum(project.designHandover.status)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Documents Tab */}
        <TabsContent value="documents">
          <DocumentManager
            projectId={project.id}
            documents={JSON.parse(JSON.stringify(project.documents))}
            products={project.products.map((p) => ({
              id: p.id,
              partCode: p.partCode,
              description: p.description,
            }))}
          />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <ProjectActivityLog
            projectId={project.id}
            initialNotes={JSON.parse(JSON.stringify(project.projectNotes))}
            auditEntries={JSON.parse(JSON.stringify(auditEntries))}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
