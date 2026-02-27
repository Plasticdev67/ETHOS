import { prisma } from "@/lib/db"
import { CrmBoard } from "@/components/crm/crm-board"
import { formatCurrency } from "@/lib/utils"

async function getCrmBoardData() {
  const prospects = await prisma.prospect.findMany({
    where: {
      status: { in: ["ACTIVE", "CONVERTED"] },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      companyName: true,
      contactName: true,
      sector: true,
      source: true,
      status: true,
      _count: { select: { opportunities: true } },
    },
  })

  const opportunities = await prisma.opportunity.findMany({
    where: {
      prospect: {
        status: { in: ["ACTIVE", "CONVERTED"] },
      },
    },
    orderBy: [{ prospectId: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      prospectId: true,
      name: true,
      description: true,
      estimatedValue: true,
      contactPerson: true,
      leadSource: true,
      status: true,
      expectedCloseDate: true,
      notes: true,
      sortOrder: true,
      convertedProjectId: true,
    },
  })

  return { prospects, opportunities }
}

export async function CrmBoardView() {
  const { prospects, opportunities } = await getCrmBoardData()
  const serializedOpps = JSON.parse(JSON.stringify(opportunities))

  const totalOppValue = opportunities.reduce((sum, opp) => {
    return sum + (opp.estimatedValue ? parseFloat(opp.estimatedValue.toString()) : 0)
  }, 0)

  const activeLeadCount = opportunities.filter((o) => o.status === "ACTIVE_LEAD").length
  const quotedCount = opportunities.filter((o) => o.status === "QUOTED").length
  const wonCount = opportunities.filter((o) => o.status === "WON").length

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3">
        <div className="rounded-lg border border-border bg-white px-4 py-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Active Leads</div>
          <div className="text-xl font-semibold text-blue-600">{activeLeadCount}</div>
        </div>
        <div className="rounded-lg border border-border bg-white px-4 py-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Quoted</div>
          <div className="text-xl font-semibold text-amber-600">{quotedCount}</div>
        </div>
        <div className="rounded-lg border border-border bg-white px-4 py-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Won</div>
          <div className="text-xl font-semibold text-green-600">{wonCount}</div>
        </div>
        <div className="rounded-lg border border-border bg-white px-4 py-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Pipeline Value</div>
          <div className="text-xl font-semibold text-gray-900">{formatCurrency(totalOppValue)}</div>
        </div>
      </div>

      <CrmBoard initialProspects={prospects} initialOpportunities={serializedOpps} />
    </div>
  )
}
