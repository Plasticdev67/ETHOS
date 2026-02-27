"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { TaskActionButtons } from "./task-action-buttons"
import {
  JOB_TYPE_ORDER,
  JOB_TYPE_LABELS,
  getDesignCardStatusColor,
  getDesignCardStatusLabel,
  getDesignJobStatusColor,
  getDesignJobStatusLabel,
} from "@/lib/design-utils"

type JobCard = {
  id: string
  designCardId: string
  jobType: string
  status: string
  sortOrder: number
  assignedToId: string | null
  reviewerId: string | null
  startedAt: string | null
  submittedAt: string | null
  approvedAt: string | null
  signedOffAt: string | null
  rejectedAt: string | null
  reviewNotes: string | null
  rejectionReason: string | null
  estimatedHours: number | null
  actualHours: number | null
  notes: string | null
}

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
  jobCards: JobCard[]
}

type ProjectGroup = {
  project: {
    id: string
    projectNumber: string
    name: string
    customer: { name: string } | null
  }
  designCards: DesignCard[]
}

const ACTIONABLE_STATUSES = ["IN_PROGRESS", "SUBMITTED", "REJECTED", "READY"]

export function DesignerWorkDashboard({ projects }: { projects: ProjectGroup[] }) {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>(() => {
    // All projects expanded by default
    const initial: Record<string, boolean> = {}
    for (const group of projects) {
      initial[group.project.id] = true
    }
    return initial
  })

  // Build flat list of actionable tasks across all projects
  const activeTasks: Array<{
    jobCard: JobCard
    designCard: DesignCard
    project: ProjectGroup["project"]
  }> = []

  for (const group of projects) {
    for (const card of group.designCards) {
      for (const jobCard of card.jobCards) {
        if (ACTIONABLE_STATUSES.includes(jobCard.status)) {
          activeTasks.push({
            jobCard,
            designCard: card,
            project: group.project,
          })
        }
      }
    }
  }

  function toggleProject(projectId: string) {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }))
  }

  return (
    <div className="space-y-6">
      {/* Active Tasks */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Active Tasks</h2>
          <span className="text-xs text-gray-500">
            {activeTasks.length} task{activeTasks.length !== 1 ? "s" : ""} needing action
          </span>
        </div>

        {activeTasks.length === 0 ? (
          <div className="border border-border rounded-lg bg-white p-6 text-center">
            <p className="text-sm text-gray-400">No tasks currently need your action</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium text-gray-600">Product</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Job No.</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Job Type</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Status</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeTasks.map(({ jobCard, designCard }) => (
                  <tr key={jobCard.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2">
                      <span className="text-gray-800">{designCard.product.description}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 font-mono text-xs">
                      {designCard.product.productJobNumber || "\u2014"}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/design/jobs/${jobCard.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {JOB_TYPE_LABELS[jobCard.jobType] || jobCard.jobType}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={getDesignJobStatusColor(jobCard.status)}>
                        {getDesignJobStatusLabel(jobCard.status)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <TaskActionButtons
                        jobCard={{
                          id: jobCard.id,
                          status: jobCard.status,
                          rejectionReason: jobCard.rejectionReason,
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* My Projects */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">My Projects</h2>

        {projects.length === 0 ? (
          <div className="border border-border rounded-lg bg-white p-6 text-center">
            <p className="text-sm text-gray-400">No assigned projects</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((group) => {
              const isExpanded = expandedProjects[group.project.id] ?? true

              return (
                <div
                  key={group.project.id}
                  className="border border-border rounded-lg bg-white overflow-hidden"
                >
                  {/* Project Header — clickable accordion toggle */}
                  <button
                    onClick={() => toggleProject(group.project.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      <div>
                        <Link
                          href={`/projects/${group.project.id}`}
                          className="text-sm font-semibold text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {group.project.projectNumber}
                        </Link>
                        <span className="text-sm text-gray-700 ml-2">{group.project.name}</span>
                        {group.project.customer && (
                          <span className="text-xs text-gray-500 ml-2">
                            {group.project.customer.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {group.designCards.length} product{group.designCards.length !== 1 ? "s" : ""}
                    </span>
                  </button>

                  {/* Expanded content — per-product progress */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2">
                      {group.designCards.map((card) => (
                        <div
                          key={card.id}
                          className="border border-gray-100 rounded-md p-2.5 bg-gray-50/50"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-gray-800 truncate max-w-[60%]">
                              {card.product.description}
                            </span>
                            <Badge
                              className={`text-[10px] ${getDesignCardStatusColor(card.status)}`}
                            >
                              {getDesignCardStatusLabel(card.status)}
                            </Badge>
                          </div>
                          {card.product.productJobNumber && (
                            <p className="text-[10px] text-gray-500 font-mono mb-1.5">
                              {card.product.productJobNumber}
                            </p>
                          )}
                          {/* 4-step progress indicator */}
                          <div className="flex gap-1">
                            {JOB_TYPE_ORDER.map((jobType) => {
                              const jobCard = card.jobCards.find((j) => j.jobType === jobType)
                              const status = jobCard?.status || "BLOCKED"
                              return (
                                <div
                                  key={jobType}
                                  className="flex-1"
                                  title={`${JOB_TYPE_LABELS[jobType]}: ${getDesignJobStatusLabel(status)}`}
                                >
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
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

/** Maps job card status to a bar color for the 4-step progress indicator. */
function getStepColor(status: string): string {
  switch (status) {
    case "SIGNED_OFF":
      return "bg-green-500"
    case "APPROVED":
      return "bg-emerald-400"
    case "SUBMITTED":
      return "bg-amber-400"
    case "IN_PROGRESS":
      return "bg-blue-400"
    case "READY":
      return "bg-slate-300"
    case "REJECTED":
      return "bg-red-400"
    default:
      return "bg-gray-200"
  }
}
