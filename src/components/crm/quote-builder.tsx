"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wrench,
  Lightbulb,
  Truck,
  Pencil,
} from "lucide-react"
import { formatCurrency, cn } from "@/lib/utils"
import { CrmProductBuilder } from "./crm-product-builder"
import type { QuoteLineEditData } from "./crm-product-builder"

type QuoteLine = {
  id: string
  description: string
  type: string
  quantity: number
  unitCost: string | number
  totalCost: string | number
  sortOrder: number
  classification?: string
  variantId?: string
  computedCost?: string | number | null
  // Configuration fields (for edit support)
  width?: number | null
  height?: number | null
  openingDirection?: string | null
  lockConfig?: { lockType?: string } | null
  finishConfig?: { ralColour?: string; paintFinish?: string } | null
  featureTags?: { name: string; enabled: boolean }[] | null
  transomeConfig?: { enabled?: boolean; height?: number | null } | null
  notes?: string | null
}

type Opportunity = {
  id: string
  name: string
  description: string | null
  status: string
  contactPerson: string | null
  rdCost: string | number | null
  riskCost: string | number | null
  marginPercent: string | number | null
  quotedPrice: string | number | null
  quoteApproval: string
  quoteNumber: string | null
  quoteSentAt: string | null
  quoteSentTo: string | null
  prospect: { id: string; companyName: string }
  quoteLines: QuoteLine[]
  // Lifting plan (project-level)
  liftingPlanStatus: string | null
  estimatedWeight: string | number | null
  maxLiftHeight: string | number | null
  craneRequired: string | null
  siteAccessNotes: string | null
  liftingPlanCost: string | number | null
  deliveryNotes: string | null
}

const approvalColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
}

const approvalLabels: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
}

export function QuoteBuilder({ opportunity, userRole = "STAFF" }: { opportunity: Opportunity; userRole?: string }) {
  const router = useRouter()
  const [lines, setLines] = useState<QuoteLine[]>(opportunity.quoteLines)
  const [rdCost, setRdCost] = useState(
    opportunity.rdCost ? String(opportunity.rdCost) : ""
  )
  const [riskCost, setRiskCost] = useState(
    opportunity.riskCost ? String(opportunity.riskCost) : ""
  )
  const [marginPercent, setMarginPercent] = useState(
    opportunity.marginPercent ? String(opportunity.marginPercent) : ""
  )
  const [approval, setApproval] = useState(opportunity.quoteApproval)
  const [quoteNumber, setQuoteNumber] = useState(opportunity.quoteNumber)
  const [quoteSentAt, setQuoteSentAt] = useState(opportunity.quoteSentAt)
  const [quoteSentTo, setQuoteSentTo] = useState(opportunity.quoteSentTo || "")
  const [markingSent, setMarkingSent] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [configureOpen, setConfigureOpen] = useState(false)
  const [configureClassification, setConfigureClassification] = useState<"STANDARD" | "INNOVATE_TO_ORDER">("STANDARD")
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [editingLine, setEditingLine] = useState<QuoteLineEditData | null>(null)
  const [editManualLine, setEditManualLine] = useState<QuoteLine | null>(null)

  // Lifting plan state (project-level)
  const [liftingStatus, setLiftingStatus] = useState(opportunity.liftingPlanStatus || "TBC")
  const [liftingWeight, setLiftingWeight] = useState(
    opportunity.estimatedWeight != null ? String(opportunity.estimatedWeight) : ""
  )
  const [liftingMaxHeight, setLiftingMaxHeight] = useState(
    opportunity.maxLiftHeight != null ? String(opportunity.maxLiftHeight) : ""
  )
  const [liftingCrane, setLiftingCrane] = useState(opportunity.craneRequired || "TBC")
  const [liftingSiteAccess, setLiftingSiteAccess] = useState(opportunity.siteAccessNotes || "")
  const [liftingCost, setLiftingCost] = useState(
    opportunity.liftingPlanCost != null ? String(opportunity.liftingPlanCost) : ""
  )
  const [deliveryNotes, setDeliveryNotes] = useState(opportunity.deliveryNotes || "")

  // Auto-save lifting plan when select values change
  const liftingInitRef = useRef(true)
  useEffect(() => {
    if (liftingInitRef.current) {
      liftingInitRef.current = false
      return
    }
    fetch(`/api/opportunities/${opportunity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        liftingPlanStatus: liftingStatus,
        liftingPlanRequired: liftingStatus === "YES",
        craneRequired: liftingCrane,
      }),
    })
  }, [liftingStatus, liftingCrane, opportunity.id])

  const isLocked = approval === "APPROVED" || approval === "PENDING_APPROVAL"

  // Calculate totals
  const lineItemsTotal = lines.reduce(
    (sum, l) => sum + Number(l.totalCost),
    0
  )
  const rdCostNum = parseFloat(rdCost) || 0
  const riskCostNum = parseFloat(riskCost) || 0
  const marginNum = parseFloat(marginPercent) || 0
  const baseCost = lineItemsTotal + rdCostNum + riskCostNum
  const marginAmount = baseCost * (marginNum / 100)
  const quotedPrice = baseCost + marginAmount

  const hasItoLines = lines.some((l) => l.classification === "INNOVATE_TO_ORDER")
  const canApproveIto = ["MANAGING_DIRECTOR", "TECHNICAL_DIRECTOR", "SALES_DIRECTOR", "ADMIN"].includes(userRole)

  // Add line item (manual)
  async function handleAddLine(data: {
    description: string
    type: string
    quantity: number
    unitCost: string
    classification?: string
  }) {
    const res = await fetch(`/api/opportunities/${opportunity.id}/quote-lines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const line = await res.json()
      setLines((prev) => [...prev, line])
      setAddDialogOpen(false)
    }
  }

  // Add configured line (from product builder)
  async function handleAddConfiguredLine(data: Record<string, unknown>) {
    const res = await fetch(`/api/opportunities/${opportunity.id}/quote-lines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const line = await res.json()
      setLines((prev) => [...prev, line])
      setConfigureOpen(false)
    }
  }

  // Delete line item
  async function handleDeleteLine(lineId: string) {
    const res = await fetch(
      `/api/opportunities/${opportunity.id}/quote-lines/${lineId}`,
      { method: "DELETE" }
    )
    if (res.ok) {
      setLines((prev) => prev.filter((l) => l.id !== lineId))
    }
  }

  // Update configured line (edit mode)
  async function handleUpdateConfiguredLine(lineId: string, data: Record<string, unknown>) {
    const res = await fetch(
      `/api/opportunities/${opportunity.id}/quote-lines/${lineId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    )
    if (res.ok) {
      const updated = await res.json()
      setLines((prev) => prev.map((l) => (l.id === lineId ? updated : l)))
      setConfigureOpen(false)
      setEditingLine(null)
    }
  }

  // Update manual line (edit mode)
  async function handleUpdateManualLine(data: {
    description: string
    type: string
    quantity: number
    unitCost: string
    classification?: string
  }) {
    if (!editManualLine) return
    const res = await fetch(
      `/api/opportunities/${opportunity.id}/quote-lines/${editManualLine.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    )
    if (res.ok) {
      const updated = await res.json()
      setLines((prev) => prev.map((l) => (l.id === editManualLine.id ? updated : l)))
      setAddDialogOpen(false)
      setEditManualLine(null)
    }
  }

  // Handle row click to edit
  function handleRowClick(line: QuoteLine) {
    if (isLocked) return
    if (line.type === "PRODUCT" && line.variantId) {
      // Open product builder in edit mode
      setEditingLine({
        id: line.id,
        variantId: line.variantId,
        description: line.description,
        type: line.type,
        quantity: line.quantity,
        unitCost: line.unitCost,
        classification: line.classification,
        width: line.width,
        height: line.height,
        openingDirection: line.openingDirection,
        lockConfig: line.lockConfig,
        finishConfig: line.finishConfig,
        featureTags: line.featureTags,
        transomeConfig: line.transomeConfig,
      })
      setConfigureClassification(
        (line.classification as "STANDARD" | "INNOVATE_TO_ORDER") || "STANDARD"
      )
      setConfigureOpen(true)
    } else {
      // Open manual/activity edit dialog
      setEditManualLine(line)
      setAddDialogOpen(true)
    }
  }

  // Save costs & margin
  const saveCosts = useCallback(async () => {
    await fetch(`/api/opportunities/${opportunity.id}/quote`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rdCost: rdCost || null,
        riskCost: riskCost || null,
        marginPercent: marginPercent || null,
      }),
    })
  }, [opportunity.id, rdCost, riskCost, marginPercent])

  // Save lifting plan
  const saveLiftingPlan = useCallback(async () => {
    await fetch(`/api/opportunities/${opportunity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        liftingPlanStatus: liftingStatus,
        liftingPlanRequired: liftingStatus === "YES",
        estimatedWeight: liftingWeight || null,
        maxLiftHeight: liftingMaxHeight || null,
        craneRequired: liftingCrane,
        siteAccessNotes: liftingSiteAccess || null,
        liftingPlanCost: liftingCost || null,
        deliveryNotes: deliveryNotes || null,
      }),
    })
  }, [opportunity.id, liftingStatus, liftingWeight, liftingMaxHeight, liftingCrane, liftingSiteAccess, liftingCost, deliveryNotes])

  // Submit for approval
  async function handleSubmit() {
    await saveCosts()
    const res = await fetch(`/api/opportunities/${opportunity.id}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit" }),
    })
    if (res.ok) {
      const data = await res.json()
      setApproval("PENDING_APPROVAL")
      if (data.quoteNumber) setQuoteNumber(data.quoteNumber)
      setConfirmAction(null)
    } else {
      const err = await res.json()
      alert(err.error || "Failed to submit")
    }
  }

  // Mark quote as sent
  async function handleMarkAsSent() {
    setMarkingSent(true)
    const res = await fetch(`/api/opportunities/${opportunity.id}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_sent", sentTo: quoteSentTo || opportunity.contactPerson || "" }),
    })
    if (res.ok) {
      const data = await res.json()
      setQuoteSentAt(data.quoteSentAt)
      setQuoteSentTo(data.quoteSentTo || "")
    }
    setMarkingSent(false)
  }

  // Approve
  async function handleApprove() {
    const res = await fetch(`/api/opportunities/${opportunity.id}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    })
    if (res.ok) {
      setApproval("APPROVED")
      setConfirmAction(null)
      router.refresh()
    } else {
      const err = await res.json()
      alert(err.error || "Failed to approve")
      setConfirmAction(null)
    }
  }

  // Reject
  async function handleReject() {
    const res = await fetch(`/api/opportunities/${opportunity.id}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    })
    if (res.ok) {
      setApproval("REJECTED")
      setConfirmAction(null)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              Quote Builder
            </h1>
            {quoteNumber && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-mono text-xs">
                {quoteNumber}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {opportunity.prospect.companyName} — {opportunity.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {quoteSentAt && (
            <Badge variant="secondary" className="bg-green-50 text-green-700 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Sent {quoteSentTo ? `to ${quoteSentTo}` : ""}
            </Badge>
          )}
          <Badge
            variant="secondary"
            className={approvalColors[approval] || approvalColors.DRAFT}
          >
            {approvalLabels[approval] || approval}
          </Badge>
        </div>
      </div>

      {/* Line Items */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-gray-900">
              Products & Activities
            </h2>
            {!isLocked && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setConfigureClassification("STANDARD")
                    setConfigureOpen(true)
                  }}
                  className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  CTO Product
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setConfigureClassification("INNOVATE_TO_ORDER")
                    setConfigureOpen(true)
                  }}
                  className="gap-1.5 bg-orange-500 hover:bg-orange-600"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  ITO Product
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddDialogOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Manual Item
                </Button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-gray-500">
                    Class
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-gray-500">
                    Description
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium uppercase text-gray-500">
                    Qty
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase text-gray-500">
                    Unit Cost
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase text-gray-500">
                    Total
                  </th>
                  {!isLocked && (
                    <th className="px-4 py-2.5 text-center text-xs font-medium uppercase text-gray-500 w-10"></th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map((line) => (
                  <tr
                    key={line.id}
                    onClick={() => handleRowClick(line)}
                    className={cn(
                      line.classification === "INNOVATE_TO_ORDER"
                        ? "bg-orange-50/60 hover:bg-orange-50"
                        : "hover:bg-gray-50",
                      !isLocked && "cursor-pointer"
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="secondary"
                        className={
                          line.type === "PRODUCT"
                            ? "bg-blue-100 text-blue-700"
                            : line.type === "MANUAL"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-purple-100 text-purple-700"
                        }
                      >
                        {line.type === "PRODUCT" ? "Product" : line.type === "MANUAL" ? "Manual" : "Activity"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      {line.classification === "INNOVATE_TO_ORDER" ? (
                        <Badge className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 shadow-sm">
                          ITO
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          CTO
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-900">
                      <div className="flex items-center gap-2">
                        {line.description}
                        {line.classification === "INNOVATE_TO_ORDER" && (
                          <Lightbulb className="h-4 w-4 text-orange-500 shrink-0" />
                        )}
                        {!isLocked && (
                          <Pencil className="h-3 w-3 text-gray-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono text-gray-600">
                      {line.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-600">
                      {formatCurrency(Number(line.unitCost))}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium text-gray-900">
                      {formatCurrency(Number(line.totalCost))}
                    </td>
                    {!isLocked && (
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteLine(line.id)
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr>
                    <td
                      colSpan={isLocked ? 6 : 7}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No items added yet. Click &ldquo;Standard Product&rdquo; or &ldquo;Manual Item&rdquo; to start building
                      the quote.
                    </td>
                  </tr>
                )}
              </tbody>
              {lines.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-gray-50/50">
                    <td
                      colSpan={isLocked ? 5 : 6}
                      className="px-4 py-2.5 text-right text-sm font-semibold text-gray-700"
                    >
                      Items Subtotal
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-900">
                      {formatCurrency(lineItemsTotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown & Margin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Costs */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Additional Costs
            </h2>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="rdCost">R&D Cost (£)</Label>
                <Input
                  id="rdCost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={rdCost}
                  onChange={(e) => setRdCost(e.target.value)}
                  onBlur={saveCosts}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="riskCost">Risk Cost (£)</Label>
                <Input
                  id="riskCost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={riskCost}
                  onChange={(e) => setRiskCost(e.target.value)}
                  onBlur={saveCosts}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="marginPercent">Margin (%)</Label>
                <Input
                  id="marginPercent"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 15"
                  value={marginPercent}
                  onChange={(e) => setMarginPercent(e.target.value)}
                  onBlur={saveCosts}
                  disabled={isLocked}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Quote Summary
            </h2>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Items Subtotal</span>
                <span className="font-mono text-gray-700">
                  {formatCurrency(lineItemsTotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">R&D Cost</span>
                <span className="font-mono text-gray-700">
                  {formatCurrency(rdCostNum)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Risk Cost</span>
                <span className="font-mono text-gray-700">
                  {formatCurrency(riskCostNum)}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-2">
                <span className="text-gray-600 font-medium">Base Cost</span>
                <span className="font-mono font-medium text-gray-800">
                  {formatCurrency(baseCost)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  Margin ({marginNum}%)
                </span>
                <span className="font-mono text-gray-700">
                  {formatCurrency(marginAmount)}
                </span>
              </div>
              <div className="flex justify-between text-base border-t-2 border-border pt-3">
                <span className="font-semibold text-gray-900">
                  Quotation Price
                </span>
                <span className="font-mono font-bold text-lg text-gray-900">
                  {formatCurrency(quotedPrice)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lifting Plan & Delivery (Project-level) */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-900">
              Lifting Plan & Delivery
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Lifting Plan */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Lifting Plan Required?</Label>
                <Select
                  value={liftingStatus}
                  onValueChange={(v) => { setLiftingStatus(v); }}
                  disabled={isLocked}
                >
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">Yes</SelectItem>
                    <SelectItem value="NO">No</SelectItem>
                    <SelectItem value="TBC">TBC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {parseFloat(liftingWeight) >= 250 && liftingStatus !== "YES" && (
                <div className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Lifting plan likely required — estimated weight ({liftingWeight}kg) exceeds 250kg threshold
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Est. Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={liftingWeight}
                    onChange={(e) => setLiftingWeight(e.target.value)}
                    onBlur={saveLiftingPlan}
                    disabled={isLocked}
                    placeholder="e.g. 350"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Lifting Plan Cost (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={liftingCost}
                    onChange={(e) => setLiftingCost(e.target.value)}
                    onBlur={saveLiftingPlan}
                    disabled={isLocked}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {(liftingStatus === "YES" || parseFloat(liftingWeight) >= 250) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Max Lift Height (m)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={liftingMaxHeight}
                      onChange={(e) => setLiftingMaxHeight(e.target.value)}
                      onBlur={saveLiftingPlan}
                      disabled={isLocked}
                      placeholder="e.g. 12.5"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Crane Required?</Label>
                    <Select
                      value={liftingCrane}
                      onValueChange={(v) => { setLiftingCrane(v); }}
                      disabled={isLocked}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YES">Yes</SelectItem>
                        <SelectItem value="NO">No</SelectItem>
                        <SelectItem value="TBC">TBC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {(liftingStatus === "YES" || parseFloat(liftingWeight) >= 250) && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Site Access Notes</Label>
                  <Textarea
                    value={liftingSiteAccess}
                    onChange={(e) => setLiftingSiteAccess(e.target.value)}
                    onBlur={saveLiftingPlan}
                    disabled={isLocked}
                    placeholder="e.g. restricted access, HIAB required..."
                    rows={2}
                    className="text-xs"
                  />
                </div>
              )}
            </div>

            {/* Right: Delivery Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Special Delivery Requirements</Label>
              <Textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                onBlur={saveLiftingPlan}
                disabled={isLocked}
                placeholder="e.g. restricted access, HIAB, specific delivery window..."
                rows={5}
                className="text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ITO Warning */}
      {hasItoLines && (
        <div className="flex items-center gap-2 text-orange-800 bg-orange-50 rounded-lg p-3 border border-orange-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-sm">
            This quote contains <strong>Innovate to Order</strong> items. Sales Director approval is required.
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-4">
          {approval === "DRAFT" && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                When ready, submit the quote for sales approval.
              </p>
              <Button
                onClick={() => setConfirmAction("submit")}
                className="gap-2"
                disabled={lines.length === 0}
              >
                <Send className="h-4 w-4" />
                Submit for Approval
              </Button>
            </div>
          )}

          {approval === "PENDING_APPROVAL" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg p-3 border border-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-sm">
                  {hasItoLines
                    ? "This quote contains Innovate to Order items and requires Sales Director approval."
                    : "This quote is pending sales approval. Review the pricing and approve or reject."}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Quotation Price:{" "}
                  <span className="font-mono font-bold text-gray-900">
                    {formatCurrency(quotedPrice)}
                  </span>
                </p>
                {hasItoLines && !canApproveIto ? (
                  <p className="text-sm text-orange-600 font-medium">
                    Awaiting Sales Director approval
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setConfirmAction("reject")}
                      className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => setConfirmAction("approve")}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve Quote
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {approval === "APPROVED" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3 border border-green-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="text-sm">
                  This quote has been approved. The opportunity has been moved to{" "}
                  <strong>Quoted</strong> status.
                </span>
              </div>

              {/* Mark as Sent */}
              {!quoteSentAt ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Sent to (email or name)"
                      value={quoteSentTo}
                      onChange={(e) => setQuoteSentTo(e.target.value)}
                      className="w-60 h-9 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMarkAsSent}
                    disabled={markingSent}
                    className="gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {markingSent ? "Marking..." : "Mark as Sent"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <Send className="h-4 w-4" />
                  Quote sent{quoteSentTo ? ` to ${quoteSentTo}` : ""} on{" "}
                  {new Date(quoteSentAt).toLocaleDateString("en-GB")}
                </div>
              )}
            </div>
          )}

          {approval === "REJECTED" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg p-3 border border-red-200">
                <XCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm">
                  This quote was rejected. You can revise it and resubmit.
                </span>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={async () => {
                    await fetch(
                      `/api/opportunities/${opportunity.id}/quote`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "reset" }),
                      }
                    )
                    // Reset locally by setting back to draft via the PATCH endpoint
                    const res = await fetch(
                      `/api/opportunities/${opportunity.id}`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ quoteApproval: "DRAFT" }),
                      }
                    )
                    if (res.ok) setApproval("DRAFT")
                  }}
                >
                  Revise Quote
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Builder Dialog */}
      <CrmProductBuilder
        opportunityId={opportunity.id}
        open={configureOpen}
        onOpenChange={(v) => {
          setConfigureOpen(v)
          if (!v) setEditingLine(null)
        }}
        onLineAdded={handleAddConfiguredLine}
        onLineUpdated={handleUpdateConfiguredLine}
        editingLine={editingLine}
        defaultClassification={configureClassification}
      />

      {/* Add Line Dialog */}
      <AddLineDialog
        open={addDialogOpen}
        onOpenChange={(v) => {
          setAddDialogOpen(v)
          if (!v) setEditManualLine(null)
        }}
        onConfirm={editManualLine ? handleUpdateManualLine : handleAddLine}
        editingLine={editManualLine}
      />

      {/* Confirm Action Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
        action={confirmAction}
        quotedPrice={quotedPrice}
        onSubmit={handleSubmit}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </>
  )
}

type BomProduct = {
  id: string
  stockCode: string
  name: string
  productFamily: string | null
  productGroup: string | null
  materialComposition: string | null
  itemSetType: string | null
  operationType: string | null
}

function AddLineDialog({
  open,
  onOpenChange,
  onConfirm,
  editingLine,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (data: {
    description: string
    type: string
    quantity: number
    unitCost: string
    classification?: string
  }) => void
  editingLine?: QuoteLine | null
}) {
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<BomProduct[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<BomProduct | null>(null)
  const [description, setDescription] = useState("")
  const [editQuantity, setEditQuantity] = useState("1")
  const [editUnitCost, setEditUnitCost] = useState("")
  const [editType, setEditType] = useState("PRODUCT")
  const [editClassification, setEditClassification] = useState("STANDARD")
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch BOM products on first open
  useEffect(() => {
    if (open && products.length === 0) {
      fetch("/api/bom-products")
        .then((r) => r.json())
        .then((data) => setProducts(data))
        .catch(() => {})
    }
  }, [open, products.length])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Pre-fill for edit mode or reset on close
  useEffect(() => {
    if (!open) {
      setSelectedProduct(null)
      setDescription("")
      setProductSearch("")
      setShowDropdown(false)
      setEditQuantity("1")
      setEditUnitCost("")
      setEditType("PRODUCT")
      setEditClassification("STANDARD")
    } else if (editingLine) {
      setDescription(editingLine.description)
      setEditQuantity(String(editingLine.quantity || 1))
      setEditUnitCost(String(Number(editingLine.unitCost) || ""))
      setEditType(editingLine.type || "PRODUCT")
      setEditClassification(editingLine.classification || "STANDARD")
    }
  }, [open, editingLine])

  const filteredProducts = products.filter((p) => {
    if (!productSearch) return true
    const q = productSearch.toLowerCase()
    return (
      p.stockCode.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.productFamily && p.productFamily.toLowerCase().includes(q))
    )
  })

  // Group by product family for dropdown
  const groupedProducts: Record<string, BomProduct[]> = {}
  for (const p of filteredProducts) {
    const key = p.productFamily || "Other"
    if (!groupedProducts[key]) groupedProducts[key] = []
    groupedProducts[key].push(p)
  }

  function selectProduct(product: BomProduct) {
    setSelectedProduct(product)
    setDescription(product.name)
    setProductSearch("")
    setShowDropdown(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    await onConfirm({
      description: description,
      type: editType,
      quantity: parseInt(editQuantity) || 1,
      unitCost: editUnitCost,
      classification: editClassification,
    })
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingLine ? "Edit Line Item" : "Add Line Item"}</DialogTitle>
          <DialogDescription>
            {editingLine ? "Modify the details below and save." : "Select a product from the BOM library or enter details manually."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product selector */}
          <div className="space-y-2" ref={dropdownRef}>
            <Label>Product (from BOM Library)</Label>
            <div className="relative">
              <Input
                placeholder="Search by code, name, or family..."
                value={selectedProduct ? `${selectedProduct.stockCode} — ${selectedProduct.name}` : productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value)
                  setSelectedProduct(null)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
              />
              {selectedProduct && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  onClick={() => {
                    setSelectedProduct(null)
                    setDescription("")
                    setProductSearch("")
                  }}
                >
                  Clear
                </button>
              )}
              {showDropdown && !selectedProduct && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-60 overflow-auto rounded-md border bg-white shadow-lg">
                  {Object.keys(groupedProducts).length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-400">
                      {products.length === 0 ? "Loading products..." : "No products match"}
                    </div>
                  ) : (
                    Object.entries(groupedProducts).map(([family, items]) => (
                      <div key={family}>
                        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 sticky top-0">
                          {family}
                        </div>
                        {items.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2"
                            onClick={() => selectProduct(p)}
                          >
                            <span className="font-mono text-xs text-gray-500 shrink-0 w-32">{p.stockCode}</span>
                            <span className="text-sm truncate">{p.name}</span>
                            {p.materialComposition && (
                              <span className="text-[10px] text-gray-400 shrink-0 ml-auto">{p.materialComposition}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedProduct && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-mono">{selectedProduct.stockCode}</span>
                {selectedProduct.itemSetType && <span>| {selectedProduct.itemSetType}</span>}
                {selectedProduct.operationType && <span>| {selectedProduct.operationType}</span>}
                {selectedProduct.materialComposition && <span>| {selectedProduct.materialComposition}</span>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="al-type">Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCT">Product</SelectItem>
                  <SelectItem value="ACTIVITY">Activity</SelectItem>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="al-classification">Classification</Label>
              <Select value={editClassification} onValueChange={setEditClassification}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">Standard</SelectItem>
                  <SelectItem value="INNOVATE_TO_ORDER">Innovate to Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="al-description">Description *</Label>
            <Input
              id="al-description"
              required
              placeholder="e.g. Double Flood Door"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="al-quantity">Quantity</Label>
              <Input
                id="al-quantity"
                type="number"
                min="1"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="al-unitCost">Unit Cost (£) *</Label>
              <Input
                id="al-unitCost"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={editUnitCost}
                onChange={(e) => setEditUnitCost(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editingLine ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDialog({
  open,
  onOpenChange,
  action,
  quotedPrice,
  onSubmit,
  onApprove,
  onReject,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: string | null
  quotedPrice: number
  onSubmit: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const [processing, setProcessing] = useState(false)

  async function handleConfirm() {
    setProcessing(true)
    if (action === "submit") await onSubmit()
    if (action === "approve") await onApprove()
    if (action === "reject") await onReject()
    setProcessing(false)
  }

  const config: Record<
    string,
    { title: string; description: string; confirmLabel: string; variant: string }
  > = {
    submit: {
      title: "Submit for Approval",
      description: `Submit this quote at ${formatCurrency(quotedPrice)} for sales approval? The quote will be locked until approved or rejected.`,
      confirmLabel: "Submit",
      variant: "default",
    },
    approve: {
      title: "Approve Quote",
      description: `Approve this quote at ${formatCurrency(quotedPrice)}? The opportunity will be moved to Quoted status.`,
      confirmLabel: "Approve",
      variant: "green",
    },
    reject: {
      title: "Reject Quote",
      description:
        "Reject this quote? The sales team will be able to revise and resubmit.",
      confirmLabel: "Reject",
      variant: "red",
    },
  }

  const c = action ? config[action] : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{c?.title}</DialogTitle>
          <DialogDescription>{c?.description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={processing}
            className={cn(
              c?.variant === "green" && "bg-green-600 hover:bg-green-700",
              c?.variant === "red" &&
                "bg-red-600 hover:bg-red-700"
            )}
          >
            {processing ? "Processing..." : c?.confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
