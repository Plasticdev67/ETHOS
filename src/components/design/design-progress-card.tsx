"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  JOB_TYPE_LABELS,
  JOB_TYPE_ORDER,
  getDesignCardStatusColor,
  getDesignCardStatusLabel,
} from "@/lib/design-utils"

type DesignCard = {
  id: string
  status: string
  product: {
    id: string
    description: string
    partCode: string
    productJobNumber: string | null
  }
  assignedDesigner: { id: string; name: string } | null
  jobCards: {
    id: string
    jobType: string
    status: string
  }[]
}

type ProjectGroup = {
  project: {
    id: string
    projectNumber: string
    name: string
    targetCompletion: string | null
    customer: { name: string } | null
  }
  cards: DesignCard[]
  progress?: { totalJobCards: number; completedJobCards: number; percentage: number }
}

export function DesignProgressCard({ group }: { group: ProjectGroup }) {
  const { project, cards, progress } = group

  return (
    <div className="border border-border rounded-lg bg-white p-4 space-y-3">
      {/* Project Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/projects/${project.id}`} className="text-sm font-semibold text-blue-600 hover:underline">
            {project.projectNumber}
          </Link>
          <p className="text-sm text-gray-700 mt-0.5">{project.name}</p>
          {project.customer && (
            <p className="text-xs text-gray-500">{project.customer.name}</p>
          )}
        </div>
        {progress && (
          <div className="text-right">
            <span className="text-lg font-bold text-gray-800">{progress.percentage}%</span>
            <p className="text-[10px] text-gray-500">
              {progress.completedJobCards}/{progress.totalJobCards} tasks
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {progress && (
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      )}

      {/* Per-product progress */}
      <div className="space-y-2">
        {cards.map((card) => (
          <div key={card.id} className="border border-gray-100 rounded-md p-2.5 bg-gray-50/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-800 truncate max-w-[60%]">
                {card.product.description}
              </span>
              <Badge className={`text-[10px] ${getDesignCardStatusColor(card.status)}`}>
                {getDesignCardStatusLabel(card.status)}
              </Badge>
            </div>
            {card.assignedDesigner && (
              <p className="text-[10px] text-gray-500 mb-1.5">{card.assignedDesigner.name}</p>
            )}
            {/* 4-step progress indicator */}
            <div className="flex gap-1">
              {JOB_TYPE_ORDER.map((jobType) => {
                const jobCard = card.jobCards.find((j) => j.jobType === jobType)
                const status = jobCard?.status || "BLOCKED"
                return (
                  <div key={jobType} className="flex-1" title={`${JOB_TYPE_LABELS[jobType]}: ${status}`}>
                    <div
                      className={`h-1.5 rounded-full ${getStepColor(status)}`}
                    />
                    <p className="text-[9px] text-gray-500 mt-0.5 text-center truncate">
                      {JOB_TYPE_LABELS[jobType]?.split(" ")[0]}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getStepColor(status: string): string {
  switch (status) {
    case "SIGNED_OFF": return "bg-green-500"
    case "APPROVED": return "bg-emerald-400"
    case "SUBMITTED": return "bg-amber-400"
    case "IN_PROGRESS": return "bg-blue-400"
    case "READY": return "bg-slate-300"
    case "REJECTED": return "bg-red-400"
    default: return "bg-gray-200"
  }
}
