"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useRef } from "react"

const departments = ["ALL", "PLANNING", "DESIGN", "PRODUCTION", "INSTALLATION", "REVIEW", "COMPLETE"]
const productionStages = [
  "ALL", "AWAITING", "CUTTING", "FABRICATION", "FITTING", "SHOTBLASTING",
  "PAINTING", "PACKING", "DISPATCHED", "STORAGE", "REWORK", "SUB_CONTRACT", "COMPLETED",
]

function prettify(val: string) {
  if (val === "ALL") return "All"
  return val.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

export function TrackerFilters({ users }: { users: { id: string; name: string }[] }) {
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
    router.push(`/projects?${params.toString()}`)
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
          placeholder="Search products, projects..."
          className="w-72 pl-9 text-sm"
          defaultValue={searchParams.get("search") || ""}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <select
        className={selectClass}
        value={searchParams.get("department") || "ALL"}
        onChange={(e) => updateFilter("department", e.target.value)}
      >
        {departments.map((d) => (
          <option key={d} value={d}>{prettify(d)}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={searchParams.get("productionStage") || "ALL"}
        onChange={(e) => updateFilter("productionStage", e.target.value)}
      >
        {productionStages.map((s) => (
          <option key={s} value={s}>{prettify(s)}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={searchParams.get("designer") || "ALL"}
        onChange={(e) => updateFilter("designer", e.target.value)}
      >
        <option value="ALL">All Designers</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={searchParams.get("coordinator") || "ALL"}
        onChange={(e) => updateFilter("coordinator", e.target.value)}
      >
        <option value="ALL">All Coordinators</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
    </div>
  )
}
