"use client"

import { memo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate, getOpportunityStatusColor, getLeadSourceColor, prettifyEnum, cn } from "@/lib/utils"

const cardStatusColor: Record<string, string> = {
  ACTIVE_LEAD: "border-l-blue-400 bg-blue-50/30",
  PENDING_APPROVAL: "border-l-orange-400 bg-orange-50/30",
  QUOTED: "border-l-amber-400 bg-amber-50/30",
  WON: "border-l-green-400 bg-green-50/30",
  LOST: "border-l-red-400 bg-red-50/30",
}

type OpportunityCardProps = {
  opportunity: {
    id: string
    name: string
    description: string | null
    estimatedValue: string | number | null
    contactPerson: string | null
    leadSource: string
    status: string
    expectedCloseDate: string | null
    convertedProjectId?: string | null
  }
  onClick?: () => void
}

export const OpportunityCard = memo(function OpportunityCard({ opportunity, onClick }: OpportunityCardProps) {
  const [handing, setHanding] = useState(false)
  const [handed, setHanded] = useState(false)

  const isWonWithProject = opportunity.status === "WON" && !!opportunity.convertedProjectId

  async function handleHandover(e: React.MouseEvent) {
    e.stopPropagation()
    if (!opportunity.convertedProjectId) return
    setHanding(true)
    try {
      const res = await fetch(`/api/projects/${opportunity.convertedProjectId}/activate-design`, {
        method: "POST",
      })
      if (res.ok) {
        setHanded(true)
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Failed to hand over to designers")
      }
    } catch {
      alert("Failed to hand over to designers")
    } finally {
      setHanding(false)
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border border-border border-l-4 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer space-y-2",
        cardStatusColor[opportunity.status] || "border-l-gray-300 bg-white"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary" className={getOpportunityStatusColor(opportunity.status) + " text-[10px] px-1.5 py-0"}>
          {prettifyEnum(opportunity.status)}
        </Badge>
        <Badge variant="secondary" className={getLeadSourceColor(opportunity.leadSource) + " text-[10px] px-1.5 py-0"}>
          {prettifyEnum(opportunity.leadSource)}
        </Badge>
      </div>

      <div className="text-sm font-medium text-gray-800 leading-tight line-clamp-2">
        {opportunity.name}
      </div>

      {opportunity.contactPerson && (
        <div className="text-xs text-gray-500 truncate">{opportunity.contactPerson}</div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <span className="font-mono text-xs font-semibold text-gray-700">
          {opportunity.estimatedValue ? formatCurrency(Number(opportunity.estimatedValue)) : "—"}
        </span>
        {opportunity.expectedCloseDate && (
          <span className="text-[10px] text-gray-400">
            {formatDate(opportunity.expectedCloseDate)}
          </span>
        )}
      </div>

      {isWonWithProject && (
        <div className="pt-1">
          {handed ? (
            <div className="flex items-center gap-1.5 rounded-md bg-green-50 border border-green-200 px-2 py-1.5">
              <svg className="w-3.5 h-3.5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-[10px] font-medium text-green-700">Handed to designers</span>
            </div>
          ) : (
            <button
              onClick={handleHandover}
              disabled={handing}
              className="w-full flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {handing ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              {handing ? "Handing over..." : "Hand over to designers"}
            </button>
          )}
        </div>
      )}
    </div>
  )
})
