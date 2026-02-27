import { prisma } from "@/lib/db"
import { PipelineBoard } from "./pipeline-board"

async function getPipelineData() {
  return prisma.opportunity.findMany({
    orderBy: [{ expectedCloseDate: "asc" }],
    take: 200,
    include: {
      prospect: {
        select: { id: true, companyName: true },
      },
      convertedProject: {
        select: { id: true, projectNumber: true },
      },
      quoteLines: {
        select: {
          id: true,
          description: true,
          quantity: true,
          totalCost: true,
          classification: true,
          width: true,
          height: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      _count: {
        select: { quoteLines: true },
      },
    },
  })
}

export async function CrmPipelineView() {
  const opportunities = await getPipelineData()
  const serialized = JSON.parse(JSON.stringify(opportunities))

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {opportunities.length} opportunities grouped by status — drag to change status
      </p>
      <PipelineBoard initialOpportunities={serialized} />
    </div>
  )
}
