import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  // Design queue depth
  const designQueue = await prisma.productDesignCard.groupBy({
    by: ["status"],
    _count: true,
    _sum: { estimatedHours: true },
    where: { status: { in: ["QUEUED", "IN_PROGRESS", "REVIEW"] } },
  })

  const designQueueCount = designQueue.reduce((s, g) => s + g._count, 0)
  const designQueueHours = designQueue.reduce(
    (s, g) => s + Number(g._sum.estimatedHours || 0),
    0
  )

  // Design throughput — average hours of completed cards
  const designAvg = await prisma.productDesignCard.aggregate({
    _avg: { actualHours: true, estimatedHours: true },
    _count: true,
    where: { status: "COMPLETE" },
  })

  // Production queue per stage
  const productionQueues = await prisma.productionTask.groupBy({
    by: ["stage"],
    _count: true,
    _sum: { estimatedMins: true },
    where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
  })

  const productionByStage: Record<string, { count: number; estimatedMinsTotal: number }> = {}
  for (const row of productionQueues) {
    productionByStage[row.stage] = {
      count: row._count,
      estimatedMinsTotal: Number(row._sum.estimatedMins || 0),
    }
  }

  // Department capacities
  const capacities = await prisma.departmentCapacity.findMany()
  const capacityMap: Record<string, { hoursPerWeek: number; headcount: number }> = {}
  for (const c of capacities) {
    capacityMap[c.department] = {
      hoursPerWeek: Number(c.hoursPerWeek),
      headcount: c.headcount,
    }
  }

  // Installation backlog — products with installPlannedStart but no installCompletionDate
  const installBacklog = await prisma.product.count({
    where: {
      installPlannedStart: { not: null },
      installCompletionDate: null,
      currentDepartment: "INSTALLATION",
    },
  })

  // Active project count
  const activeProjects = await prisma.project.count({
    where: { projectStatus: { notIn: ["COMPLETE", "OPPORTUNITY"] } },
  })

  return NextResponse.json({
    designQueue: {
      count: designQueueCount,
      estimatedHoursTotal: designQueueHours,
      avgCompletedHours: Number(designAvg._avg.actualHours || designAvg._avg.estimatedHours || 8),
      completedCount: designAvg._count,
    },
    productionQueues: productionByStage,
    capacities: capacityMap,
    installationBacklog: installBacklog,
    activeProjects,
  })
}
