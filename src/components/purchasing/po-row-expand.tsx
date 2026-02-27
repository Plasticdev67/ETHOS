"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate, prettifyEnum } from "@/lib/utils"
import { ChevronDown, ChevronUp, Package, Check, Plus } from "lucide-react"
import Link from "next/link"

type PoLine = {
  id: string
  description: string
  quantity: number
  unitCost: number | null
  totalCost: number | null
  received: boolean
  receivedQty: number
  receivedDate: string | null
  receivedNotes: string | null
  product: { partCode: string | null; description: string | null } | null
}

type Po = {
  id: string
  poNumber: string
  status: string
  dateRaised: string
  expectedDelivery: string | null
  totalValue: number | null
  project: { id: string; projectNumber: string; name: string } | null
  supplier: { name: string } | null
  _count: { poLines: number }
}

function getPoStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SENT: "bg-blue-100 text-blue-700",
    PARTIALLY_RECEIVED: "bg-amber-100 text-amber-700",
    COMPLETE: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  }
  return colors[status] || "bg-gray-100 text-gray-700"
}

export function PoTableRow({ po }: { po: Po }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [lines, setLines] = useState<PoLine[]>([])
  const [loading, setLoading] = useState(false)
  const [receivingLine, setReceivingLine] = useState<string | null>(null)
  const [receiveQty, setReceiveQty] = useState("")
  const [receiveNotes, setReceiveNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(po.status)
  const [addingLine, setAddingLine] = useState(false)
  const [newDesc, setNewDesc] = useState("")
  const [newQty, setNewQty] = useState("1")
  const [newUnitCost, setNewUnitCost] = useState("")
  const [lineCount, setLineCount] = useState(po._count.poLines)

  async function refreshLines() {
    const res = await fetch(`/api/purchase-orders/${po.id}`)
    if (res.ok) {
      const data = await res.json()
      setLines(data.poLines || [])
      setLineCount(data.poLines?.length || 0)
    }
  }

  async function toggleExpand() {
    if (expanded) {
      setExpanded(false)
      return
    }
    setExpanded(true)
    setLoading(true)
    await refreshLines()
    setLoading(false)
  }

  async function handleAddLine() {
    if (!newDesc.trim()) return
    setSaving(true)
    const res = await fetch(`/api/purchase-orders/${po.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: newDesc.trim(),
        quantity: newQty,
        unitCost: newUnitCost || undefined,
      }),
    })
    if (res.ok) {
      setAddingLine(false)
      setNewDesc("")
      setNewQty("1")
      setNewUnitCost("")
      await refreshLines()
      router.refresh()
    }
    setSaving(false)
  }

  async function handleReceive(lineId: string) {
    if (!receiveQty) return
    setSaving(true)
    const res = await fetch(`/api/purchase-orders/${po.id}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineId,
        receivedQty: parseInt(receiveQty, 10),
        notes: receiveNotes || undefined,
      }),
    })
    if (res.ok) {
      const result = await res.json()
      if (result.poStatus) setCurrentStatus(result.poStatus)

      setReceivingLine(null)
      setReceiveQty("")
      setReceiveNotes("")
      await refreshLines()
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={toggleExpand}>
        <td className="px-2 py-2.5 w-8 text-center">
          <button className="text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </td>
        <td className="px-3 py-2.5 font-mono text-xs font-semibold text-gray-700">{po.poNumber}</td>
        <td className="px-3 py-2.5">
          {po.project ? (
            <Link
              href={`/projects/${po.project.id}`}
              className="text-blue-600 hover:text-blue-700 text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {po.project.projectNumber} — {po.project.name}
            </Link>
          ) : (
            "—"
          )}
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-500">{po.supplier?.name || "—"}</td>
        <td className="px-3 py-2.5">
          <Badge variant="secondary" className={getPoStatusColor(currentStatus)}>
            {prettifyEnum(currentStatus)}
          </Badge>
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-500">{formatDate(po.dateRaised)}</td>
        <td className="px-3 py-2.5 text-xs text-gray-500">{formatDate(po.expectedDelivery)}</td>
        <td className="px-3 py-2.5 text-right font-mono text-sm font-medium">
          {po.totalValue ? formatCurrency(Number(po.totalValue)) : "—"}
        </td>
        <td className="px-3 py-2.5 text-center text-xs text-gray-600">{lineCount}</td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={9} className="px-4 py-0 pb-3">
            <div className="border border-border rounded-lg overflow-hidden bg-white">
              {loading ? (
                <div className="px-4 py-6 text-center text-xs text-gray-500">Loading lines...</div>
              ) : (
                <>
                  {lines.length > 0 && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-border">
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Unit Cost</th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Total</th>
                          <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500">Received</th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {lines.map((line) => (
                          <tr key={line.id} className={line.received ? "bg-green-50/30" : ""}>
                            <td className="px-3 py-2">
                              <div className="text-sm text-gray-900">{line.description}</div>
                              {line.product?.partCode && (
                                <div className="text-xs text-gray-400 font-mono">{line.product.partCode}</div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs">{line.quantity}</td>
                            <td className="px-3 py-2 text-right font-mono text-xs">
                              {line.unitCost != null ? formatCurrency(Number(line.unitCost)) : "—"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs">
                              {line.totalCost != null ? formatCurrency(Number(line.totalCost)) : "—"}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {line.received ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">
                                  <Check className="h-3 w-3 mr-0.5" />
                                  {line.receivedQty}/{line.quantity}
                                </Badge>
                              ) : line.receivedQty > 0 ? (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px]">
                                  {line.receivedQty}/{line.quantity}
                                </Badge>
                              ) : (
                                <span className="text-xs text-gray-400">0/{line.quantity}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {receivingLine === line.id ? (
                                <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={line.quantity}
                                    value={receiveQty}
                                    onChange={(e) => setReceiveQty(e.target.value)}
                                    placeholder="Qty"
                                    className="w-16 h-7 text-xs"
                                  />
                                  <Input
                                    value={receiveNotes}
                                    onChange={(e) => setReceiveNotes(e.target.value)}
                                    placeholder="Notes"
                                    className="w-24 h-7 text-xs"
                                  />
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs px-2"
                                    onClick={() => handleReceive(line.id)}
                                    disabled={saving || !receiveQty}
                                  >
                                    {saving ? "..." : "OK"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs px-2"
                                    onClick={() => {
                                      setReceivingLine(null)
                                      setReceiveQty("")
                                      setReceiveNotes("")
                                    }}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ) : !line.received ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setReceivingLine(line.id)
                                    setReceiveQty(String(line.quantity - line.receivedQty))
                                  }}
                                >
                                  <Package className="h-3 w-3 mr-1" />
                                  Receive
                                </Button>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Add Line */}
                  <div className="px-3 py-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
                    {addingLine ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={newDesc}
                          onChange={(e) => setNewDesc(e.target.value)}
                          placeholder="Item description *"
                          className="flex-1 h-7 text-xs"
                          autoFocus
                        />
                        <Input
                          type="number"
                          min={1}
                          value={newQty}
                          onChange={(e) => setNewQty(e.target.value)}
                          placeholder="Qty"
                          className="w-16 h-7 text-xs"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={newUnitCost}
                          onChange={(e) => setNewUnitCost(e.target.value)}
                          placeholder="Unit £"
                          className="w-20 h-7 text-xs"
                        />
                        <Button
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={handleAddLine}
                          disabled={saving || !newDesc.trim()}
                        >
                          {saving ? "..." : "Add"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2"
                          onClick={() => { setAddingLine(false); setNewDesc(""); setNewQty("1"); setNewUnitCost("") }}
                        >
                          ×
                        </Button>
                      </div>
                    ) : (
                      <button
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        onClick={() => setAddingLine(true)}
                      >
                        <Plus className="h-3 w-3" />
                        Add Line Item
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
