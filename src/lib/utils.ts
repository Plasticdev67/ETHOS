import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "£0.00"
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  if (isNaN(num)) return "£0.00"
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function getDepartmentColor(department: string): string {
  const colors: Record<string, string> = {
    PLANNING: "bg-purple-100 text-purple-800",
    DESIGN: "bg-blue-100 text-blue-800",
    PRODUCTION: "bg-amber-100 text-amber-800",
    INSTALLATION: "bg-emerald-100 text-emerald-800",
    REVIEW: "bg-cyan-100 text-cyan-800",
    COMPLETE: "bg-green-100 text-green-800",
  }
  return colors[department] || "bg-gray-100 text-gray-800"
}

export function getProductionStageColor(stage: string): string {
  const colors: Record<string, string> = {
    AWAITING: "bg-gray-100 text-gray-700",
    CUTTING: "bg-orange-100 text-orange-800",
    FABRICATION: "bg-amber-100 text-amber-800",
    FITTING: "bg-yellow-100 text-yellow-800",
    SHOTBLASTING: "bg-lime-100 text-lime-800",
    PAINTING: "bg-teal-100 text-teal-800",
    PACKING: "bg-cyan-100 text-cyan-800",
    DISPATCHED: "bg-blue-100 text-blue-800",
    STORAGE: "bg-indigo-100 text-indigo-800",
    REWORK: "bg-red-100 text-red-800",
    SUB_CONTRACT: "bg-violet-100 text-violet-800",
    COMPLETED: "bg-green-100 text-green-800",
    N_A: "bg-gray-50 text-gray-500",
  }
  return colors[stage] || "bg-gray-100 text-gray-800"
}

export function getSalesStageColor(stage: string): string {
  const colors: Record<string, string> = {
    OPPORTUNITY: "bg-blue-100 text-blue-800",
    QUOTED: "bg-amber-100 text-amber-800",
    ORDER: "bg-green-100 text-green-800",
  }
  return colors[stage] || "bg-gray-100 text-gray-800"
}

export function getProjectStatusColor(status: string): string {
  const colors: Record<string, string> = {
    OPPORTUNITY: "bg-blue-100 text-blue-800",
    QUOTATION: "bg-amber-100 text-amber-800",
    DESIGN: "bg-indigo-100 text-indigo-800",
    MANUFACTURE: "bg-orange-100 text-orange-800",
    INSTALLATION: "bg-emerald-100 text-emerald-800",
    REVIEW: "bg-cyan-100 text-cyan-800",
    COMPLETE: "bg-green-100 text-green-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

export function getRagColor(status: "GREEN" | "AMBER" | "RED" | null): string {
  if (status === "GREEN") return "bg-emerald-500"
  if (status === "AMBER") return "bg-amber-500"
  if (status === "RED") return "bg-red-500"
  return "bg-gray-300"
}

export function getRagTextColor(status: "GREEN" | "AMBER" | "RED" | null): string {
  if (status === "GREEN") return "text-emerald-600"
  if (status === "AMBER") return "text-amber-600"
  if (status === "RED") return "text-red-600"
  return "text-gray-400"
}

export function calculateScheduleRag(targetDate: Date | string | null): "GREEN" | "AMBER" | "RED" | null {
  if (!targetDate) return null
  const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate
  const now = new Date()
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return "RED"
  if (diffDays <= 7) return "AMBER"
  return "GREEN"
}

export function prettifyEnum(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace("N A", "N/A")
    .replace("Exc3", "EXC3")
}

export function getOpportunityStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DEAD_LEAD: "bg-gray-100 text-gray-600",
    ACTIVE_LEAD: "bg-blue-100 text-blue-800",
    PENDING_APPROVAL: "bg-orange-100 text-orange-800",
    QUOTED: "bg-amber-100 text-amber-800",
    WON: "bg-green-100 text-green-800",
    LOST: "bg-red-100 text-red-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

export function getLeadSourceColor(source: string): string {
  const colors: Record<string, string> = {
    REFERRAL: "bg-purple-100 text-purple-800",
    WEBSITE: "bg-blue-100 text-blue-800",
    TRADE_SHOW: "bg-green-100 text-green-800",
    COLD_CALL: "bg-orange-100 text-orange-800",
    REPEAT_BUSINESS: "bg-teal-100 text-teal-800",
    TENDER_PORTAL: "bg-indigo-100 text-indigo-800",
    OTHER: "bg-gray-100 text-gray-700",
  }
  return colors[source] || "bg-gray-100 text-gray-800"
}

export function getProspectStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    INACTIVE: "bg-gray-100 text-gray-700",
    CONVERTED: "bg-blue-100 text-blue-800",
    DISQUALIFIED: "bg-red-100 text-red-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

export function generateProjectNumber(): string {
  // Generate 6-digit number: based on timestamp to ensure uniqueness
  const base = 200000
  const offset = Math.floor(Date.now() / 1000) % 100000
  return String(base + offset)
}
