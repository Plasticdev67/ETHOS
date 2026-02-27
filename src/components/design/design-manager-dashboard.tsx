"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { usePermissions } from "@/hooks/use-permissions"
import { AssignDesignerDialog } from "./assign-designer-dialog"
import { DesignProgressCard } from "./design-progress-card"
import { OverdueAlerts } from "./overdue-alerts"
import {
  getDesignCardStatusColor,
  getDesignCardStatusLabel,
  JOB_TYPE_LABELS,
} from "@/lib/design-utils"

type DesignCard = {
  id: string
  productId: string
  projectId: string
  assignedDesignerId: string | null
  status: string
  targetStartDate: string | null
  targetEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  estimatedHours: number | null
  actualHours: number | null
  product: {
    id: string
    description: string
    partCode: string
    quantity: number
    productJobNumber: string | null
  }
  project: {
    id: string
    projectNumber: string
    name: string
    targetCompletion: string | null
    customer: { name: string } | null
  }
  assignedDesigner: { id: string; name: string } | null
  jobCards: {
    id: string
    jobType: string
    status: string
  }[]
}

type ProjectGroup = {
  project: DesignCard["project"]
  cards: DesignCard[]
  progress?: { totalJobCards: number; completedJobCards: number; percentage: number }
}

type WorkloadEntry = {
  designerId: string
  designerName: string
  activeCards: number
  estimatedHours: number
  actualHours: number
}

type OverdueCard = DesignCard & { daysOverdue: number }

type HandoverProject = {
  id: string
  projectNumber: string
  name: string
  targetCompletion: string | null
  customer: { name: string } | null
  designCards: DesignCard[]
}

type Props = {
  queueGroups: ProjectGroup[]
  liveGroups: ProjectGroup[]
  workload: WorkloadEntry[]
  overdue: OverdueCard[]
  readyForHandover: HandoverProject[]
  designers: { id: string; name: string }[]
}

export function DesignManagerDashboard({
  queueGroups,
  liveGroups,
  workload,
  overdue,
  readyForHandover,
  designers,
}: Props) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedCards, setSelectedCards] = useState<string[]>([])
  const { can } = usePermissions()
  const canAssign = can("design:assign")

  const totalQueued = queueGroups.reduce((sum, g) => sum + g.cards.length, 0)
  const totalLive = liveGroups.reduce((sum, g) => sum + g.cards.length, 0)

  function handleAssignClick(cardIds: string[]) {
    setSelectedCards(cardIds)
    setAssignDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Queued" value={totalQueued} color="bg-gray-100 text-gray-700" />
        <SummaryCard label="In Progress" value={totalLive} color="bg-blue-100 text-blue-700" />
        <SummaryCard label="Designers Active" value={workload.length} color="bg-indigo-100 text-indigo-700" />
        <SummaryCard label="Overdue" value={overdue.length} color="bg-red-100 text-red-700" />
        <SummaryCard label="Ready for Handover" value={readyForHandover.length} color="bg-green-100 text-green-700" />
      </div>

      {/* Overdue Alerts */}
      {overdue.length > 0 && <OverdueAlerts cards={overdue} />}

      {/* Design Queue (Backlog) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Design Queue</h2>
          <span className="text-xs text-gray-500">{totalQueued} unassigned product(s)</span>
        </div>
        {queueGroups.length === 0 ? (
          <p className="text-sm text-gray-400">No products in queue</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium text-gray-600">Project</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Product</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Job No.</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Target End</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Status</th>
                  <th className="px-3 py-2 font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {queueGroups.flatMap((group) =>
                  group.cards.map((card) => (
                    <tr key={card.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2">
                        <Link href={`/projects/${card.project.id}`} className="text-blue-600 hover:underline">
                          {card.project.projectNumber}
                        </Link>
                        <span className="text-gray-500 ml-1.5">{card.project.name}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{card.product.description}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono text-xs">{card.product.productJobNumber || "—"}</td>
                      <td className="px-3 py-2 text-gray-500">
                        {card.targetEndDate ? new Date(card.targetEndDate).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={getDesignCardStatusColor(card.status)}>
                          {getDesignCardStatusLabel(card.status)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {canAssign && (
                          <button
                            onClick={() => handleAssignClick([card.id])}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Assign
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Live Projects */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Live Projects</h2>
          <span className="text-xs text-gray-500">{liveGroups.length} project(s)</span>
        </div>
        {liveGroups.length === 0 ? (
          <p className="text-sm text-gray-400">No active design work</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {liveGroups.map((group) => (
              <DesignProgressCard key={group.project.id} group={group} />
            ))}
          </div>
        )}
      </section>

      {/* Designer Workload */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Designer Workload</h2>
        {workload.length === 0 ? (
          <p className="text-sm text-gray-400">No designers currently assigned</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium text-gray-600">Designer</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-center">Active Cards</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-right">Est. Hours</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-right">Actual Hours</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-right">Utilisation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {workload.map((w) => (
                  <tr key={w.designerId} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 font-medium text-gray-800">{w.designerName}</td>
                    <td className="px-3 py-2 text-center">{w.activeCards}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{w.estimatedHours || "—"}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{w.actualHours || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {w.estimatedHours > 0 ? (
                        <span className={w.actualHours > w.estimatedHours ? "text-red-600 font-medium" : "text-gray-600"}>
                          {Math.round((w.actualHours / w.estimatedHours) * 100)}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Ready for Handover */}
      {readyForHandover.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Ready for Handover</h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium text-gray-600">Project</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Customer</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-center">Products</th>
                  <th className="px-3 py-2 font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {readyForHandover.map((proj) => (
                  <tr key={proj.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2">
                      <Link href={`/projects/${proj.id}`} className="text-blue-600 hover:underline font-medium">
                        {proj.projectNumber}
                      </Link>
                      <span className="text-gray-500 ml-1.5">{proj.name}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{proj.customer?.name || "—"}</td>
                    <td className="px-3 py-2 text-center">{proj.designCards.length}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/design/handover/${proj.id}`}
                        className="text-xs text-green-600 hover:underline font-medium"
                      >
                        Initiate Handover
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Assign Designer Dialog */}
      <AssignDesignerDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        designCardIds={selectedCards}
        designers={designers}
      />
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg px-4 py-3 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  )
}
