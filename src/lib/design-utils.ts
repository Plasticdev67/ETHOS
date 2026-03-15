// Design Stage Module — shared utilities

import type { DesignJobType, DesignJobStatus, DesignCardStatus } from "@/generated/prisma/client"

// Canonical order of design job types
export const JOB_TYPE_ORDER: DesignJobType[] = [
  "GA_DRAWING",
  "PRODUCTION_DRAWINGS",
  "BOM_FINALISATION",
  "DESIGN_REVIEW",
]

// Human-readable labels for job types
export const JOB_TYPE_LABELS: Record<string, string> = {
  GA_DRAWING: "GA Drawing",
  PRODUCTION_DRAWINGS: "Production Drawings",
  BOM_FINALISATION: "BOM Finalisation",
  DESIGN_REVIEW: "Design Review",
}

// Returns the prerequisite job type (null for first in chain)
export function getJobDependency(jobType: DesignJobType): DesignJobType | null {
  const idx = JOB_TYPE_ORDER.indexOf(jobType)
  return idx > 0 ? JOB_TYPE_ORDER[idx - 1] : null
}

// Check if a job card can be started (dependency met)
export function canStartJob(
  jobType: DesignJobType,
  allJobCards: { jobType: string; status: string }[]
): boolean {
  const dependency = getJobDependency(jobType)
  if (!dependency) return true // GA_DRAWING has no dependency

  const depCard = allJobCards.find((c) => c.jobType === dependency)
  if (!depCard) return false

  // Dependency must be APPROVED or SIGNED_OFF
  return depCard.status === "APPROVED" || depCard.status === "SIGNED_OFF"
}

// Back-calculate target dates from project deadline
// Allocates time evenly across products and job types
export function calculateDesignTargetDates(
  projectDeadline: Date | null,
  productCount: number
): { targetStart: Date; targetEnd: Date } | null {
  if (!projectDeadline) return null

  // Reserve 60% of time before deadline for design (rest for production + install)
  const now = new Date()
  const totalMs = projectDeadline.getTime() - now.getTime()
  if (totalMs <= 0) return null

  const designMs = totalMs * 0.6
  const perProductMs = designMs / Math.max(productCount, 1)

  return {
    targetStart: now,
    targetEnd: new Date(now.getTime() + perProductMs),
  }
}

// Check if all design cards for a project are COMPLETE
export function isDesignComplete(
  designCards: { status: string }[]
): boolean {
  if (designCards.length === 0) return false
  return designCards.every((c) => c.status === "COMPLETE")
}

// Check if handover is ready (all job cards SIGNED_OFF on all cards)
export function isHandoverReady(
  designCards: { status: string; jobCards: { status: string }[] }[]
): boolean {
  if (designCards.length === 0) return false
  return designCards.every(
    (card) =>
      card.status === "COMPLETE" &&
      card.jobCards.every((j) => j.status === "SIGNED_OFF")
  )
}

// Color helpers for design card status
export function getDesignCardStatusColor(status: DesignCardStatus | string): string {
  const map: Record<string, string> = {
    QUEUED: "bg-gray-100 text-gray-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    REVIEW: "bg-amber-100 text-amber-700",
    AWAITING_RESPONSE: "bg-orange-100 text-orange-700",
    COMPLETE: "bg-green-100 text-green-700",
    ON_HOLD: "bg-red-100 text-red-700",
  }
  return map[status] || "bg-gray-100 text-gray-600"
}

// Color helpers for job card status
export function getDesignJobStatusColor(status: DesignJobStatus | string): string {
  const map: Record<string, string> = {
    BLOCKED: "bg-gray-100 text-gray-500",
    READY: "bg-slate-100 text-slate-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    SUBMITTED: "bg-amber-100 text-amber-700",
    APPROVED: "bg-emerald-100 text-emerald-700",
    REJECTED: "bg-red-100 text-red-700",
    SIGNED_OFF: "bg-green-100 text-green-800",
  }
  return map[status] || "bg-gray-100 text-gray-600"
}

// Human-readable labels for design card status
export function getDesignCardStatusLabel(status: string): string {
  const map: Record<string, string> = {
    QUEUED: "Queued",
    IN_PROGRESS: "In Progress",
    REVIEW: "In Review",
    AWAITING_RESPONSE: "Awaiting Response",
    COMPLETE: "Complete",
    ON_HOLD: "On Hold",
  }
  return map[status] || status
}

// Human-readable labels for job card status
export function getDesignJobStatusLabel(status: string): string {
  const map: Record<string, string> = {
    BLOCKED: "Blocked",
    READY: "Ready",
    IN_PROGRESS: "In Progress",
    SUBMITTED: "Submitted for Review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    SIGNED_OFF: "Signed Off",
  }
  return map[status] || status
}

// Default handover checklist items
export const DEFAULT_HANDOVER_CHECKLIST = [
  "All GA drawings approved",
  "All production drawings signed off",
  "BOM finalised for all products",
  "Design review completed",
  "Drawing numbers assigned",
]
