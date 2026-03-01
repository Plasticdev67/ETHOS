import { prisma } from "@/lib/db"
import { ProductionDashboard, type ProductionProject, type DesignCompleteProject, type PendingHandover } from "@/components/production/production-dashboard"

export const dynamic = 'force-dynamic'

async function getProductionData() {
  const [projects, designCompleteProjects, pendingHandovers] = await Promise.all([
    // Active production projects (MANUFACTURE + DESIGN_FREEZE with acknowledged handovers)
    prisma.project.findMany({
      where: { projectStatus: { in: ["MANUFACTURE", "DESIGN_FREEZE"] } },
      orderBy: [{ priority: "asc" }, { targetCompletion: "asc" }],
      select: {
        id: true,
        projectNumber: true,
        name: true,
        projectStatus: true,
        departmentStatus: true,
        priority: true,
        isICUFlag: true,
        classification: true,
        ragStatus: true,
        contractValue: true,
        estimatedValue: true,
        ncrCost: true,
        targetCompletion: true,
        orderReceived: true,
        actualCompletion: true,
        customer: { select: { id: true, name: true } },
        coordinator: { select: { id: true, name: true } },
        projectManager: { select: { id: true, name: true } },
        products: {
          select: {
            id: true,
            partCode: true,
            description: true,
            quantity: true,
            productionStatus: true,
            productionPlannedStart: true,
            productionTargetDate: true,
            productionCompletionDate: true,
            currentDepartment: true,
            designCompletionDate: true,
            designCard: { select: { id: true } },
            productionCuttingHours: true,
            productionFabricationHours: true,
            productionFittingHours: true,
            productionShotblastingHours: true,
            productionPaintingHours: true,
            productionPackingHours: true,
          },
        },
        _count: {
          select: {
            products: true,
            ncrs: true,
          },
        },
      },
    }),

    // Design-complete projects (still in DESIGN only, not yet handed over) — read-only preview
    prisma.project.findMany({
      where: {
        projectStatus: "DESIGN",
        designCards: { some: { status: "COMPLETE" } },
      },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        projectStatus: true,
        targetCompletion: true,
        priority: true,
        isICUFlag: true,
        customer: { select: { name: true } },
        products: {
          select: { id: true, partCode: true, description: true },
        },
        designCards: {
          select: { id: true, status: true },
        },
        designHandover: {
          select: { id: true, status: true },
        },
        _count: { select: { products: true } },
      },
      orderBy: [{ priority: "asc" }, { targetCompletion: "asc" }],
    }),

    // Pending handovers (SUBMITTED status)
    prisma.designHandover.findMany({
      where: { status: "SUBMITTED" },
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            name: true,
            targetCompletion: true,
            priority: true,
            isICUFlag: true,
            customer: { select: { name: true } },
            products: {
              select: { id: true, partCode: true, description: true },
            },
            designCards: {
              select: {
                id: true,
                status: true,
                product: { select: { id: true, description: true, partCode: true } },
                jobCards: { select: { jobType: true, status: true } },
              },
            },
          },
        },
        initiatedBy: { select: { id: true, name: true } },
      },
      orderBy: { initiatedAt: "asc" },
    }),
  ])

  return { projects, designCompleteProjects, pendingHandovers }
}

export default async function ProductionDashboardPage() {
  const { projects, designCompleteProjects, pendingHandovers } = await getProductionData()
  const serialized: ProductionProject[] = JSON.parse(JSON.stringify(projects))
  const serializedDesignComplete: DesignCompleteProject[] = JSON.parse(JSON.stringify(designCompleteProjects))
  const serializedHandovers: PendingHandover[] = JSON.parse(JSON.stringify(pendingHandovers))

  return (
    <ProductionDashboard
      initialProjects={serialized}
      designCompleteProjects={serializedDesignComplete}
      pendingHandovers={serializedHandovers}
    />
  )
}
