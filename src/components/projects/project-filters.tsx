"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useRef } from "react"

const statuses = ["ALL", "OPPORTUNITY", "QUOTATION", "DESIGN", "MANUFACTURE", "INSTALLATION", "REVIEW", "COMPLETE"]
const salesStages = ["ALL", "OPPORTUNITY", "QUOTED", "ORDER"]
const workStreams = ["ALL", "COMMUNITY", "UTILITIES", "BESPOKE", "BLAST", "BUND_CONTAINMENT", "REFURBISHMENT"]
const priorities = ["ALL", "NORMAL", "HIGH", "CRITICAL"]
const classifications = ["ALL", "NORMAL", "MEGA", "SUB_CONTRACT"]

function prettify(val: string) {
  if (val === "ALL") return "All"
  return val.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

export function ProjectFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "ALL" || !value) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    const qs = params.toString()
    router.push(`/projects${qs ? `?${qs}` : ""}`)
  }

  function handleSearchChange(value: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => updateFilter("search", value), 300)
  }

  const selectClass = "rounded-lg border border-border bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search projects..."
          className="w-64 pl-9 text-sm"
          defaultValue={searchParams.get("search") || ""}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <select
        className={selectClass}
        value={searchParams.get("status") || "ALL"}
        onChange={(e) => updateFilter("status", e.target.value)}
      >
        {statuses.map((s) => (
          <option key={s} value={s}>{prettify(s)}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={searchParams.get("salesStage") || "ALL"}
        onChange={(e) => updateFilter("salesStage", e.target.value)}
      >
        {salesStages.map((s) => (
          <option key={s} value={s}>{prettify(s)}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={searchParams.get("workStream") || "ALL"}
        onChange={(e) => updateFilter("workStream", e.target.value)}
      >
        {workStreams.map((s) => (
          <option key={s} value={s}>{prettify(s)}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={searchParams.get("priority") || "ALL"}
        onChange={(e) => updateFilter("priority", e.target.value)}
      >
        <option value="ALL">All Priorities</option>
        {priorities.filter(p => p !== "ALL").map((s) => (
          <option key={s} value={s}>{prettify(s)}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={searchParams.get("classification") || "ALL"}
        onChange={(e) => updateFilter("classification", e.target.value)}
      >
        <option value="ALL">All Types</option>
        {classifications.filter(c => c !== "ALL").map((s) => (
          <option key={s} value={s}>{prettify(s)}</option>
        ))}
      </select>
    </div>
  )
}
