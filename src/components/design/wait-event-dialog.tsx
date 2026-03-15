"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const WAIT_REASONS = [
  { value: "CALCS_FROM_SUB", label: "Calcs from Subcontractor" },
  { value: "CLIENT_REVIEW", label: "Client Review" },
  { value: "CONSULTANT_REVIEW", label: "Consultant Review" },
  { value: "STRUCTURAL_ENGINEER", label: "Structural Engineer" },
  { value: "ARCHITECT_REVIEW", label: "Architect Review" },
  { value: "THIRD_PARTY_APPROVAL", label: "Third Party Approval" },
  { value: "OTHER", label: "Other" },
] as const

type WaitableCard = {
  id: string
  status: string
  product: {
    id: string
    partCode: string
    description: string
    productJobNumber: string | null
  }
}

// Dialog to mark a design card as awaiting response
export function AwaitingResponseDialog({
  open,
  onOpenChange,
  cards,
  projectNumber,
  projectName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cards: WaitableCard[]
  projectNumber: string
  projectName: string
}) {
  const router = useRouter()
  const [selectedCardId, setSelectedCardId] = useState("")
  const [reason, setReason] = useState("")
  const [externalParty, setExternalParty] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  // Only show cards that can be put on hold (IN_PROGRESS or REVIEW)
  const eligibleCards = cards.filter(
    (c) => c.status === "IN_PROGRESS" || c.status === "REVIEW"
  )

  async function handleSubmit() {
    if (!selectedCardId || !reason) return
    setSaving(true)
    try {
      const res = await fetch(`/api/design/cards/${selectedCardId}/wait`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          externalParty: externalParty || undefined,
          notes: notes || undefined,
        }),
      })
      if (res.ok) {
        onOpenChange(false)
        setSelectedCardId("")
        setReason("")
        setExternalParty("")
        setNotes("")
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative z-50 w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Mark as Awaiting Response</h3>
        <p className="text-xs text-gray-500 mb-4">
          {projectNumber} — {projectName}
        </p>

        <div className="space-y-3">
          {/* Product selector */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Product</label>
            {eligibleCards.length === 0 ? (
              <p className="text-xs text-gray-400">No products currently in progress</p>
            ) : (
              <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      <span className="font-mono text-xs mr-2">{card.product.productJobNumber || card.product.partCode}</span>
                      <span className="text-gray-600">{card.product.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {WAIT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* External party */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
              External Party <span className="text-gray-400 normal-case">(optional)</span>
            </label>
            <Input
              value={externalParty}
              onChange={(e) => setExternalParty(e.target.value)}
              placeholder="e.g. Smith & Jones Consulting"
              className="text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
              Notes <span className="text-gray-400 normal-case">(optional)</span>
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sent calcs pack 12/03, chasing 19/03"
              className="text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving || !selectedCardId || !reason}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            {saving ? "Saving..." : "Mark as Waiting"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Inline button to resolve an active wait (used on the board card)
export function ResumeFromWaitButton({
  designCardId,
  onResolved,
}: {
  designCardId: string
  onResolved?: () => void
}) {
  const router = useRouter()
  const [resolving, setResolving] = useState(false)

  async function handleResume() {
    const resolutionNotes = prompt("Any notes on the response received? (optional)")
    if (resolutionNotes === null) return // cancelled

    setResolving(true)
    try {
      const res = await fetch(`/api/design/cards/${designCardId}/wait`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionNotes: resolutionNotes || undefined }),
      })
      if (res.ok) {
        onResolved?.()
        router.refresh()
      }
    } finally {
      setResolving(false)
    }
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        handleResume()
      }}
      disabled={resolving}
      className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-[10px] font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {resolving ? "Resuming..." : "Response Received"}
    </button>
  )
}
