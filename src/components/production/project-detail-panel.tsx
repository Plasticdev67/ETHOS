"use client"

import { X, ExternalLink } from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"
import { STAGE_DISPLAY_NAMES, getCardScheduleColor } from "@/lib/production-utils"
import type { ProductionProject } from "./production-dashboard"

export function ProjectDetailPanel({
  project,
  onClose,
}: {
  project: ProductionProject | null
  onClose: () => void
}) {
  if (!project) return null

  const completedProducts = project.products.filter(
    (p) => p.productionStatus === "COMPLETED" || p.productionCompletionDate
  ).length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-white shadow-xl z-50 border-l border-gray-200 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {project.projectNumber}
            </h2>
            <p className="text-sm text-gray-600">{project.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            {project.isICUFlag && (
              <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                ICU
              </span>
            )}
            {project.workStream && (() => {
              const wsLabels: Record<string, string> = { UTILITIES: "Utility", BESPOKE: "Bespoke", COMMUNITY: "Community", BLAST: "Blast", REFURBISHMENT: "Refurb" }
              const wsColors: Record<string, string> = { UTILITIES: "bg-blue-100 text-blue-700", BESPOKE: "bg-purple-100 text-purple-700", COMMUNITY: "bg-green-100 text-green-700", BLAST: "bg-orange-100 text-orange-700", REFURBISHMENT: "bg-teal-100 text-teal-700" }
              const label = wsLabels[project.workStream]
              if (!label) return null
              return <span className={`rounded px-2 py-1 text-xs font-medium ${wsColors[project.workStream] || ""}`}>{label}</span>
            })()}
            <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
              {project.priority}
            </span>
          </div>

          {/* Client & People */}
          <Section title="People">
            <Row label="Client" value={project.customer?.name || "—"} />
            <Row label="Production Manager" value={project.projectManager?.name || "—"} />
            <Row label="Coordinator" value={project.coordinator?.name || "—"} />
          </Section>

          {/* Dates */}
          <Section title="Dates">
            {project.orderReceived && (
              <Row label="Order Received" value={formatDate(project.orderReceived)} />
            )}
            {project.targetCompletion && (
              <Row label="Target Completion" value={formatDate(project.targetCompletion)} />
            )}
            {project.actualCompletion && (
              <Row label="Actual Completion" value={formatDate(project.actualCompletion)} />
            )}
          </Section>

          {/* Financials */}
          <Section title="Financials">
            <Row
              label="Contract Value"
              value={project.contractValue ? formatCurrency(Number(project.contractValue)) : "—"}
            />
            <Row
              label="NCR Cost"
              value={project.ncrCost ? formatCurrency(Number(project.ncrCost)) : "£0"}
            />
            <Row label="NCR Count" value={String(project._count.ncrs)} />
          </Section>

          {/* Products */}
          <Section title={`Products (${completedProducts}/${project._count.products} complete)`}>
            <div className="space-y-2">
              {project.products.map((product) => (
                <div
                  key={product.id}
                  className={`rounded-md border p-2.5 border-l-4 ${getCardScheduleColor(product.productionTargetDate)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-800">
                      {product.partCode}
                    </span>
                    <span className="text-[10px] rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                      {product.productionStatus
                        ? STAGE_DISPLAY_NAMES[product.productionStatus] || product.productionStatus
                        : "Awaiting"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {product.description}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Qty: {product.quantity}
                    {product.productionTargetDate &&
                      ` | Due: ${formatDate(product.productionTargetDate)}`}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Actions */}
          <div className="flex gap-2">
            <Link
              href={`/projects/${project.id}`}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Full Project
            </Link>
            <Link
              href="/production/workshop"
              className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200"
            >
              Workshop View
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  )
}
