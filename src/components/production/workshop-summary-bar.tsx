"use client"

import type { WorkshopStats } from "./workshop-view"

export function WorkshopSummaryBar({
  stageName,
  stats,
}: {
  stageName: string
  stats: WorkshopStats
}) {
  return (
    <div className="rounded-lg bg-gray-900 text-white px-5 py-3">
      <h2 className="text-base font-bold mb-2">{stageName} Workshop</h2>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <Stat label="Projects" value={stats.totalProjects} />
        <Stat label="Products in Queue" value={stats.pendingCount} />
        <Stat label="Active" value={stats.activeCount} highlight="blue" />
        <Stat label="Completed Today" value={stats.completedTodayCount} highlight="green" />
        <Stat label="Awaiting Handover" value={stats.awaitingHandoverCount} />
        <Stat
          label="Avg. Processing"
          value={stats.avgProcessingMins > 0 ? formatMins(stats.avgProcessingMins) : "—"}
        />
        {stats.oldestInQueueDays > 0 && (
          <Stat
            label="Oldest in Queue"
            value={`${stats.oldestInQueueDays}d`}
            highlight={stats.oldestInQueueDays > 3 ? "red" : undefined}
          />
        )}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string | number
  highlight?: "blue" | "green" | "red"
}) {
  const valueColor =
    highlight === "blue"
      ? "text-blue-400"
      : highlight === "green"
        ? "text-green-400"
        : highlight === "red"
          ? "text-red-400"
          : "text-white"

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-400">{label}:</span>
      <span className={`font-semibold ${valueColor}`}>{value}</span>
    </div>
  )
}

function formatMins(mins: number): string {
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remaining = mins % 60
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
}
