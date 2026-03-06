"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate, prettifyEnum } from "@/lib/utils"
import { QuoteLineForm, QuoteLineRow } from "@/components/quotes/quote-line-form"
import { QuoteStatusActions } from "@/components/quotes/quote-status-actions"
import { CascadingProductBuilder } from "@/components/quotes/cascading-product-builder"
import { ArrowLeft, Building2, User, Calendar, FolderKanban, Download, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"

type QuoteLine = {
  id: string
  description: string
  dimensions: string | null
  quantity: number
  units: string | null
  unitCost: string | number | null
  costTotal: string | number | null
  marginPercent: string | number | null
  sellPrice: string | number | null
  isOptional: boolean
  marginOverride: boolean
  sortOrder: number
  product?: { partCode: string; description: string } | null
  catalogueItem?: { partCode: string; description: string; guideUnitCost: string | number | null } | null
  spec?: {
    id: string
    variantId: string
    width: number | null
    height: number | null
    specSelections: Record<string, string>
    computedBom: { description: string; category: string; quantity: number; unitCost: number; totalCost: number }[]
    computedCost: string | number
    includesRd: boolean
    rdCostAmount: string | number
    variant: { code: string; name: string; type: { name: string; family: { name: string } } }
  } | null
}

type Quote = {
  id: string
  quoteNumber: string
  revisionNumber: number
  status: string
  subject: string | null
  dateCreated: string
  dateSubmitted: string | null
  validUntil: string | null
  totalCost: string | number | null
  totalSell: string | number | null
  overallMargin: string | number | null
  notes: string | null
  workStream: string | null
  customer: { id: string; name: string }
  project: {
    id: string
    projectNumber: string
    name: string
    products: { id: string; partCode: string; description: string; quantity: number; catalogueItemId: string | null }[]
  } | null
  createdBy: { name: string } | null
  quoteLines: QuoteLine[]
}

type CatalogueItem = {
  id: string
  partCode: string
  description: string
  guideUnitCost: string | number | null
  guideMarginPercent: string | number | null
  defaultUnits: string | null
}

function getQuoteStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    SUBMITTED: "bg-blue-100 text-blue-800",
    ACCEPTED: "bg-green-100 text-green-800",
    DECLINED: "bg-red-100 text-red-800",
    REVISED: "bg-amber-100 text-amber-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

export default function QuoteDetailPage() {
  const params = useParams()
  const quoteId = params.id as string

  const [quote, setQuote] = useState<Quote | null>(null)
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([])
  const [loading, setLoading] = useState(true)

  async function loadQuote() {
    const res = await fetch(`/api/quotes/${quoteId}`)
    if (res.ok) {
      const data = await res.json()
      setQuote(data)
    }
  }

  async function loadCatalogue() {
    const res = await fetch("/api/catalogue")
    if (res.ok) {
      const data = await res.json()
      setCatalogueItems(data)
    }
  }

  useEffect(() => {
    Promise.all([loadQuote(), loadCatalogue()]).then(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId])

  function handleLineChanged() {
    loadQuote()
  }

  function handleStatusChange() {
    loadQuote()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading quote...</div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="space-y-4">
        <Link href="/quotes" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Quotes
        </Link>
        <div className="py-20 text-center text-gray-500">Quote not found.</div>
      </div>
    )
  }

  const totalCost = Number(quote.totalCost) || 0
  const totalSell = Number(quote.totalSell) || 0
  const overallMargin = Number(quote.overallMargin) || 0
  const profit = totalSell - totalCost
  const isDraft = quote.status === "DRAFT"

  // Split lines into main and optional
  const mainLines = quote.quoteLines.filter((l) => !l.isOptional)
  const optionalLines = quote.quoteLines.filter((l) => l.isOptional)

  // Optional extras subtotals
  const optionalCost = optionalLines.reduce((sum, l) => sum + Number(l.costTotal || 0), 0)
  const optionalSell = optionalLines.reduce((sum, l) => sum + Number(l.sellPrice || 0), 0)

  const tableHeaders = (
    <tr className="border-b border-border bg-gray-50/50">
      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Part Code</th>
      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
      <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Qty</th>
      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Units</th>
      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Unit Cost</th>
      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Cost Total</th>
      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Margin %</th>
      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Unit Sell</th>
      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Sell Total</th>
      {isDraft && <th className="px-4 py-3 w-10"></th>}
    </tr>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/quotes" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to Quotes
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{quote.quoteNumber}</h1>
            <Badge variant="secondary" className={getQuoteStatusColor(quote.status)}>
              {prettifyEnum(quote.status)}
            </Badge>
            <span className="text-xs text-gray-400">Rev {quote.revisionNumber}</span>
          </div>
          {quote.subject && (
            <p className="mt-1 text-sm text-gray-700">{quote.subject}</p>
          )}
          <p className="mt-0.5 text-sm text-gray-500">
            {quote.customer.name}
            {quote.project && (
              <> — <Link href={`/projects/${quote.project.id}`} className="text-blue-600 hover:text-blue-700">{quote.project.projectNumber} {quote.project.name}</Link></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/quotes/${quote.id}/pdf`, "_blank")}
          >
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <QuoteStatusActions
            quoteId={quote.id}
            currentStatus={quote.status}
            onStatusChange={handleStatusChange}
            quoteSummary={{
              quoteNumber: quote.quoteNumber,
              subject: quote.subject,
              customerId: quote.customer.id,
              customerName: quote.customer.name,
              totalSell: totalSell,
              workStream: quote.workStream,
            }}
          />
        </div>
      </div>

      {/* Quote Info Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Building2 className="h-3.5 w-3.5" /> Customer
            </div>
            <div className="text-sm font-medium text-gray-900">
              {quote.customer.name}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Layers className="h-3.5 w-3.5" /> Work Stream
            </div>
            <div className="text-sm font-medium text-gray-900">
              {quote.workStream ? prettifyEnum(quote.workStream) : <span className="text-gray-400">Not set</span>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <FolderKanban className="h-3.5 w-3.5" /> Project
            </div>
            <div className="text-sm font-medium text-gray-900">
              {quote.project ? (
                <Link href={`/projects/${quote.project.id}`} className="text-blue-600 hover:text-blue-700">
                  {quote.project.projectNumber}
                </Link>
              ) : (
                <span className="text-gray-400">Not linked</span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <User className="h-3.5 w-3.5" /> Created By
            </div>
            <div className="text-sm font-medium text-gray-900">
              {quote.createdBy?.name || "Unknown"}
            </div>
            <div className="text-xs text-gray-400">{formatDate(quote.dateCreated)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Calendar className="h-3.5 w-3.5" /> Submitted
            </div>
            <div className="text-sm font-medium text-gray-900">
              {quote.dateSubmitted ? formatDate(quote.dateSubmitted) : "Not yet"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Totals Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div>
                <div className="text-xs text-gray-500 uppercase">Total Cost</div>
                <div className="text-lg font-mono font-medium text-gray-900">{formatCurrency(totalCost)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Total Sell</div>
                <div className="text-lg font-mono font-semibold text-blue-700">{formatCurrency(totalSell)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Profit</div>
                <div className={`text-lg font-mono font-medium ${profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {formatCurrency(profit)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Margin</div>
                <div className={`text-lg font-mono font-medium ${overallMargin >= 25 ? "text-green-700" : overallMargin >= 0 ? "text-amber-600" : "text-red-600"}`}>
                  {overallMargin.toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {mainLines.length} line{mainLines.length !== 1 ? "s" : ""}
              {optionalLines.length > 0 && ` + ${optionalLines.length} optional`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Line Items */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-gray-900">Line Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>{tableHeaders}</thead>
              <tbody className="divide-y divide-border">
                {mainLines.map((line) => (
                  <QuoteLineRow
                    key={line.id}
                    line={line}
                    quoteId={quote.id}
                    isDraft={isDraft}
                    onDelete={handleLineChanged}
                  />
                ))}
                {mainLines.length === 0 && (
                  <tr>
                    <td colSpan={isDraft ? 10 : 9} className="px-6 py-8 text-center text-gray-400">
                      No line items yet. Add your first line below.
                    </td>
                  </tr>
                )}
                {/* Main subtotal row */}
                {mainLines.length > 0 && (
                  <tr className="bg-gray-50 font-medium">
                    <td colSpan={5} className="px-4 py-2.5 text-sm text-gray-700 text-right">
                      Main Items Subtotal
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm text-gray-900">
                      {formatCurrency(totalCost)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm text-gray-600">
                      {overallMargin.toFixed(1)}%
                    </td>
                    <td colSpan={1}></td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm font-semibold text-blue-700">
                      {formatCurrency(totalSell)}
                    </td>
                    {isDraft && <td></td>}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Optional Extras */}
      {(optionalLines.length > 0 || isDraft) && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-medium text-amber-700">Optional Extras</h3>
              <p className="text-xs text-gray-500">Not included in quote totals — shown separately to the customer</p>
            </div>
            {optionalLines.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>{tableHeaders}</thead>
                  <tbody className="divide-y divide-border">
                    {optionalLines.map((line) => (
                      <QuoteLineRow
                        key={line.id}
                        line={line}
                        quoteId={quote.id}
                        isDraft={isDraft}
                        onDelete={handleLineChanged}
                      />
                    ))}
                    {/* Optional subtotal row */}
                    <tr className="bg-amber-50/50 font-medium">
                      <td colSpan={5} className="px-4 py-2.5 text-sm text-amber-700 text-right">
                        Optional Extras Subtotal
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-gray-900">
                        {formatCurrency(optionalCost)}
                      </td>
                      <td></td>
                      <td colSpan={1}></td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm font-semibold text-amber-700">
                        {formatCurrency(optionalSell)}
                      </td>
                      {isDraft && <td></td>}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            {optionalLines.length === 0 && (
              <div className="px-6 py-6 text-center text-gray-400 text-sm">
                No optional extras. Mark a line as &quot;Optional Extra&quot; when adding it.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Line Form */}
      {isDraft && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CascadingProductBuilder
              quoteId={quote.id}
              onLineAdded={handleLineChanged}
            />
            <span className="text-xs text-gray-400">or add a manual line below</span>
          </div>
          <QuoteLineForm
            quoteId={quote.id}
            catalogueItems={catalogueItems}
            onLineAdded={handleLineChanged}
          />
        </div>
      )}

      {/* Notes */}
      {quote.notes && (
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium uppercase text-gray-500 mb-2">Notes</div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
