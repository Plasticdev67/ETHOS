"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type JobCard = {
  id: string
  jobType: string
  status: string
}

type WaitEvent = {
  id: string
  reason: string
  externalParty: string | null
  triggeredAt: string
  resolvedAt: string | null
}

type FeedProduct = {
  designCardId: string
  designCardStatus: string
  designCardUpdatedAt: string
  productId: string
  partCode: string
  description: string
  productJobNumber: string | null
  productionStatus: string | null
  projectId: string
  projectNumber: string
  projectName: string
  customerName: string | null
  planningRoute: string
  designEstimatedCompletion: string | null
  designerName: string | null
  jobCards: JobCard[]
  activeWait: WaitEvent | null
}

type Props = {
  products: FeedProduct[]
}

const ROUTE_COLORS: Record<string, string> = {
  CTO: "bg-blue-50 text-blue-700",
  ETO: "bg-purple-50 text-purple-700",
  SUBCONTRACT: "bg-orange-50 text-orange-700",
  HOLD: "bg-gray-50 text-gray-500",
}

const ROUTE_LABELS: Record<string, string> = {
  CTO: "CTO",
  ETO: "ETO",
  SUBCONTRACT: "Sub",
  HOLD: "Hold",
}

const WAIT_REASON_LABELS: Record<string, string> = {
  CALCS_FROM_SUB: "Calcs (Sub)",
  CLIENT_REVIEW: "Client",
  CONSULTANT_REVIEW: "Consultant",
  STRUCTURAL_ENGINEER: "Struct. Eng.",
  ARCHITECT_REVIEW: "Architect",
  THIRD_PARTY_APPROVAL: "3rd Party",
  OTHER: "Other",
}

const JOB_LABELS: Record<string, string> = {
  GA_DRAWING: "GA",
  PRODUCTION_DRAWINGS: "Prod Dwgs",
  BOM_FINALISATION: "BOM",
  DESIGN_REVIEW: "Review",
}

const COMPLETED_STATUSES = ["APPROVED", "SIGNED_OFF"]

function getJobsCompleted(jobCards: JobCard[]): number {
  return jobCards.filter((j) => COMPLETED_STATUSES.includes(j.status)).length
}

function getRemainingJobs(jobCards: JobCard[]): string[] {
  return jobCards
    .filter((j) => !COMPLETED_STATUSES.includes(j.status))
    .map((j) => JOB_LABELS[j.jobType] || j.jobType)
}

function getIdleDays(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24))
}

function getWaitDays(triggeredAt: string): number {
  return Math.floor((Date.now() - new Date(triggeredAt).getTime()) / (1000 * 60 * 60 * 24))
}

type LandingGroup = "LANDING_SOON" | "ON_TRACK" | "AT_RISK" | "NOT_STARTED"

function classifyProduct(product: FeedProduct): LandingGroup {
  const jobsDone = getJobsCompleted(product.jobCards)
  const total = product.jobCards.length || 4

  // Not started
  if (product.designCardStatus === "QUEUED" || jobsDone === 0) {
    return "NOT_STARTED"
  }

  // Blocked — waiting on external or idle 7+ days
  if (product.designCardStatus === "AWAITING_RESPONSE") {
    return "AT_RISK"
  }

  const idle = getIdleDays(product.designCardUpdatedAt)

  // Nearly done and active
  if (jobsDone >= 3 && idle < 7) {
    return "LANDING_SOON"
  }

  // Nearly done but idle
  if (jobsDone >= 3 && idle >= 7) {
    return "AT_RISK"
  }

  // Has estimate — check if on track
  if (product.designEstimatedCompletion) {
    const est = new Date(product.designEstimatedCompletion)
    const now = new Date()
    const totalDuration = est.getTime() - now.getTime()
    const progressRatio = jobsDone / total

    // If estimate is in the past and not done, at risk
    if (totalDuration < 0) {
      return "AT_RISK"
    }

    // If progress is roughly proportional to time remaining, on track
    // Simple heuristic: if less than halfway done with less than half the time left, at risk
    const timeRatio = totalDuration / (30 * 24 * 60 * 60 * 1000) // normalise to ~30 day windows
    if (progressRatio < 0.5 && timeRatio < 0.3) {
      return "AT_RISK"
    }
  }

  // Idle for 7+ days, at risk
  if (idle >= 7) {
    return "AT_RISK"
  }

  return "ON_TRACK"
}

const GROUP_CONFIG: Record<LandingGroup, { label: string; subtitle: string; color: string; border: string; bg: string }> = {
  LANDING_SOON: {
    label: "Landing Soon",
    subtitle: "Nearly complete, actively progressing — will reach production shortly",
    color: "text-green-800",
    border: "border-green-200",
    bg: "bg-green-50/50",
  },
  ON_TRACK: {
    label: "On Track",
    subtitle: "Progressing through design, on schedule",
    color: "text-blue-800",
    border: "border-blue-200",
    bg: "bg-blue-50/30",
  },
  AT_RISK: {
    label: "At Risk",
    subtitle: "Blocked, idle, or behind schedule — needs attention",
    color: "text-red-800",
    border: "border-red-200",
    bg: "bg-red-50/30",
  },
  NOT_STARTED: {
    label: "Not Started",
    subtitle: "Queued for design, not yet begun",
    color: "text-gray-600",
    border: "border-gray-200",
    bg: "bg-gray-50/30",
  },
}

const GROUP_ORDER: LandingGroup[] = ["LANDING_SOON", "ON_TRACK", "AT_RISK", "NOT_STARTED"]

export function FactoryFeed({ products }: Props) {
  const [routeFilter, setRouteFilter] = useState("ALL")
  const [designerFilter, setDesignerFilter] = useState("ALL")

  // Get unique designers and routes for filters
  const designers = useMemo(() => {
    const names = [...new Set(products.map((p) => p.designerName).filter(Boolean) as string[])]
    return names.sort()
  }, [products])

  const routes = useMemo(() => {
    return [...new Set(products.map((p) => p.planningRoute))]
  }, [products])

  // Filter
  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (routeFilter !== "ALL" && p.planningRoute !== routeFilter) return false
      if (designerFilter !== "ALL" && p.designerName !== designerFilter) return false
      return true
    })
  }, [products, routeFilter, designerFilter])

  // Group and sort
  const grouped = useMemo(() => {
    const groups: Record<LandingGroup, FeedProduct[]> = {
      LANDING_SOON: [],
      ON_TRACK: [],
      AT_RISK: [],
      NOT_STARTED: [],
    }

    for (const product of filtered) {
      const group = classifyProduct(product)
      groups[group].push(product)
    }

    // Sort within groups: by jobs completed desc, then by idle days desc
    for (const key of GROUP_ORDER) {
      groups[key].sort((a, b) => {
        const aDone = getJobsCompleted(a.jobCards)
        const bDone = getJobsCompleted(b.jobCards)
        if (aDone !== bDone) return bDone - aDone
        return getIdleDays(b.designCardUpdatedAt) - getIdleDays(a.designCardUpdatedAt)
      })
    }

    return groups
  }, [filtered])

  const totalFiltered = filtered.length

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Factory Feed</h2>
          <p className="text-xs text-gray-500">{totalFiltered} products in design pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={routeFilter} onValueChange={setRouteFilter}>
            <SelectTrigger className="w-[120px] text-xs h-8">
              <SelectValue placeholder="Route" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Routes</SelectItem>
              {routes.map((r) => (
                <SelectItem key={r} value={r}>{ROUTE_LABELS[r] || r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={designerFilter} onValueChange={setDesignerFilter}>
            <SelectTrigger className="w-[140px] text-xs h-8">
              <SelectValue placeholder="Designer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Designers</SelectItem>
              {designers.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Groups */}
      {GROUP_ORDER.map((groupKey) => {
        const items = grouped[groupKey]
        const config = GROUP_CONFIG[groupKey]
        if (items.length === 0) return null

        return (
          <div key={groupKey} className={cn("rounded-lg border", config.border, config.bg)}>
            <div className="px-4 py-2.5 border-b border-inherit">
              <div className="flex items-center justify-between">
                <div>
                  <span className={cn("text-sm font-semibold", config.color)}>{config.label}</span>
                  <span className="text-xs text-gray-400 ml-2">({items.length} product{items.length !== 1 ? "s" : ""})</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">{config.subtitle}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-inherit">
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Product</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Project</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-500">Route</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-500">Progress</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Remaining</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Designer</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Est. Landing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {items.map((product) => {
                    const jobsDone = getJobsCompleted(product.jobCards)
                    const total = product.jobCards.length || 4
                    const remaining = getRemainingJobs(product.jobCards)
                    const idle = getIdleDays(product.designCardUpdatedAt)
                    const isWaiting = product.designCardStatus === "AWAITING_RESPONSE"
                    const isIdle = !isWaiting && product.designCardStatus !== "QUEUED" && idle >= 3

                    // Estimate landing
                    let landing = "—"
                    if (product.designCardStatus === "QUEUED") {
                      landing = product.designEstimatedCompletion
                        ? new Date(product.designEstimatedCompletion).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                        : "No estimate"
                    } else if (jobsDone >= 3 && !isWaiting && idle < 3) {
                      landing = "Days away"
                    } else if (jobsDone >= 3 && !isWaiting) {
                      landing = "Soon (idle)"
                    } else if (isWaiting) {
                      const waitDays = product.activeWait ? getWaitDays(product.activeWait.triggeredAt) : 0
                      landing = `Blocked ${waitDays}d`
                    } else if (product.designEstimatedCompletion) {
                      const est = new Date(product.designEstimatedCompletion)
                      const now = new Date()
                      if (est < now) {
                        landing = "Overdue"
                      } else {
                        landing = `By ${est.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                      }
                    } else {
                      landing = "No estimate"
                    }

                    return (
                      <tr key={product.designCardId} className="hover:bg-white/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <Link href={`/projects/${product.projectId}`} className="hover:text-blue-600">
                            <div className="font-medium text-gray-900">
                              {product.productJobNumber || product.partCode}
                            </div>
                            <div className="text-[10px] text-gray-400 truncate max-w-[160px]">{product.description}</div>
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
                          <Link href={`/projects/${product.projectId}`} className="hover:text-blue-600">
                            <div className="font-mono text-gray-500">{product.projectNumber}</div>
                            <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{product.customerName}</div>
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant="outline" className={cn("text-[9px] px-1.5", ROUTE_COLORS[product.planningRoute] || "")}>
                            {ROUTE_LABELS[product.planningRoute] || product.planningRoute}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Progress bar */}
                            <div className="flex gap-0.5">
                              {Array.from({ length: total }).map((_, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    "w-3 h-3 rounded-sm",
                                    i < jobsDone ? "bg-green-500" : "bg-gray-200"
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-gray-400 ml-1">{jobsDone}/{total}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {remaining.length > 0 ? remaining.join(" → ") : "Done"}
                        </td>
                        <td className="px-4 py-2.5">
                          {product.designerName ? (
                            <span className="text-indigo-600">{product.designerName.split(" ")[0]}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {isWaiting && product.activeWait ? (
                            <div className="flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium text-[9px]">
                                {WAIT_REASON_LABELS[product.activeWait.reason] || product.activeWait.reason}
                              </span>
                              <span className="text-orange-400 text-[9px]">{getWaitDays(product.activeWait.triggeredAt)}d</span>
                            </div>
                          ) : isIdle ? (
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-medium",
                              idle >= 7 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                            )}>
                              {idle}d idle
                            </span>
                          ) : product.designCardStatus === "QUEUED" ? (
                            <span className="text-gray-400 text-[9px]">Queued</span>
                          ) : (
                            <span className="text-green-600 text-[9px] font-medium">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn(
                            "text-[10px] font-medium",
                            landing === "Days away" ? "text-green-700" :
                            landing === "Overdue" ? "text-red-700" :
                            landing.startsWith("Blocked") ? "text-orange-600" :
                            landing.startsWith("By ") ? "text-blue-600" :
                            "text-gray-400"
                          )}>
                            {landing}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {totalFiltered === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
          <p className="text-sm text-gray-400">No products in design pipeline</p>
        </div>
      )}
    </div>
  )
}
