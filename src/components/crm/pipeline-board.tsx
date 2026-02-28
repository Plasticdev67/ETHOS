"use client"

import { useState, memo } from "react"
import Link from "next/link"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  formatCurrency,
  formatDate,
  getOpportunityStatusColor,
  cn,
} from "@/lib/utils"
import {
  ArrowRight,
  FileText,
  CheckCircle2,
  XCircle,
  Rocket,
  PenTool,
  Package,
  ChevronRight,
  ChevronLeft,
  Skull,
  RotateCcw,
  Send,
} from "lucide-react"

const cardStatusColor: Record<string, string> = {
  DEAD_LEAD: "border-l-gray-400 bg-gray-50/30",
  ACTIVE_LEAD: "border-l-blue-400 bg-blue-50/30",
  PENDING_APPROVAL: "border-l-orange-400 bg-orange-50/30",
  QUOTED: "border-l-amber-400 bg-amber-50/30",
  WON: "border-l-green-400 bg-green-50/30",
  LOST: "border-l-red-400 bg-red-50/30",
}

type QuoteLine = {
  id: string
  description: string
  quantity: number
  totalCost: string | number | null
  classification: string | null
  width: number | null
  height: number | null
}

type PipelineOpp = {
  id: string
  name: string
  status: string
  estimatedValue: string | number | null
  contactPerson: string | null
  expectedCloseDate: string | null
  notes: string | null
  quotedPrice: string | number | null
  quoteApproval: string | null
  quoteNumber: string | null
  quoteSentAt: string | null
  quoteSentTo: string | null
  hasEtoLines: boolean | null
  deadReason: string | null
  deadAt: string | null
  revivedAt: string | null
  createdAt: string | null
  prospect: { id: string; companyName: string }
  convertedProject: { id: string; projectNumber: string } | null
  quoteLines: QuoteLine[]
  _count: { quoteLines: number }
}

const DEAD_REASONS = [
  "No budget",
  "Went with competitor",
  "Project cancelled",
  "No response",
  "Not a fit",
  "Other",
] as const

const STATUS_COLUMNS = [
  { id: "ACTIVE_LEAD", label: "Active Lead", borderColor: "border-t-blue-400" },
  { id: "PENDING_APPROVAL", label: "Pending Approval", borderColor: "border-t-orange-400" },
  { id: "QUOTED", label: "Quoted", borderColor: "border-t-amber-400" },
  { id: "WON", label: "Won", borderColor: "border-t-green-400" },
  { id: "LOST", label: "Lost", borderColor: "border-t-red-400" },
] as const

function groupByStatus(opps: PipelineOpp[]) {
  const grouped: Record<string, PipelineOpp[]> = { DEAD_LEAD: [] }
  for (const col of STATUS_COLUMNS) {
    grouped[col.id] = []
  }
  for (const opp of opps) {
    if (grouped[opp.status]) {
      grouped[opp.status].push(opp)
    }
  }
  return grouped
}

function getColumnTotal(opps: PipelineOpp[]) {
  return opps.reduce(
    (sum, o) => sum + (o.estimatedValue ? parseFloat(String(o.estimatedValue)) : 0),
    0
  )
}

// ─── Dead Reason Dialog ────────────────────────────────────────────────────────

function DeadReasonDialog({
  opportunity,
  open,
  onOpenChange,
  onConfirm,
}: {
  opportunity: PipelineOpp
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState("")
  const [customReason, setCustomReason] = useState("")
  const [saving, setSaving] = useState(false)

  function handleConfirm() {
    const finalReason = reason === "Other" ? customReason : reason
    if (!finalReason) return
    setSaving(true)
    onConfirm(finalReason)
    setSaving(false)
    setReason("")
    setCustomReason("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Skull className="h-5 w-5 text-gray-500" />
            Close Lead
          </DialogTitle>
          <DialogDescription>
            Why is this lead being closed?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-gray-50 p-3 mb-2">
          <div className="text-sm font-medium text-gray-900">{opportunity.name}</div>
          <div className="text-xs text-gray-500">{opportunity.prospect.companyName}</div>
        </div>

        <div className="space-y-3">
          <Label>Reason for closing this lead</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger>
              <SelectValue placeholder="Select a reason..." />
            </SelectTrigger>
            <SelectContent>
              {DEAD_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {reason === "Other" && (
            <Textarea
              placeholder="Please specify..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={2}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving || !reason || (reason === "Other" && !customReason)}
            variant="destructive"
          >
            {saving ? "Saving..." : "Close Lead"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Quote Gateway Dialog ──────────────────────────────────────────────────────

function QuoteGatewayDialog({
  opportunity,
  open,
  onOpenChange,
  onConfirm,
}: {
  opportunity: PipelineOpp
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (data: {
    estimatedValue: string
    contactPerson: string
    expectedCloseDate: string
    notes: string
  }) => void
}) {
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData(e.currentTarget)
    onConfirm({
      estimatedValue: formData.get("estimatedValue") as string,
      contactPerson: formData.get("contactPerson") as string,
      expectedCloseDate: formData.get("expectedCloseDate") as string,
      notes: formData.get("notes") as string,
    })
    setSaving(false)
  }

  const existingDate = opportunity.expectedCloseDate
    ? new Date(opportunity.expectedCloseDate).toISOString().split("T")[0]
    : ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Move to Quoted
          </DialogTitle>
          <DialogDescription>
            <span className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className={getOpportunityStatusColor("ACTIVE_LEAD")}>
                Active Lead
              </Badge>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <Badge variant="secondary" className={getOpportunityStatusColor("QUOTED")}>
                Quoted
              </Badge>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-gray-50 p-3 mb-2">
          <div className="text-sm font-medium text-gray-900">{opportunity.name}</div>
          <div className="text-xs text-gray-500">{opportunity.prospect.companyName}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gw-estimatedValue">Quoted Price (&pound;) *</Label>
            <Input
              id="gw-estimatedValue"
              name="estimatedValue"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="e.g. 25000.00"
              defaultValue={
                opportunity.estimatedValue
                  ? parseFloat(String(opportunity.estimatedValue))
                  : ""
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gw-contactPerson">Contact Person</Label>
              <Input
                id="gw-contactPerson"
                name="contactPerson"
                placeholder="e.g. John Smith"
                defaultValue={opportunity.contactPerson || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gw-expectedCloseDate">Expected Close Date</Label>
              <Input
                id="gw-expectedCloseDate"
                name="expectedCloseDate"
                type="date"
                defaultValue={existingDate}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gw-notes">Quote Notes</Label>
            <Textarea
              id="gw-notes"
              name="notes"
              placeholder="Any details about the quote..."
              rows={3}
              defaultValue={opportunity.notes || ""}
            />
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
              {saving ? "Saving..." : "Confirm & Move to Quoted"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Opportunity Card ──────────────────────────────────────────────────────────

const OpportunityCard = memo(function OpportunityCard({
  opp,
  onApproveQuote,
  onRejectQuote,
  onConvertToProject,
}: {
  opp: PipelineOpp
  onApproveQuote: (id: string) => void
  onRejectQuote: (id: string) => void
  onConvertToProject: (id: string) => void
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 p-3 shadow-sm hover:shadow-md transition-all",
        opp.quoteApproval === "REJECTED"
          ? "border-red-400 border-l-red-500 bg-red-50 ring-1 ring-red-200"
          : cn("border-border", cardStatusColor[opp.status] || "border-l-gray-300 bg-white")
      )}
    >
      <Link
        href={`/crm/quote/${opp.id}`}
        className="block cursor-pointer"
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {opp.name}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-600">
              {opp.prospect.companyName}
            </div>
            {opp.hasEtoLines && (
              <div className="mt-1">
                <Badge className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 shadow-sm">
                  ENGINEER TO ORDER
                </Badge>
              </div>
            )}
          </div>
        </div>

        {opp.estimatedValue && (
          <div className="text-sm font-mono font-medium text-gray-900 mt-1">
            {formatCurrency(parseFloat(String(opp.estimatedValue)))}
          </div>
        )}

        {/* Quote number & sent indicator */}
        {(opp.quoteNumber || opp.quoteSentAt) && (
          <div className="flex items-center gap-2 mt-1">
            {opp.quoteNumber && (
              <span className="text-[10px] font-mono text-blue-600">{opp.quoteNumber}</span>
            )}
            {opp.quoteSentAt && (
              <Badge variant="secondary" className="bg-green-50 text-green-600 text-[9px] px-1.5 py-0 h-4">
                <Send className="h-2.5 w-2.5 mr-0.5" />
                Sent
              </Badge>
            )}
          </div>
        )}

        {/* Dead lead info */}
        {opp.status === "DEAD_LEAD" && opp.deadReason && (
          <div className="mt-1.5 text-[10px] text-gray-500">
            <span className="font-medium text-gray-600">Reason:</span> {opp.deadReason}
            {opp.deadAt && (
              <div className="text-gray-400">Closed: {formatDate(opp.deadAt)}</div>
            )}
          </div>
        )}

        {opp.status !== "DEAD_LEAD" && (
          <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
            <span>{opp.contactPerson || "tbc"}</span>
            <span>{formatDate(opp.expectedCloseDate)}</span>
          </div>
        )}

        {opp.quoteLines.length > 0 && (
          <div className="mt-2 pt-1.5 border-t border-border/60 space-y-1">
            {opp.quoteLines.slice(0, 3).map((line) => (
              <div key={line.id} className="flex items-center gap-1.5">
                {line.classification === "ENGINEER_TO_ORDER" ? (
                  <span className="inline-flex items-center justify-center rounded bg-orange-500 text-white text-[8px] font-bold px-1 py-0.5 leading-none shrink-0">
                    ETO
                  </span>
                ) : (
                  <Package className="h-3 w-3 text-gray-400 shrink-0" />
                )}
                <span className={cn(
                  "text-[10px] truncate flex-1",
                  line.classification === "ENGINEER_TO_ORDER" ? "text-orange-700 font-medium" : "text-gray-600"
                )}>
                  {line.description}
                </span>
                <span className="text-[9px] text-gray-400 shrink-0">
                  x{line.quantity}
                </span>
                {line.totalCost && (
                  <span className="text-[9px] font-mono text-gray-400 shrink-0">
                    {formatCurrency(Number(line.totalCost))}
                  </span>
                )}
              </div>
            ))}
            {opp.quoteLines.length > 3 && (
              <div className="text-[9px] text-gray-400 pl-4.5">
                +{opp.quoteLines.length - 3} more
              </div>
            )}
          </div>
        )}

        {opp.convertedProject && (
          <div className="mt-1.5 pt-1.5 border-t border-border">
            <span className="text-xs font-mono text-blue-600">
              Project #{opp.convertedProject.projectNumber}
            </span>
          </div>
        )}
      </Link>

      {opp.status === "ACTIVE_LEAD" && (
        <div className="mt-2 pt-2 border-t border-border">
          <Link
            href={`/crm/quote/${opp.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            Ready for Quote
          </Link>
        </div>
      )}

      {opp.status === "DEAD_LEAD" && (
        <div className="mt-2 pt-2 border-t border-border/60">
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <RotateCcw className="h-3 w-3" />
            Drag to revive
          </div>
        </div>
      )}

      {opp.status === "PENDING_APPROVAL" && (
        <div className={cn("mt-2 pt-2 border-t space-y-2", opp.quoteApproval === "REJECTED" ? "border-red-200" : "border-border")}>
          {opp.quoteApproval === "REJECTED" && (
            <div className="flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-600">Rejected by Sales Director</span>
            </div>
          )}
          {opp.quotedPrice && (
            <div className="text-xs text-gray-500">
              Quoted: <span className="font-mono font-semibold text-gray-900">{formatCurrency(Number(opp.quotedPrice))}</span>
            </div>
          )}
          {opp.hasEtoLines && opp.quoteApproval !== "REJECTED" && (
            <div className="text-[10px] text-orange-600 font-medium">
              Requires Director Approval (ETO)
            </div>
          )}
          <div className="flex items-center gap-2">
            {opp.quoteApproval !== "REJECTED" && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    onApproveQuote(opp.id)
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    onRejectQuote(opp.id)
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
              </>
            )}
            <Link
              href={`/crm/quote/${opp.id}`}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium transition-colors",
                opp.quoteApproval === "REJECTED"
                  ? "text-red-600 hover:text-red-700"
                  : "text-gray-500 hover:text-gray-700 ml-auto"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              {opp.quoteApproval === "REJECTED" ? "Revise Quote" : "View"}
            </Link>
          </div>
        </div>
      )}

      {opp.status === "WON" && !opp.convertedProject && (
        <div className="mt-2 pt-2 border-t border-green-200">
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onConvertToProject(opp.id)
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Rocket className="h-4 w-4" />
            Hand Over to Design Department
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-1">
            Creates project &amp; sends to design board
          </p>
        </div>
      )}

      {opp.status === "WON" && opp.convertedProject && (
        <div className="mt-2 pt-2 border-t border-green-200 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Handed over — Project #{opp.convertedProject.projectNumber}
          </div>
          <Link
            href="/design"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <PenTool className="h-3.5 w-3.5" />
            View in Design Board
          </Link>
        </div>
      )}
    </div>
  )
})

// ─── Dead Lead Collapsible Column ──────────────────────────────────────────────

function DeadLeadColumn({
  opps,
  expanded,
  onToggle,
  onApproveQuote,
  onRejectQuote,
  onConvertToProject,
}: {
  opps: PipelineOpp[]
  expanded: boolean
  onToggle: () => void
  onApproveQuote: (id: string) => void
  onRejectQuote: (id: string) => void
  onConvertToProject: (id: string) => void
}) {
  if (!expanded) {
    // Collapsed: slim vertical tab
    return (
      <Droppable droppableId="DEAD_LEAD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex flex-col items-center rounded-lg border border-border border-t-4 border-t-gray-400 shrink-0 cursor-pointer transition-all",
              snapshot.isDraggingOver
                ? "bg-gray-200/70 ring-2 ring-gray-400 min-w-[80px]"
                : "bg-gray-100/50 min-w-[48px] hover:bg-gray-100"
            )}
            onClick={onToggle}
          >
            <div className="flex flex-col items-center gap-2 py-3 px-1">
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <Skull className="h-4 w-4 text-gray-400" />
              <span className="text-[10px] font-semibold text-gray-500 [writing-mode:vertical-lr] rotate-180">
                Dead Leads
              </span>
              <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-gray-300 px-1.5 text-[10px] font-semibold text-gray-600">
                {opps.length}
              </span>
            </div>
            <div className="min-h-[40px]">{provided.placeholder}</div>
          </div>
        )}
      </Droppable>
    )
  }

  // Expanded: full column
  return (
    <Droppable droppableId="DEAD_LEAD">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn(
            "flex flex-col rounded-lg border border-border border-t-4 border-t-gray-400 min-w-[300px] max-w-[340px] shrink-0",
            snapshot.isDraggingOver ? "bg-gray-200/50" : "bg-gray-50/50"
          )}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <div className="flex items-center gap-2">
              <button
                onClick={onToggle}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-300">
                <Skull className="h-3 w-3 mr-1" />
                Dead Leads
              </Badge>
              <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-gray-300 px-1.5 text-[10px] font-semibold text-gray-600">
                {opps.length}
              </span>
            </div>
          </div>

          {/* Cards */}
          <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[80px]">
            {opps.map((opp, index) => (
              <Draggable key={opp.id} draggableId={opp.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={dragSnapshot.isDragging ? "opacity-90 rotate-1" : ""}
                  >
                    <OpportunityCard
                      opp={opp}
                      onApproveQuote={onApproveQuote}
                      onRejectQuote={onRejectQuote}
                      onConvertToProject={onConvertToProject}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {opps.length === 0 && !snapshot.isDraggingOver && (
              <div className="py-6 text-center text-xs text-gray-400">
                No dead leads
              </div>
            )}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  )
}

// ─── Pipeline Board (Main Export) ──────────────────────────────────────────────

export function PipelineBoard({ initialOpportunities }: { initialOpportunities: PipelineOpp[] }) {
  const [opportunities, setOpportunities] = useState(initialOpportunities)
  const [gatewayOpp, setGatewayOpp] = useState<PipelineOpp | null>(null)

  const [gatewayOpen, setGatewayOpen] = useState(false)
  const [deadReasonOpp, setDeadReasonOpp] = useState<PipelineOpp | null>(null)
  const [deadReasonOpen, setDeadReasonOpen] = useState(false)
  const [deadLeadExpanded, setDeadLeadExpanded] = useState(false)

  const grouped = groupByStatus(opportunities)

  // Auto-expand dead lead column if there are dead leads
  const deadCount = grouped["DEAD_LEAD"]?.length || 0

  async function persistStatusChange(oppId: string, newStatus: string, extraData?: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/opportunities/${oppId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extraData }),
      })
      if (!res.ok) {
        const original = initialOpportunities.find((o) => o.id === oppId)
        if (original) {
          setOpportunities((prev) =>
            prev.map((o) => (o.id === oppId ? { ...o, status: original.status } : o))
          )
        }
      }
    } catch {
      const original = initialOpportunities.find((o) => o.id === oppId)
      if (original) {
        setOpportunities((prev) =>
          prev.map((o) => (o.id === oppId ? { ...o, status: original.status } : o))
        )
      }
    }
  }

  function handleDragEnd(result: DropResult) {
    const { draggableId, destination, source } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatus = destination.droppableId
    const oldStatus = source.droppableId

    // Moving TO Dead Lead — prompt for reason
    if (newStatus === "DEAD_LEAD" && oldStatus !== "DEAD_LEAD") {
      const opp = opportunities.find((o) => o.id === draggableId)
      if (opp) {
        setDeadReasonOpp(opp)
        setDeadReasonOpen(true)
      }
      return
    }

    // Moving FROM Dead Lead — revival
    if (oldStatus === "DEAD_LEAD" && newStatus !== "DEAD_LEAD") {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === draggableId ? { ...o, status: newStatus, deadReason: null } : o))
      )
      persistStatusChange(draggableId, newStatus, {
        deadReason: null,
        revivedAt: new Date().toISOString(),
        revivedFrom: "DEAD_LEAD",
      })
      return
    }

    // Gateway: Any move out of Active Lead to non-dead requires quoting first
    if (oldStatus === "ACTIVE_LEAD" && newStatus !== "ACTIVE_LEAD" && newStatus !== "DEAD_LEAD") {
      const opp = opportunities.find((o) => o.id === draggableId)
      if (opp) {
        setGatewayOpp(opp)
        setGatewayOpen(true)
      }
      return
    }

    // All other transitions: move immediately
    setOpportunities((prev) =>
      prev.map((o) => (o.id === draggableId ? { ...o, status: newStatus } : o))
    )
    persistStatusChange(draggableId, newStatus)
  }

  function handleDeadReasonConfirm(reason: string) {
    if (!deadReasonOpp) return

    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === deadReasonOpp.id
          ? { ...o, status: "DEAD_LEAD", deadReason: reason, deadAt: new Date().toISOString() }
          : o
      )
    )

    persistStatusChange(deadReasonOpp.id, "DEAD_LEAD", {
      deadReason: reason,
      deadAt: new Date().toISOString(),
    })

    setDeadReasonOpen(false)
    setDeadReasonOpp(null)
    // Auto-expand dead lead column when a lead dies
    setDeadLeadExpanded(true)
  }

  function handleGatewayConfirm(data: {
    estimatedValue: string
    contactPerson: string
    expectedCloseDate: string
    notes: string
  }) {
    if (!gatewayOpp) return

    const updateData: Record<string, unknown> = {}
    if (data.estimatedValue) updateData.estimatedValue = data.estimatedValue
    if (data.contactPerson) updateData.contactPerson = data.contactPerson
    if (data.expectedCloseDate) updateData.expectedCloseDate = data.expectedCloseDate
    if (data.notes) updateData.notes = data.notes

    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === gatewayOpp.id
          ? {
              ...o,
              status: "QUOTED",
              estimatedValue: data.estimatedValue || o.estimatedValue,
              contactPerson: data.contactPerson || o.contactPerson,
              expectedCloseDate: data.expectedCloseDate || o.expectedCloseDate,
              notes: data.notes || o.notes,
            }
          : o
      )
    )

    persistStatusChange(gatewayOpp.id, "QUOTED", updateData)
    setGatewayOpen(false)
    setGatewayOpp(null)
  }

  function handleGatewayCancel() {
    setGatewayOpen(false)
    setGatewayOpp(null)
  }

  async function handleApproveQuote(oppId: string) {
    setOpportunities((prev) =>
      prev.map((o) => (o.id === oppId ? { ...o, status: "QUOTED" } : o))
    )
    try {
      const res = await fetch(`/api/opportunities/${oppId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      })
      if (!res.ok) {
        setOpportunities((prev) =>
          prev.map((o) => (o.id === oppId ? { ...o, status: "PENDING_APPROVAL" } : o))
        )
        if (res.status === 403) {
          const err = await res.json()
          alert(err.error || "You do not have permission to approve this quote")
        }
      }
    } catch {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === oppId ? { ...o, status: "PENDING_APPROVAL" } : o))
      )
    }
  }

  async function handleRejectQuote(oppId: string) {
    setOpportunities((prev) =>
      prev.map((o) => (o.id === oppId ? { ...o, status: "PENDING_APPROVAL", quoteApproval: "REJECTED" } : o))
    )
    try {
      const res = await fetch(`/api/opportunities/${oppId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      })
      if (!res.ok) {
        setOpportunities((prev) =>
          prev.map((o) => (o.id === oppId ? { ...o, quoteApproval: "PENDING_APPROVAL" } : o))
        )
      }
    } catch {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === oppId ? { ...o, quoteApproval: "PENDING_APPROVAL" } : o))
      )
    }
  }

  async function handleConvertToProject(oppId: string) {
    try {
      const res = await fetch(`/api/opportunities/${oppId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (res.ok) {
        const data = await res.json()
        setOpportunities((prev) =>
          prev.map((o) =>
            o.id === oppId
              ? { ...o, convertedProject: { id: data.projectId, projectNumber: data.projectNumber } }
              : o
          )
        )
      }
    } catch {
      // silently fail — user can retry
    }
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {/* Dead Lead Column (leftmost, collapsible) */}
          <DeadLeadColumn
            opps={grouped["DEAD_LEAD"] || []}
            expanded={deadLeadExpanded}
            onToggle={() => setDeadLeadExpanded((v) => !v)}
            onApproveQuote={handleApproveQuote}
            onRejectQuote={handleRejectQuote}
            onConvertToProject={handleConvertToProject}
          />

          {/* Active pipeline columns */}
          {STATUS_COLUMNS.map((col) => {
            const colOpps = grouped[col.id]
            const total = getColumnTotal(colOpps)

            return (
              <Droppable key={col.id} droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col rounded-lg border border-border ${col.borderColor} border-t-4 min-w-[300px] max-w-[340px] shrink-0 ${
                      snapshot.isDraggingOver ? "bg-blue-50/50" : "bg-gray-50/50"
                    }`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={getOpportunityStatusColor(col.id)}
                        >
                          {col.label}
                        </Badge>
                        <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-gray-200 px-1.5 text-[10px] font-semibold text-gray-600">
                          {colOpps.length}
                        </span>
                      </div>
                      {total > 0 && (
                        <span className="text-xs font-mono text-gray-500">
                          {formatCurrency(total)}
                        </span>
                      )}
                    </div>

                    {/* Cards */}
                    <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[80px]">
                      {colOpps.map((opp, index) => (
                        <Draggable key={opp.id} draggableId={opp.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={dragSnapshot.isDragging ? "opacity-90 rotate-1" : ""}
                            >
                              <OpportunityCard
                                opp={opp}
                                onApproveQuote={handleApproveQuote}
                                onRejectQuote={handleRejectQuote}
                                onConvertToProject={handleConvertToProject}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {colOpps.length === 0 && !snapshot.isDraggingOver && (
                        <div className="py-6 text-center text-xs text-gray-400">
                          No opportunities
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            )
          })}
        </div>
      </DragDropContext>

      {/* Dead Reason Dialog */}
      {deadReasonOpp && (
        <DeadReasonDialog
          opportunity={deadReasonOpp}
          open={deadReasonOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDeadReasonOpen(false)
              setDeadReasonOpp(null)
            }
          }}
          onConfirm={handleDeadReasonConfirm}
        />
      )}

      {/* Quote Gateway Dialog */}
      {gatewayOpp && (
        <QuoteGatewayDialog
          opportunity={gatewayOpp}
          open={gatewayOpen}
          onOpenChange={(open) => {
            if (!open) handleGatewayCancel()
          }}
          onConfirm={handleGatewayConfirm}
        />
      )}
    </>
  )
}
