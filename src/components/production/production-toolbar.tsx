"use client"

import { Search } from "lucide-react"
import { WORK_STREAMS, WORK_STREAM_LABELS } from "@/lib/production-utils"

type Filters = {
  workStream: string
  status: string
  pm: string
  client: string
  search: string
  timeHorizon: string
}

export function ProductionToolbar({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  pmOptions,
  clientOptions,
  projectCount,
}: {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  viewMode: "compact" | "full"
  onViewModeChange: (mode: "compact" | "full") => void
  pmOptions: string[]
  clientOptions: string[]
  projectCount: number
}) {
  const update = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search projects..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          className="h-9 w-48 rounded-md border border-gray-200 bg-white pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Work Stream */}
      <select
        value={filters.workStream}
        onChange={(e) => update("workStream", e.target.value)}
        className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="ALL">All Work Streams</option>
        <option value="ICU">ICU</option>
        {WORK_STREAMS.map((ws) => (
          <option key={ws} value={ws}>{WORK_STREAM_LABELS[ws]}</option>
        ))}
      </select>

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) => update("status", e.target.value)}
        className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="ALL">All Status</option>
        <option value="ON_TRACK">On Track</option>
        <option value="AT_RISK">At Risk</option>
        <option value="OVERDUE">Overdue</option>
      </select>

      {/* PM */}
      <select
        value={filters.pm}
        onChange={(e) => update("pm", e.target.value)}
        className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="ALL">All PMs</option>
        {pmOptions.map((pm) => (
          <option key={pm} value={pm}>
            {pm}
          </option>
        ))}
      </select>

      {/* Client */}
      <select
        value={filters.client}
        onChange={(e) => update("client", e.target.value)}
        className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="ALL">All Clients</option>
        {clientOptions.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* Time Horizon */}
      <select
        value={filters.timeHorizon}
        onChange={(e) => update("timeHorizon", e.target.value)}
        className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="ALL">All Active</option>
        <option value="THIS_WEEK">This Week</option>
        <option value="THIS_MONTH">This Month</option>
      </select>

      <div className="flex-1" />

      {/* View Toggle */}
      <div className="flex rounded-md border border-gray-200 bg-white">
        <button
          onClick={() => onViewModeChange("full")}
          className={`px-3 py-1.5 text-xs font-medium rounded-l-md transition-colors ${
            viewMode === "full"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Full
        </button>
        <button
          onClick={() => onViewModeChange("compact")}
          className={`px-3 py-1.5 text-xs font-medium rounded-r-md transition-colors ${
            viewMode === "compact"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Compact
        </button>
      </div>

      <span className="text-xs text-gray-500">
        {projectCount} project{projectCount !== 1 ? "s" : ""}
      </span>
    </div>
  )
}
