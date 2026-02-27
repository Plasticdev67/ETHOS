"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useRef } from "react"

const statuses = [
  { value: "ALL", label: "All Statuses" },
  { value: "ACTIVE_LEAD", label: "Active Lead" },
  { value: "QUOTED", label: "Quoted" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
]

const sources = [
  { value: "ALL", label: "All Sources" },
  { value: "REFERRAL", label: "Referral" },
  { value: "WEBSITE", label: "Website" },
  { value: "TRADE_SHOW", label: "Trade Show" },
  { value: "COLD_CALL", label: "Cold Call" },
  { value: "REPEAT_BUSINESS", label: "Repeat Business" },
  { value: "TENDER_PORTAL", label: "Tender Portal" },
  { value: "OTHER", label: "Other" },
]

export function CrmTableFilters() {
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
    router.push(`/crm${qs ? `?${qs}` : ""}`)
  }

  function handleSearchChange(value: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => updateFilter("search", value), 300)
  }

  const selectClass =
    "rounded-lg border border-border bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search opportunities..."
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
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={searchParams.get("source") || "ALL"}
        onChange={(e) => updateFilter("source", e.target.value)}
      >
        {sources.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  )
}
