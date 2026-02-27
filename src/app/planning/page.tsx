"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CalendarRange,
  Plus,
  Trash2,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Loader2,
  Database,
  FileText,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import type { AtpResult } from "@/lib/planning-utils"

type OrderLine = {
  id: string
  description: string
  quantity: number
  estimatedHours: number
  source: "manual" | "bom"
}

type OpportunityLine = {
  id: string
  description: string
  quantity: number
  classification: string
  variantName: string | null
  variantCode: string | null
  stockCode: string | null
  bomHours: number | null
  width: number | null
  height: number | null
}

type Opportunity = {
  id: string
  name: string
  customerName: string
  status: string
  estimatedValue: number | null
  expectedCloseDate: string | null
  lines: OpportunityLine[]
}

type SystemState = {
  designQueue: { count: number; estimatedHoursTotal: number; avgCompletedHours: number }
  productionQueues: Record<string, { count: number; estimatedMinsTotal: number }>
  capacities: Record<string, { hoursPerWeek: number; headcount: number }>
  installationBacklog: number
  activeProjects: number
}

function newLine(): OrderLine {
  return { id: crypto.randomUUID(), description: "", quantity: 1, estimatedHours: 8, source: "manual" }
}

export default function AtpCalculatorPage() {
  const [lines, setLines] = useState<OrderLine[]>([newLine()])
  const [requestedDate, setRequestedDate] = useState("")
  const [result, setResult] = useState<AtpResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [systemState, setSystemState] = useState<SystemState | null>(null)

  // Opportunity state
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [selectedOpp, setSelectedOpp] = useState<string>("manual")
  const [loadingOpps, setLoadingOpps] = useState(false)

  // Fetch system state on mount
  useEffect(() => {
    fetch("/api/planning/system-state")
      .then(r => r.json())
      .then(setSystemState)
      .catch(() => {})
  }, [])

  // Fetch CRM opportunities
  useEffect(() => {
    setLoadingOpps(true)
    fetch("/api/planning/atp/opportunities")
      .then(r => r.json())
      .then(data => setOpportunities(data.opportunities || []))
      .catch(() => {})
      .finally(() => setLoadingOpps(false))
  }, [])

  // When an opportunity is selected, populate lines from its quote lines
  function handleOppSelect(oppId: string) {
    setSelectedOpp(oppId)
    setResult(null)

    if (oppId === "manual") {
      setLines([newLine()])
      return
    }

    const opp = opportunities.find(o => o.id === oppId)
    if (!opp || !opp.lines.length) {
      setLines([newLine()])
      return
    }

    const newLines: OrderLine[] = opp.lines.map(ql => ({
      id: crypto.randomUUID(),
      description: ql.description + (ql.variantName ? ` (${ql.variantCode})` : ""),
      quantity: ql.quantity,
      estimatedHours: ql.bomHours || 8, // Fall back to 8h default if no BOM data
      source: ql.bomHours ? "bom" : "manual",
    }))

    setLines(newLines)
    if (opp.expectedCloseDate) {
      // Don't override user-set date
    }
  }

  function addLine() {
    setLines(prev => [...prev, newLine()])
  }

  function removeLine(id: string) {
    setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev)
  }

  function updateLine(id: string, field: keyof OrderLine, value: string | number) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value, source: field === "estimatedHours" ? "manual" : l.source } : l))
  }

  async function calculate() {
    const validLines = lines.filter(l => l.description.trim())
    if (!validLines.length) return
    setLoading(true)
    try {
      const res = await fetch("/api/planning/atp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: validLines.map(l => ({
            description: l.description,
            quantity: l.quantity,
            estimatedHours: l.estimatedHours,
          })),
          requestedDate: requestedDate || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
      }
    } finally {
      setLoading(false)
    }
  }

  const selectedOppData = opportunities.find(o => o.id === selectedOpp)
  const totalProducts = lines.reduce((s, l) => s + l.quantity, 0)
  const totalHours = lines.reduce((s, l) => s + l.estimatedHours * l.quantity, 0)
  const bomLinkedCount = lines.filter(l => l.source === "bom").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <CalendarRange className="h-6 w-6 text-blue-600" />
            Available-to-Promise Calculator
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Calculate the earliest delivery date for a potential order based on current system load
          </p>
        </div>
      </div>

      {/* System Health Strip */}
      {systemState && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-gray-500">Active Projects</div>
              <div className="text-xl font-semibold">{systemState.activeProjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-gray-500">Design Queue</div>
              <div className="text-xl font-semibold">{systemState.designQueue.count}
                <span className="text-xs font-normal text-gray-400 ml-1">cards</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-gray-500">Production Tasks</div>
              <div className="text-xl font-semibold">
                {Object.values(systemState.productionQueues).reduce((s, q) => s + q.count, 0)}
                <span className="text-xs font-normal text-gray-400 ml-1">pending</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-gray-500">Install Backlog</div>
              <div className="text-xl font-semibold">{systemState.installationBacklog}
                <span className="text-xs font-normal text-gray-400 ml-1">jobs</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content: Two Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Panel — Order Configuration */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Order Configuration</h2>

              {/* Opportunity Selector */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase">Source</label>
                <Select value={selectedOpp} onValueChange={handleOppSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select source..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-gray-400" />
                        Manual Entry
                      </div>
                    </SelectItem>
                    {loadingOpps ? (
                      <SelectItem value="_loading" disabled>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Loading opportunities...
                        </div>
                      </SelectItem>
                    ) : (
                      opportunities.map(opp => (
                        <SelectItem key={opp.id} value={opp.id}>
                          <div className="flex items-center gap-2">
                            <Database className="h-3.5 w-3.5 text-blue-500" />
                            <span className="font-medium">{opp.name}</span>
                            <span className="text-gray-400 text-xs">({opp.customerName})</span>
                            <Badge className={cn(
                              "text-[9px] px-1 py-0 ml-1",
                              opp.status === "PENDING_APPROVAL" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                            )}>
                              {opp.status === "PENDING_APPROVAL" ? "Pending" : "Won"}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedOppData && (
                  <div className="text-[10px] text-gray-400 mt-1">
                    {selectedOppData.customerName}
                    {selectedOppData.estimatedValue && ` — Est. value: £${selectedOppData.estimatedValue.toLocaleString()}`}
                    {selectedOppData.lines.length > 0 && ` — ${selectedOppData.lines.length} product(s)`}
                  </div>
                )}
              </div>

              {/* Product Lines */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-gray-500">PRODUCTS</div>
                  {bomLinkedCount > 0 && (
                    <Badge className="bg-blue-50 text-blue-600 text-[9px] px-1.5 py-0">
                      <Database className="h-2.5 w-2.5 mr-1" />
                      {bomLinkedCount} from BOM
                    </Badge>
                  )}
                </div>
                {lines.map((line, i) => (
                  <div key={line.id} className={cn(
                    "flex items-start gap-2 p-3 rounded-lg border",
                    line.source === "bom" ? "bg-blue-50/50 border-blue-200" : "bg-gray-50 border-border"
                  )}>
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder={`Product ${i + 1} description`}
                        value={line.description}
                        onChange={e => updateLine(line.id, "description", e.target.value)}
                        className="text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase">Qty</label>
                          <Input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={e => updateLine(line.id, "quantity", parseInt(e.target.value) || 1)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase flex items-center gap-1">
                            Est. Hours / unit
                            {line.source === "bom" && (
                              <span className="text-blue-500 font-normal">(BOM)</span>
                            )}
                          </label>
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            value={line.estimatedHours}
                            onChange={e => updateLine(line.id, "estimatedHours", parseFloat(e.target.value) || 0)}
                            className={cn("text-sm", line.source === "bom" && "border-blue-200")}
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeLine(line.id)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors mt-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addLine} className="w-full">
                  <Plus className="h-4 w-4 mr-1" /> Add Product
                </Button>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-border">
                <span>{totalProducts} product(s)</span>
                <span>{totalHours.toFixed(1)} total est. hours</span>
              </div>

              {/* Requested Date */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase">Client Requested Date (optional)</label>
                <Input
                  type="date"
                  value={requestedDate}
                  onChange={e => setRequestedDate(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Calculate Button */}
              <Button
                onClick={calculate}
                disabled={loading || !lines.some(l => l.description.trim())}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Calculating...</>
                ) : (
                  <><Calculator className="h-4 w-4 mr-2" /> Calculate ATP</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel — ATP Result */}
        <div className="lg:col-span-3 space-y-4">
          {!result && !loading && (
            <Card>
              <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                <CalendarRange className="h-12 w-12 text-gray-200 mb-3" />
                <h3 className="text-sm font-medium text-gray-400">No ATP calculated yet</h3>
                <p className="text-xs text-gray-300 mt-1">
                  Select a CRM opportunity or add products manually, then click &ldquo;Calculate ATP&rdquo;
                </p>
              </CardContent>
            </Card>
          )}

          {result && (
            <>
              {/* Summary Card */}
              <Card className="border-t-4 border-t-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-medium">Earliest Delivery</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        {formatDate(result.earliestDeliveryDate)}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {result.totalWeeks} weeks from today
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 uppercase font-medium">Confidence</div>
                      <div className={cn(
                        "text-2xl font-bold mt-1",
                        result.confidence >= 80 ? "text-green-600" :
                        result.confidence >= 60 ? "text-amber-600" : "text-red-600"
                      )}>
                        {result.confidence}%
                      </div>
                      <div className="w-24 h-2 bg-gray-200 rounded-full mt-1.5 ml-auto">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            result.confidence >= 80 ? "bg-green-500" :
                            result.confidence >= 60 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${result.confidence}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {result.requestedDateFeasible !== undefined && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                      {result.requestedDateFeasible ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-700 font-medium">
                            Client date achievable
                            {result.requestedDateGap && result.requestedDateGap > 0 &&
                              ` (${result.requestedDateGap} weeks margin)`
                            }
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-700 font-medium">
                            Client date not achievable — {Math.abs(result.requestedDateGap || 0)} weeks short
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Phase Breakdown */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                    Phase Breakdown
                  </h3>
                  <div className="space-y-2">
                    {result.phases.map((phase, i) => {
                      const maxWeeks = Math.max(...result.phases.map(p => p.totalWeeks), 1)
                      const barPct = (phase.totalWeeks / maxWeeks) * 100
                      const deptColor = getDeptBarColor(phase.department)

                      return (
                        <div key={i} className="group">
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", deptColor)} />
                              <span className="font-medium text-gray-700">{phase.name}</span>
                              {phase.bottleneck && (
                                <Badge className="bg-red-100 text-red-700 text-[9px] px-1 py-0">
                                  BOTTLENECK
                                </Badge>
                              )}
                            </div>
                            <span className="text-gray-500 font-mono">
                              {phase.totalWeeks} wk
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {phase.queueWeeks > 0 && (
                              <div
                                className={cn("h-3 rounded-l opacity-40", deptColor)}
                                style={{ width: `${(phase.queueWeeks / maxWeeks) * 100}%` }}
                                title={`Queue: ${phase.queueWeeks} wk`}
                              />
                            )}
                            <div
                              className={cn(
                                "h-3",
                                deptColor,
                                phase.queueWeeks === 0 ? "rounded-l" : "",
                                "rounded-r"
                              )}
                              style={{ width: `${(phase.workWeeks / maxWeeks) * 100}%`, minWidth: barPct > 0 ? "4px" : "0" }}
                              title={`Work: ${phase.workWeeks} wk`}
                            />
                            <div className="flex-1" />
                          </div>
                          {phase.queueWeeks > 0 && (
                            <div className="text-[10px] text-gray-400 ml-4">
                              Queue: {phase.queueWeeks} wk + Work: {phase.workWeeks} wk
                            </div>
                          )}
                          {phase.notes && (
                            <div className="text-[10px] text-gray-400 italic ml-4">{phase.notes}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Mini Timeline */}
                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="text-[10px] text-gray-400 uppercase mb-1.5">Timeline</div>
                    <div className="flex items-center gap-0.5 overflow-x-auto">
                      {result.phases.map((phase, i) => {
                        const totalWeeks = result.totalWeeks || 1
                        const widthPct = Math.max((phase.totalWeeks / totalWeeks) * 100, 2)
                        return (
                          <div
                            key={i}
                            className={cn(
                              "h-6 flex items-center justify-center text-[8px] font-medium text-white shrink-0",
                              getDeptBarColor(phase.department),
                              i === 0 && "rounded-l",
                              i === result.phases.length - 1 && "rounded-r"
                            )}
                            style={{ width: `${widthPct}%`, minWidth: "20px" }}
                            title={`${phase.name}: ${phase.totalWeeks} wk`}
                          >
                            {phase.totalWeeks >= 0.5 ? phase.name.slice(0, 4) : ""}
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>Today</span>
                      <span>{formatDate(result.earliestDeliveryDate)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      Warnings
                    </h3>
                    <div className="space-y-1.5">
                      {result.warnings.map((w, i) => (
                        <div key={i} className="text-xs text-amber-700 flex items-start gap-2">
                          <span className="text-amber-400 mt-0.5">&#x25CF;</span>
                          {w}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Reference */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-3">
                    <TrendingUp className="h-4 w-4" />
                    Quick Reference
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                        <Clock className="h-3.5 w-3.5" />
                        Buffer Applied
                      </div>
                      <div className="font-semibold text-gray-900">
                        {result.bufferWeeks} weeks
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Bottlenecks
                      </div>
                      <div className="font-semibold text-gray-900">
                        {result.phases.filter(p => p.bottleneck).length} stage(s)
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function getDeptBarColor(dept: string): string {
  switch (dept) {
    case "DESIGN": return "bg-blue-500"
    case "PROCUREMENT": return "bg-pink-500"
    case "PRODUCTION": return "bg-amber-500"
    case "INSTALLATION": return "bg-green-500"
    case "BUFFER": return "bg-gray-400"
    default: return "bg-gray-400"
  }
}
