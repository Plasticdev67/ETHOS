"use client"

import { Factory, AlertTriangle, Siren, FileWarning } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type Stats = {
  totalProjects: number
  totalProducts: number
  totalValue: number
  overdue: number
  icuCount: number
  ncrCount: number
}

export function ProductionStatsBar({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        icon={<Factory className="h-4 w-4 text-blue-600" />}
        label="Projects"
        value={stats.totalProjects}
        sub={`${stats.totalProducts} products`}
      />
      <StatCard
        icon={<span className="text-sm font-semibold text-green-600">£</span>}
        label="Total Value"
        value={formatCurrency(stats.totalValue)}
      />
      <StatCard
        icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
        label="Overdue"
        value={stats.overdue}
        variant={stats.overdue > 0 ? "danger" : "default"}
      />
      <StatCard
        icon={<Siren className="h-4 w-4 text-red-600" />}
        label="ICU"
        value={stats.icuCount}
        variant={stats.icuCount > 0 ? "warning" : "default"}
      />
      <StatCard
        icon={<FileWarning className="h-4 w-4 text-purple-500" />}
        label="Active NCRs"
        value={stats.ncrCount}
        variant={stats.ncrCount > 0 ? "warning" : "default"}
      />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  variant = "default",
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  variant?: "default" | "danger" | "warning"
}) {
  const bgClass =
    variant === "danger"
      ? "bg-red-50 border-red-200"
      : variant === "warning"
        ? "bg-amber-50 border-amber-200"
        : "bg-white border-gray-200"

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${bgClass}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  )
}
