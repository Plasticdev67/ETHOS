import { prisma } from "@/lib/db"

/**
 * Recalculates the total NCR cost for a project by summing all active (non-archived) NCR costImpact values.
 */
export async function recalcProjectNcrCost(projectId: string) {
  const ncrs = await prisma.nonConformanceReport.findMany({
    where: { projectId, isArchived: false },
    select: { costImpact: true },
  })
  const totalNcrCost = ncrs.reduce(
    (sum, n) => sum + Number(n.costImpact || 0),
    0
  )
  await prisma.project.update({
    where: { id: projectId },
    data: { ncrCost: totalNcrCost },
  })
}
