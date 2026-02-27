"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Send, CheckCircle, XCircle, RotateCcw, FolderKanban } from "lucide-react"

export function QuoteStatusActions({
  quoteId,
  currentStatus,
  onStatusChange,
  quoteSummary,
}: {
  quoteId: string
  currentStatus: string
  onStatusChange: () => void
  quoteSummary?: {
    quoteNumber: string
    subject: string | null
    customerId: string
    customerName: string
    totalSell: number
  }
}) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [converting, setConverting] = useState(false)

  async function updateStatus(newStatus: string) {
    setUpdating(true)
    try {
      await fetch(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      onStatusChange()

      // If accepted, offer to create a project
      if (newStatus === "ACCEPTED" && quoteSummary) {
        setShowConvertDialog(true)
      }
    } finally {
      setUpdating(false)
    }
  }

  async function handleConvertToProject() {
    if (!quoteSummary) return
    setConverting(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quoteSummary.subject || `Project from ${quoteSummary.quoteNumber}`,
          customerId: quoteSummary.customerId,
          salesStage: "ORDER",
          projectStatus: "DESIGN",
          estimatedValue: quoteSummary.totalSell,
          quoteId: quoteId,
        }),
      })
      if (res.ok) {
        const project = await res.json()
        // Link the quote to the new project
        await fetch(`/api/quotes/${quoteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id }),
        })
        router.push(`/projects/${project.id}`)
      }
    } finally {
      setConverting(false)
      setShowConvertDialog(false)
    }
  }

  return (
    <>
      {currentStatus === "DRAFT" && (
        <Button onClick={() => updateStatus("SUBMITTED")} disabled={updating} size="sm">
          <Send className="mr-1 h-4 w-4" />
          {updating ? "Submitting..." : "Submit Quote"}
        </Button>
      )}

      {currentStatus === "SUBMITTED" && (
        <div className="flex items-center gap-2">
          <Button onClick={() => updateStatus("ACCEPTED")} disabled={updating} size="sm" className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="mr-1 h-4 w-4" />
            Accept
          </Button>
          <Button onClick={() => updateStatus("DECLINED")} disabled={updating} size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
            <XCircle className="mr-1 h-4 w-4" />
            Decline
          </Button>
        </div>
      )}

      {(currentStatus === "DECLINED" || currentStatus === "ACCEPTED") && (
        <div className="flex items-center gap-2">
          <Button onClick={() => updateStatus("REVISED")} disabled={updating} size="sm" variant="outline">
            <RotateCcw className="mr-1 h-4 w-4" />
            Revise
          </Button>
          {currentStatus === "ACCEPTED" && quoteSummary && (
            <Button onClick={() => setShowConvertDialog(true)} size="sm">
              <FolderKanban className="mr-1 h-4 w-4" />
              Create Project
            </Button>
          )}
        </div>
      )}

      {currentStatus === "REVISED" && (
        <Button onClick={() => updateStatus("SUBMITTED")} disabled={updating} size="sm">
          <Send className="mr-1 h-4 w-4" />
          Re-submit
        </Button>
      )}

      {/* Convert to Project Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Project from Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Quote <strong>{quoteSummary?.quoteNumber}</strong> has been accepted. Create a project for <strong>{quoteSummary?.customerName}</strong>? All quoted line items will be carried through as products. You can remove any the customer didn&apos;t order.
            </p>
            <div className="rounded-lg border border-border bg-gray-50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Project Name:</span>
                <span className="font-medium">{quoteSummary?.subject || `Project from ${quoteSummary?.quoteNumber}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Customer:</span>
                <span className="font-medium">{quoteSummary?.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sales Stage:</span>
                <span className="font-medium">Order</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="font-medium">Design</span>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
                Not Now
              </Button>
              <Button onClick={handleConvertToProject} disabled={converting}>
                <FolderKanban className="mr-1 h-4 w-4" />
                {converting ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
