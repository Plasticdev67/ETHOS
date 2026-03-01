import { NextResponse } from "next/server"

/**
 * Valid status transitions per model.
 * Key = current status, Value = array of statuses it can transition to.
 */

const QUOTE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SUBMITTED", "DECLINED"],
  SUBMITTED: ["ACCEPTED", "DECLINED", "REVISED"],
  ACCEPTED: [],          // Terminal — no further transitions
  DECLINED: ["REVISED"],
  REVISED: ["SUBMITTED", "DECLINED"],
}

const PO_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["APPROVED", "CANCELLED"],
  APPROVED: ["SENT", "CANCELLED"],
  SENT: ["PARTIALLY_RECEIVED", "COMPLETE", "CANCELLED"],
  PARTIALLY_RECEIVED: ["COMPLETE"],
  COMPLETE: [],
  CANCELLED: [],
}

const INVOICE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["CERTIFIED", "OVERDUE", "DISPUTED"],
  CERTIFIED: ["PAID", "DISPUTED"],
  OVERDUE: ["PAID", "DISPUTED"],
  PAID: [],              // Terminal
  DISPUTED: ["SUBMITTED", "CERTIFIED"],
}

const VARIATION_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["SUBMITTED"],
  SUBMITTED: ["APPROVED", "REJECTED"],
  APPROVED: ["IMPLEMENTED"],
  REJECTED: [],
  IMPLEMENTED: [],
}

const NCR_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["INVESTIGATING", "RESOLVED", "CLOSED"],
  INVESTIGATING: ["RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
}

const PROJECT_TRANSITIONS: Record<string, string[]> = {
  OPPORTUNITY: ["QUOTATION"],
  QUOTATION: ["DESIGN", "OPPORTUNITY"],
  DESIGN: ["DESIGN_FREEZE"],
  DESIGN_FREEZE: ["MANUFACTURE"],
  MANUFACTURE: ["INSTALLATION"],
  INSTALLATION: ["REVIEW"],
  REVIEW: ["COMPLETE"],
  COMPLETE: [],
}

const OPPORTUNITY_TRANSITIONS: Record<string, string[]> = {
  DEAD_LEAD: ["ACTIVE_LEAD"],
  ACTIVE_LEAD: ["PENDING_APPROVAL", "QUOTED", "WON", "LOST", "DEAD_LEAD"],
  PENDING_APPROVAL: ["QUOTED", "ACTIVE_LEAD", "DEAD_LEAD"],
  QUOTED: ["WON", "LOST", "ACTIVE_LEAD"],
  WON: [],
  LOST: ["ACTIVE_LEAD"],
}

const RETENTION_TRANSITIONS: Record<string, string[]> = {
  HELD: ["PARTIALLY_RELEASED", "RELEASED"],
  PARTIALLY_RELEASED: ["RELEASED"],
  RELEASED: [],
}

const PLANT_HIRE_TRANSITIONS: Record<string, string[]> = {
  ON_HIRE: ["OFF_HIRE", "RETURNED"],
  OFF_HIRE: ["ON_HIRE", "RETURNED"],
  RETURNED: [],
}

const SUB_CONTRACT_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETE", "DISPUTED"],
  COMPLETE: [],
  DISPUTED: ["IN_PROGRESS"],
}

const TRANSITION_MAPS: Record<string, Record<string, string[]>> = {
  quote: QUOTE_TRANSITIONS,
  purchaseOrder: PO_TRANSITIONS,
  salesInvoice: INVOICE_TRANSITIONS,
  variation: VARIATION_TRANSITIONS,
  ncr: NCR_TRANSITIONS,
  project: PROJECT_TRANSITIONS,
  opportunity: OPPORTUNITY_TRANSITIONS,
  retention: RETENTION_TRANSITIONS,
  plantHire: PLANT_HIRE_TRANSITIONS,
  subContract: SUB_CONTRACT_TRANSITIONS,
}

/**
 * Validates a status transition. Returns null if valid, or a NextResponse 400 if invalid.
 */
export function validateStatusTransition(
  model: keyof typeof TRANSITION_MAPS,
  currentStatus: string,
  newStatus: string
): NextResponse | null {
  const map = TRANSITION_MAPS[model]
  if (!map) return null // No map = no restriction

  const allowed = map[currentStatus]
  if (!allowed) return null // Unknown current status = allow (backwards compat)

  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      {
        error: `Invalid status transition: ${currentStatus} → ${newStatus}`,
        allowedTransitions: allowed,
      },
      { status: 400 }
    )
  }

  return null
}

/**
 * Statuses that indicate a record is "locked" and should not be freely edited.
 * Only status transitions and notes are allowed on locked records.
 */
const LOCKED_STATUSES: Record<string, string[]> = {
  quote: ["ACCEPTED", "DECLINED"],
  purchaseOrder: ["APPROVED", "SENT", "PARTIALLY_RECEIVED", "COMPLETE", "CANCELLED"],
  salesInvoice: ["CERTIFIED", "PAID"],
  variation: ["APPROVED", "REJECTED", "IMPLEMENTED"],
  retention: ["RELEASED"],
  plantHire: ["RETURNED"],
  subContract: ["COMPLETE"],
}

/**
 * Checks if a record is in a locked status. Returns a 403 NextResponse if locked, null if editable.
 * Use this to block PATCH/DELETE on finalized financial records.
 */
export function checkImmutability(
  model: keyof typeof LOCKED_STATUSES,
  currentStatus: string
): NextResponse | null {
  const locked = LOCKED_STATUSES[model]
  if (!locked) return null

  if (locked.includes(currentStatus)) {
    return NextResponse.json(
      {
        error: `Record is locked (status: ${currentStatus}). Cannot edit or delete.`,
      },
      { status: 403 }
    )
  }

  return null
}
