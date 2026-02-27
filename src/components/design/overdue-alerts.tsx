"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"

type OverdueCard = {
  id: string
  status: string
  targetEndDate: string | null
  daysOverdue: number
  product: {
    id: string
    description: string
    partCode: string
    productJobNumber: string | null
  }
  project: {
    id: string
    projectNumber: string
    name: string
  }
  assignedDesigner: { id: string; name: string } | null
}

export function OverdueAlerts({ cards }: { cards: OverdueCard[] }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <h2 className="text-lg font-semibold text-red-700">Overdue Tasks</h2>
        <span className="text-xs text-red-500 font-medium">{cards.length} overdue</span>
      </div>

      <div className="border border-red-200 rounded-lg overflow-hidden bg-red-50/30">
        <table className="w-full text-sm">
          <thead className="bg-red-50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium text-red-700">Project</th>
              <th className="px-3 py-2 font-medium text-red-700">Product</th>
              <th className="px-3 py-2 font-medium text-red-700">Designer</th>
              <th className="px-3 py-2 font-medium text-red-700 text-right">Days Overdue</th>
              <th className="px-3 py-2 font-medium text-red-700">Target Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-red-100">
            {cards.map((card) => (
              <tr key={card.id} className="hover:bg-red-50/50">
                <td className="px-3 py-2">
                  <Link href={`/projects/${card.project.id}`} className="text-blue-600 hover:underline">
                    {card.project.projectNumber}
                  </Link>
                  <span className="text-gray-500 ml-1.5">{card.project.name}</span>
                </td>
                <td className="px-3 py-2 text-gray-700">{card.product.description}</td>
                <td className="px-3 py-2 text-gray-600">{card.assignedDesigner?.name || "Unassigned"}</td>
                <td className="px-3 py-2 text-right">
                  <span className="font-bold text-red-600">{card.daysOverdue}d</span>
                </td>
                <td className="px-3 py-2 text-gray-500">
                  {card.targetEndDate ? new Date(card.targetEndDate).toLocaleDateString("en-GB") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
