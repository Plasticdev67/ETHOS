import { prisma } from "@/lib/db"
import { DesignBoard } from "@/components/design/design-board"
import { DesignerWorkloadBoard } from "@/components/design/designer-workload-board"
import { DesignTimeline } from "@/components/design/design-timeline"
import { HandoverTrackingPanel } from "@/components/design/handover-tracking-panel"
import { ProductionFeedStrip } from "@/components/design/production-feed-strip"
import { FactoryFeed } from "@/components/design/factory-feed"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const dynamic = 'force-dynamic'

async function getDesignDashboardData() {
  const [projects, allDesignCards, designers, handovers] = await Promise.all([
    // All projects in design workflow OR won projects ready for design
    prisma.project.findMany({
      where: {
        OR: [
          { designCards: { some: {} } },
          {
            designCards: { none: {} },
            projectStatus: "DESIGN",
          },
        ],
      },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        targetCompletion: true,
        designEstimatedCompletion: true,
        priority: true,
        contractValue: true,
        customer: { select: { name: true } },
        projectManager: { select: { name: true } },
        products: {
          select: { id: true, description: true, partCode: true, productJobNumber: true, quantity: true },
        },
        designCards: {
          include: {
            product: {
              select: { id: true, description: true, partCode: true, productJobNumber: true, productionStatus: true, planningRoute: true },
            },
            assignedDesigner: { select: { id: true, name: true } },
            jobCards: {
              select: { id: true, jobType: true, status: true, assignedToId: true },
              orderBy: { sortOrder: "asc" },
            },
            waitEvents: {
              where: { resolvedAt: null },
              select: {
                id: true, reason: true, notes: true, externalParty: true,
                triggeredAt: true, resolvedAt: true,
                triggeredBy: { select: { id: true, name: true } },
              },
              orderBy: { triggeredAt: "desc" },
              take: 1,
            },
          },
        },
        designHandover: {
          select: { id: true, status: true, includedProductIds: true },
        },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    }),

    // Combined query for workload + timeline cards (replaces 2 separate queries)
    prisma.productDesignCard.findMany({
      where: {
        OR: [
          { status: { notIn: ["COMPLETE", "ON_HOLD"] } },
          { assignedDesignerId: { not: null } },
        ],
      },
      select: {
        id: true,
        status: true,
        estimatedHours: true,
        actualHours: true,
        targetStartDate: true,
        targetEndDate: true,
        actualStartDate: true,
        actualEndDate: true,
        assignedDesignerId: true,
        product: {
          select: { id: true, description: true, partCode: true, productJobNumber: true },
        },
        project: {
          select: { id: true, projectNumber: true, name: true },
        },
        assignedDesigner: { select: { id: true, name: true } },
        jobCards: {
          select: { id: true, jobType: true, status: true, assignedToId: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),

    // All users who can be assigned design work
    prisma.user.findMany({
      where: {
        role: { in: ["DESIGN_ENGINEER", "ENGINEERING_MANAGER", "R_AND_D_MANAGER", "ADMIN"] },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),

    // All handovers for tracking panel
    prisma.designHandover.findMany({
      where: {
        status: { in: ["SUBMITTED", "REJECTED", "ACKNOWLEDGED"] },
      },
      select: {
        id: true,
        status: true,
        checklist: true,
        designNotes: true,
        initiatedAt: true,
        acknowledgedAt: true,
        rejectedAt: true,
        rejectionReason: true,
        includedProductIds: true,
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
            customer: { select: { name: true } },
            products: {
              select: { id: true, partCode: true, description: true },
            },
          },
        },
        initiatedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ])

  // Split combined cards into workload and timeline sets
  const allCards = allDesignCards.filter(
    (c) => c.status !== "COMPLETE" && c.status !== "ON_HOLD"
  )
  const timelineCards = allDesignCards.filter(
    (c) => c.assignedDesignerId !== null
  )

  return { projects, allCards, timelineCards, designers, handovers }
}

export default async function DesignPage() {
  const { projects, allCards, timelineCards, designers, handovers } = await getDesignDashboardData()

  // Map handover data onto projects for DesignBoard
  const projectsWithHandovers = projects.map((p) => {
    const handoverData = p.designHandover as { id: string; status: string; includedProductIds: string[] | null } | null
    return {
      ...p,
      handover: handoverData
        ? {
            id: handoverData.id,
            status: handoverData.status,
            includedProductIds: (handoverData.includedProductIds || []) as string[],
          }
        : null,
    }
  })

  // ── Production Feed data ──
  // Count design cards across all projects by status
  const allDesignCardsFlat = projects.flatMap((p) => p.designCards)
  const IDLE_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000
  const now = Date.now()

  const readyForProduction = allDesignCardsFlat.filter(
    (c) => c.status === "COMPLETE" && !c.product.productionStatus
  ).length

  const activeInDesign = allDesignCardsFlat.filter(
    (c) => (c.status === "IN_PROGRESS" || c.status === "REVIEW") &&
      (now - new Date(c.updatedAt).getTime()) < IDLE_THRESHOLD_MS
  ).length

  const idleInDesign = allDesignCardsFlat.filter(
    (c) => (c.status === "IN_PROGRESS" || c.status === "REVIEW") &&
      (now - new Date(c.updatedAt).getTime()) >= IDLE_THRESHOLD_MS
  ).length

  const awaitingResponse = allDesignCardsFlat.filter(
    (c) => c.status === "AWAITING_RESPONSE"
  ).length

  const queued = allDesignCardsFlat.filter(
    (c) => c.status === "QUEUED"
  ).length

  // Timeline — projects with active design work
  const projectsInDesign = projects.filter((p) =>
    p.designCards.some((c) => c.status !== "COMPLETE" && c.status !== "ON_HOLD")
  )

  type TimelineEntry = {
    projectId: string
    projectNumber: string
    projectName: string
    customerName: string | null
    productCount: number
    designEstimatedCompletion: string | null
    designCardsComplete: number
    designCardsTotal: number
  }

  const timeline: TimelineEntry[] = projectsInDesign.map((p) => ({
    projectId: p.id,
    projectNumber: p.projectNumber,
    projectName: p.name,
    customerName: p.customer?.name || null,
    productCount: p.designCards.length,
    designEstimatedCompletion: p.designEstimatedCompletion ? new Date(p.designEstimatedCompletion).toISOString() : null,
    designCardsComplete: p.designCards.filter((c) => c.status === "COMPLETE").length,
    designCardsTotal: p.designCards.length,
  }))

  const feedData = {
    readyForProduction,
    activeInDesign,
    idleInDesign,
    awaitingResponse,
    queued,
    timeline,
  }

  // ── Factory Feed data ──
  // Flatten all design cards into product-level rows
  const factoryFeedProducts = projects.flatMap((p) =>
    p.designCards
      .filter((c) => c.status !== "COMPLETE" || !c.product.productionStatus) // exclude products already in production
      .map((c) => {
        const activeWait = c.waitEvents?.find((w: { resolvedAt: string | null }) => !w.resolvedAt) || null
        return {
          designCardId: c.id,
          designCardStatus: c.status,
          designCardUpdatedAt: new Date(c.updatedAt).toISOString(),
          productId: c.product.id,
          partCode: c.product.partCode,
          description: c.product.description,
          productJobNumber: c.product.productJobNumber,
          productionStatus: c.product.productionStatus,
          projectId: p.id,
          projectNumber: p.projectNumber,
          projectName: p.name,
          customerName: p.customer?.name || null,
          planningRoute: c.product.planningRoute || "ETO",
          designEstimatedCompletion: p.designEstimatedCompletion ? new Date(p.designEstimatedCompletion).toISOString() : null,
          designerName: c.assignedDesigner?.name || null,
          jobCards: c.jobCards.map((j) => ({ id: j.id, jobType: j.jobType, status: j.status })),
          activeWait: activeWait ? {
            id: (activeWait as Record<string, unknown>).id as string,
            reason: (activeWait as Record<string, unknown>).reason as string,
            externalParty: (activeWait as Record<string, unknown>).externalParty as string | null,
            triggeredAt: new Date((activeWait as Record<string, unknown>).triggeredAt as string).toISOString(),
            resolvedAt: null,
          } : null,
        }
      })
  )

  const serializedProjects = JSON.parse(JSON.stringify(projectsWithHandovers))
  const serializedCards = JSON.parse(JSON.stringify(allCards))
  const serializedTimeline = JSON.parse(JSON.stringify(timelineCards))
  const serializedHandovers = JSON.parse(JSON.stringify(handovers))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Design Department</h1>
        <p className="text-sm text-gray-500 mt-1">
          {projects.length} project{projects.length !== 1 ? "s" : ""} in design workflow
        </p>
      </div>

      {/* Production Feed Strip */}
      <ProductionFeedStrip data={feedData} />

      {/* Tabbed views */}
      <Tabs defaultValue="board" className="space-y-4">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="factory-feed">Factory Feed</TabsTrigger>
          <TabsTrigger value="workload">Workload</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="space-y-6">
          {/* Project-level board */}
          <DesignBoard projects={serializedProjects} designers={designers} />

          {/* Handover tracking panel */}
          <HandoverTrackingPanel handovers={serializedHandovers} />

          {/* Designer timeline */}
          <DesignTimeline cards={serializedTimeline} />
        </TabsContent>

        <TabsContent value="factory-feed">
          <FactoryFeed products={factoryFeedProducts} />
        </TabsContent>

        <TabsContent value="workload">
          {/* Designer workload board */}
          <DesignerWorkloadBoard cards={serializedCards} designers={designers} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
