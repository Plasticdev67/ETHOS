"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  ArrowLeft,
  Send,
  Copy,
  Check,
  Loader2,
  BarChart3,
  Award,
  ChevronDown,
  ChevronRight,
  Mail,
  Trash2,
  X,
} from "lucide-react"

type EnquiryLine = {
  id: string
  description: string
  partNumber: string | null
  quantity: number
  unit: string
  notes: string | null
  bomLine?: { id: string; description: string; partNumber: string | null; category: string } | null
}

type ResponseLine = {
  id: string
  enquiryLineId: string
  unitPrice: number | null
  totalPrice: number | null
  leadTimeDays: number | null
  notes: string | null
  available: boolean
  enquiryLine: { id: string; description: string; partNumber: string | null; quantity: number; unit: string }
}

type EnquiryResponse = {
  id: string
  supplierId: string
  status: string
  emailSentAt: string | null
  respondedAt: string | null
  totalQuoted: number | null
  leadTimeDays: number | null
  validUntil: string | null
  notes: string | null
  supplier: { id: string; name: string; email: string | null }
  lines: ResponseLine[]
}

type Enquiry = {
  id: string
  enquiryNumber: string
  subject: string
  notes: string | null
  status: string
  createdAt: string
  sentAt: string | null
  project: { id: string; projectNumber: string; name: string }
  createdBy: { id: string; name: string } | null
  lines: EnquiryLine[]
  responses: EnquiryResponse[]
}

type CompareData = {
  lines: {
    lineId: string
    description: string
    partNumber: string | null
    quantity: number
    unit: string
    responses: {
      responseId: string
      supplierId: string
      supplierName: string
      status: string
      unitPrice: number | null
      totalPrice: number | null
      leadTimeDays: number | null
      available: boolean | null
      notes: string | null
    }[]
  }[]
  totals: {
    responseId: string
    supplierId: string
    supplierName: string
    status: string
    total: number
    totalQuoted: number
    avgLeadTime: number | null
    maxLeadTime: number | null
    validUntil: string | null
  }[]
}

type EmailData = {
  supplierId: string
  supplierName: string
  supplierEmail: string
  subject: string
  body: string
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  PARTIALLY_RESPONDED: "bg-amber-100 text-amber-700",
  ALL_RESPONDED: "bg-green-100 text-green-700",
  AWARDED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
}

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_RESPONDED: "Partial Response",
  ALL_RESPONDED: "All Responded",
  AWARDED: "Awarded",
  CANCELLED: "Cancelled",
}

const responseStatusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  QUOTED: "bg-blue-100 text-blue-700",
  DECLINED: "bg-red-100 text-red-700",
  AWARDED: "bg-emerald-100 text-emerald-700",
}

export default function EnquiryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null)
  const [loading, setLoading] = useState(true)

  // UI state
  const [showEmails, setShowEmails] = useState(false)
  const [emails, setEmails] = useState<EmailData[]>([])
  const [sendingEnquiry, setSendingEnquiry] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

  const [showCompare, setShowCompare] = useState(false)
  const [compareData, setCompareData] = useState<CompareData | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)

  const [editingResponseId, setEditingResponseId] = useState<string | null>(null)
  const [responseForm, setResponseForm] = useState<{
    totalQuoted: string
    leadTimeDays: string
    validUntil: string
    notes: string
    lines: { enquiryLineId: string; unitPrice: string; leadTimeDays: string; available: boolean; notes: string }[]
  }>({
    totalQuoted: "",
    leadTimeDays: "",
    validUntil: "",
    notes: "",
    lines: [],
  })
  const [savingResponse, setSavingResponse] = useState(false)

  const [awarding, setAwarding] = useState(false)
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const fetchEnquiry = useCallback(async () => {
    const res = await fetch(`/api/finance/enquiries/${id}`)
    if (res.ok) {
      const data = await res.json()
      setEnquiry(data)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchEnquiry()
  }, [fetchEnquiry])

  async function handleSendEnquiry() {
    if (!enquiry) return
    setSendingEnquiry(true)
    const res = await fetch(`/api/finance/enquiries/${id}/send`, { method: "POST" })
    if (res.ok) {
      const data = await res.json()
      setEmails(data.emails)
      setShowEmails(true)
      await fetchEnquiry()
    }
    setSendingEnquiry(false)
  }

  async function copyEmailToClipboard(email: EmailData) {
    const text = `To: ${email.supplierEmail}\nSubject: ${email.subject}\n\n${email.body}`
    await navigator.clipboard.writeText(text)
    setCopiedEmail(email.supplierId)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  function startEnterResponse(response: EnquiryResponse) {
    setEditingResponseId(response.id)
    setResponseForm({
      totalQuoted: response.totalQuoted?.toString() || "",
      leadTimeDays: response.leadTimeDays?.toString() || "",
      validUntil: response.validUntil ? new Date(response.validUntil).toISOString().split("T")[0] : "",
      notes: response.notes || "",
      lines: enquiry!.lines.map((line) => {
        const existingLine = response.lines.find((rl) => rl.enquiryLineId === line.id)
        return {
          enquiryLineId: line.id,
          unitPrice: existingLine?.unitPrice?.toString() || "",
          leadTimeDays: existingLine?.leadTimeDays?.toString() || "",
          available: existingLine?.available ?? true,
          notes: existingLine?.notes || "",
        }
      }),
    })
  }

  async function saveResponse() {
    if (!editingResponseId || !enquiry) return
    setSavingResponse(true)

    const lines = responseForm.lines.map((l) => ({
      enquiryLineId: l.enquiryLineId,
      unitPrice: l.unitPrice ? parseFloat(l.unitPrice) : undefined,
      leadTimeDays: l.leadTimeDays ? parseInt(l.leadTimeDays) : undefined,
      available: l.available,
      notes: l.notes || undefined,
    }))

    const res = await fetch(`/api/finance/enquiries/${id}/responses/${editingResponseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "QUOTED",
        totalQuoted: responseForm.totalQuoted ? parseFloat(responseForm.totalQuoted) : undefined,
        leadTimeDays: responseForm.leadTimeDays ? parseInt(responseForm.leadTimeDays) : undefined,
        validUntil: responseForm.validUntil || undefined,
        notes: responseForm.notes || undefined,
        lines,
      }),
    })

    if (res.ok) {
      setEditingResponseId(null)
      await fetchEnquiry()
    }
    setSavingResponse(false)
  }

  async function handleCompare() {
    setCompareLoading(true)
    const res = await fetch(`/api/finance/enquiries/${id}/compare`)
    if (res.ok) {
      const data = await res.json()
      setCompareData(data)
      setShowCompare(true)
    }
    setCompareLoading(false)
  }

  async function handleAward(responseId: string) {
    if (!confirm("Award this enquiry to the selected supplier and create a Purchase Order?")) return
    setAwarding(true)
    const res = await fetch(`/api/finance/enquiries/${id}/award`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responseId }),
    })
    if (res.ok) {
      const data = await res.json()
      alert(`PO ${data.poNumber} created successfully.`)
      await fetchEnquiry()
    }
    setAwarding(false)
  }

  async function handleDelete() {
    if (!confirm("Delete this draft enquiry? This cannot be undone.")) return
    setDeleting(true)
    const res = await fetch(`/api/finance/enquiries/${id}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/purchasing/enquiries")
    }
    setDeleting(false)
  }

  function toggleResponseExpanded(responseId: string) {
    setExpandedResponses((prev) => {
      const next = new Set(prev)
      if (next.has(responseId)) next.delete(responseId)
      else next.add(responseId)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!enquiry) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Enquiry not found.</p>
        <Link href="/purchasing/enquiries" className="text-blue-600 text-sm mt-2 inline-block">
          Back to enquiries
        </Link>
      </div>
    )
  }

  const quotedCount = enquiry.responses.filter((r) => r.status === "QUOTED").length
  const canSend = enquiry.status === "DRAFT"
  const canCompare = quotedCount >= 1
  const canAward = enquiry.status !== "AWARDED" && enquiry.status !== "CANCELLED" && quotedCount >= 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/purchasing/enquiries">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">
                {enquiry.enquiryNumber}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[enquiry.status]}`}
              >
                {statusLabels[enquiry.status] || enquiry.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">{enquiry.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canSend && (
            <Button onClick={handleSendEnquiry} disabled={sendingEnquiry}>
              {sendingEnquiry ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Enquiry
            </Button>
          )}
          {canCompare && (
            <Button variant="outline" onClick={handleCompare} disabled={compareLoading}>
              {compareLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="mr-2 h-4 w-4" />
              )}
              Compare Quotes
            </Button>
          )}
          {enquiry.status === "DRAFT" && (
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase text-gray-500">Project</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {enquiry.project.projectNumber}
            </p>
            <p className="text-xs text-gray-500">{enquiry.project.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase text-gray-500">Items</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{enquiry.lines.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase text-gray-500">Suppliers</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {enquiry.responses.length}
            </p>
            <p className="text-xs text-gray-500">{quotedCount} quoted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase text-gray-500">Sent</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {enquiry.sentAt ? formatDate(enquiry.sentAt) : "Not sent"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {enquiry.notes && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{enquiry.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Enquiry Lines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enquiry Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 w-8">
                  #
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Description
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Part No.
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                  Qty
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Unit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enquiry.lines.map((line, idx) => (
                <tr key={line.id}>
                  <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-2 text-gray-900">{line.description}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">
                    {line.partNumber || "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">{Number(line.quantity)}</td>
                  <td className="px-3 py-2 text-gray-500">{line.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Email Templates (after sending) */}
      {showEmails && emails.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                <Mail className="inline h-4 w-4 mr-2" />
                Email Templates
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowEmails(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {emails.map((email) => (
              <div key={email.supplierId} className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{email.supplierName}</p>
                    <p className="text-xs text-gray-500">{email.supplierEmail || "No email on file"}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyEmailToClipboard(email)}
                  >
                    {copiedEmail === email.supplierId ? (
                      <><Check className="mr-1 h-3 w-3" /> Copied</>
                    ) : (
                      <><Copy className="mr-1 h-3 w-3" /> Copy</>
                    )}
                  </Button>
                </div>
                <div className="text-xs text-gray-500">
                  <strong>Subject:</strong> {email.subject}
                </div>
                <pre className="text-xs text-gray-600 bg-gray-50 rounded p-3 max-h-[200px] overflow-y-auto whitespace-pre-wrap font-sans">
                  {email.body}
                </pre>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Supplier Responses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supplier Responses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {enquiry.responses.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No suppliers added.</p>
          ) : (
            enquiry.responses.map((response) => {
              const isExpanded = expandedResponses.has(response.id)
              const isEditing = editingResponseId === response.id

              return (
                <div
                  key={response.id}
                  className="rounded-lg border border-border overflow-hidden"
                >
                  {/* Response header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => toggleResponseExpanded(response.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {response.supplier.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {response.supplier.email || "No email"}
                          {response.respondedAt && ` — Responded ${formatDate(response.respondedAt)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {response.totalQuoted && (
                        <span className="text-sm font-mono font-medium text-gray-900">
                          {formatCurrency(response.totalQuoted)}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${responseStatusColors[response.status]}`}
                      >
                        {response.status}
                      </span>
                      {response.status !== "AWARDED" && response.status !== "DECLINED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            startEnterResponse(response)
                            setExpandedResponses((prev) => new Set(prev).add(response.id))
                          }}
                        >
                          {response.status === "QUOTED" ? "Edit Response" : "Enter Response"}
                        </Button>
                      )}
                      {canAward && response.status === "QUOTED" && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAward(response.id)
                          }}
                          disabled={awarding}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Award className="mr-1 h-3 w-3" />
                          Award
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded: response details or edit form */}
                  {isExpanded && (
                    <div className="border-t border-border bg-gray-50/30 p-4">
                      {isEditing ? (
                        /* Edit form */
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Total Quoted</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={responseForm.totalQuoted}
                                onChange={(e) =>
                                  setResponseForm((f) => ({ ...f, totalQuoted: e.target.value }))
                                }
                                placeholder="0.00"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Lead Time (days)</Label>
                              <Input
                                type="number"
                                value={responseForm.leadTimeDays}
                                onChange={(e) =>
                                  setResponseForm((f) => ({ ...f, leadTimeDays: e.target.value }))
                                }
                                placeholder="e.g., 14"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Valid Until</Label>
                              <Input
                                type="date"
                                value={responseForm.validUntil}
                                onChange={(e) =>
                                  setResponseForm((f) => ({ ...f, validUntil: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Notes</Label>
                            <Textarea
                              value={responseForm.notes}
                              onChange={(e) =>
                                setResponseForm((f) => ({ ...f, notes: e.target.value }))
                              }
                              rows={2}
                              placeholder="Supplier notes..."
                            />
                          </div>

                          {/* Line-by-line pricing */}
                          <div className="space-y-1">
                            <Label className="text-xs">Line Item Pricing</Label>
                            <div className="rounded-lg border border-border overflow-hidden">
                              <table className="w-full text-xs">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-gray-500">Item</th>
                                    <th className="px-3 py-2 text-right text-gray-500">Qty</th>
                                    <th className="px-3 py-2 text-right text-gray-500 w-28">
                                      Unit Price
                                    </th>
                                    <th className="px-3 py-2 text-right text-gray-500 w-20">
                                      Lead (days)
                                    </th>
                                    <th className="px-3 py-2 text-center text-gray-500 w-16">
                                      Avail.
                                    </th>
                                    <th className="px-3 py-2 text-left text-gray-500 w-32">
                                      Notes
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-white">
                                  {responseForm.lines.map((fl, idx) => {
                                    const enquiryLine = enquiry.lines.find(
                                      (l) => l.id === fl.enquiryLineId
                                    )
                                    return (
                                      <tr key={fl.enquiryLineId}>
                                        <td className="px-3 py-2 text-gray-900">
                                          {enquiryLine?.description || "—"}
                                          {enquiryLine?.partNumber && (
                                            <span className="ml-1 font-mono text-gray-400">
                                              ({enquiryLine.partNumber})
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-500">
                                          {Number(enquiryLine?.quantity || 0)} {enquiryLine?.unit}
                                        </td>
                                        <td className="px-3 py-2">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={fl.unitPrice}
                                            onChange={(e) => {
                                              const lines = [...responseForm.lines]
                                              lines[idx] = { ...lines[idx], unitPrice: e.target.value }
                                              setResponseForm((f) => ({ ...f, lines }))
                                            }}
                                            placeholder="0.00"
                                            className="h-7 text-xs"
                                          />
                                        </td>
                                        <td className="px-3 py-2">
                                          <Input
                                            type="number"
                                            value={fl.leadTimeDays}
                                            onChange={(e) => {
                                              const lines = [...responseForm.lines]
                                              lines[idx] = { ...lines[idx], leadTimeDays: e.target.value }
                                              setResponseForm((f) => ({ ...f, lines }))
                                            }}
                                            placeholder="—"
                                            className="h-7 text-xs"
                                          />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <input
                                            type="checkbox"
                                            checked={fl.available}
                                            onChange={(e) => {
                                              const lines = [...responseForm.lines]
                                              lines[idx] = { ...lines[idx], available: e.target.checked }
                                              setResponseForm((f) => ({ ...f, lines }))
                                            }}
                                            className="rounded border-gray-300"
                                          />
                                        </td>
                                        <td className="px-3 py-2">
                                          <Input
                                            value={fl.notes}
                                            onChange={(e) => {
                                              const lines = [...responseForm.lines]
                                              lines[idx] = { ...lines[idx], notes: e.target.value }
                                              setResponseForm((f) => ({ ...f, lines }))
                                            }}
                                            placeholder="—"
                                            className="h-7 text-xs"
                                          />
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingResponseId(null)}
                            >
                              Cancel
                            </Button>
                            <Button size="sm" onClick={saveResponse} disabled={savingResponse}>
                              {savingResponse ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="mr-1 h-3 w-3" />
                              )}
                              Save Response
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Read-only view */
                        <div>
                          {response.lines.length > 0 ? (
                            <table className="w-full text-xs">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-3 py-1.5 text-left text-gray-500">Item</th>
                                  <th className="px-3 py-1.5 text-right text-gray-500">Unit Price</th>
                                  <th className="px-3 py-1.5 text-right text-gray-500">Total</th>
                                  <th className="px-3 py-1.5 text-right text-gray-500">Lead (days)</th>
                                  <th className="px-3 py-1.5 text-center text-gray-500">Avail.</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border bg-white">
                                {response.lines.map((rl) => (
                                  <tr key={rl.id}>
                                    <td className="px-3 py-1.5 text-gray-900">
                                      {rl.enquiryLine?.description || "—"}
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-mono text-gray-700">
                                      {rl.unitPrice ? formatCurrency(rl.unitPrice) : "—"}
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-mono text-gray-700">
                                      {rl.totalPrice ? formatCurrency(rl.totalPrice) : "—"}
                                    </td>
                                    <td className="px-3 py-1.5 text-right text-gray-500">
                                      {rl.leadTimeDays ?? "—"}
                                    </td>
                                    <td className="px-3 py-1.5 text-center">
                                      {rl.available ? (
                                        <Check className="h-3 w-3 text-green-600 inline" />
                                      ) : (
                                        <X className="h-3 w-3 text-red-500 inline" />
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-xs text-gray-500 text-center py-3">
                              No line items quoted yet.
                            </p>
                          )}
                          {response.notes && (
                            <div className="mt-2 px-3">
                              <p className="text-xs text-gray-500">
                                <strong>Notes:</strong> {response.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Comparison View */}
      {showCompare && compareData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                <BarChart3 className="inline h-4 w-4 mr-2" />
                Quote Comparison
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCompare(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="px-3 py-2 text-left text-gray-500 font-medium sticky left-0 bg-gray-50 min-w-[200px]">
                    Item
                  </th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium w-16">Qty</th>
                  {compareData.totals.map((t) => (
                    <th
                      key={t.responseId}
                      className="px-3 py-2 text-center text-gray-700 font-medium min-w-[140px]"
                    >
                      {t.supplierName}
                      <div className="font-normal text-gray-400 text-[10px]">{t.status}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {compareData.lines.map((line) => {
                  // Find the lowest price for highlighting
                  const prices = line.responses
                    .filter((r) => r.totalPrice !== null && r.available !== false)
                    .map((r) => r.totalPrice as number)
                  const lowestPrice = prices.length > 0 ? Math.min(...prices) : null

                  return (
                    <tr key={line.lineId}>
                      <td className="px-3 py-2 text-gray-900 sticky left-0 bg-white">
                        {line.description}
                        {line.partNumber && (
                          <span className="ml-1 font-mono text-gray-400">({line.partNumber})</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">
                        {line.quantity} {line.unit}
                      </td>
                      {line.responses.map((r) => (
                        <td
                          key={r.responseId}
                          className={`px-3 py-2 text-center ${
                            r.available === false
                              ? "bg-red-50 text-red-500"
                              : r.totalPrice === lowestPrice && lowestPrice !== null
                                ? "bg-green-50"
                                : ""
                          }`}
                        >
                          {r.available === false ? (
                            <span className="text-red-500">N/A</span>
                          ) : r.unitPrice !== null ? (
                            <div>
                              <div className="font-mono font-medium text-gray-900">
                                {formatCurrency(r.totalPrice || 0)}
                              </div>
                              <div className="text-gray-400">
                                {formatCurrency(r.unitPrice)}/ea
                              </div>
                              {r.leadTimeDays && (
                                <div className="text-gray-400">{r.leadTimeDays}d</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-gray-50 font-medium">
                  <td className="px-3 py-2 text-gray-700 sticky left-0 bg-gray-50">TOTAL</td>
                  <td></td>
                  {compareData.totals.map((t) => {
                    const lowestTotal = Math.min(
                      ...compareData.totals
                        .filter((tt) => tt.total > 0)
                        .map((tt) => tt.total)
                    )
                    const isLowest = t.total === lowestTotal && t.total > 0

                    return (
                      <td
                        key={t.responseId}
                        className={`px-3 py-2 text-center ${isLowest ? "bg-green-50" : ""}`}
                      >
                        <div className="font-mono text-sm text-gray-900">
                          {formatCurrency(t.totalQuoted || t.total)}
                        </div>
                        {t.avgLeadTime && (
                          <div className="text-[10px] text-gray-500">
                            Avg {t.avgLeadTime}d / Max {t.maxLeadTime}d
                          </div>
                        )}
                        {canAward && t.status === "QUOTED" && (
                          <Button
                            size="sm"
                            className="mt-1 h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleAward(t.responseId)}
                            disabled={awarding}
                          >
                            <Award className="mr-1 h-3 w-3" />
                            Award & Create PO
                          </Button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
