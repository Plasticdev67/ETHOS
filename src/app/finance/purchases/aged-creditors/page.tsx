'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn, formatCurrency, formatDate, formatDateISO } from '@/lib/utils'
import {
  AlertTriangle,
  Calendar,
  Printer,
  ChevronDown,
  ChevronRight,
  PoundSterling,
  Clock,
} from 'lucide-react'

interface AgedCreditorInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  daysOverdue: number
  total: string
  paidAmount: string
  outstanding: string
  ageBand: string
  type: string
}

interface AgedCreditorSupplier {
  supplierId: string
  supplierName: string
  supplierCode: string
  total: string
  current: string
  days30: string
  days60: string
  days90Plus: string
  invoices: AgedCreditorInvoice[]
}

interface AgedCreditorsData {
  asAtDate: string
  totals: {
    total: string
    current: string
    days30: string
    days60: string
    days90Plus: string
  }
  suppliers: AgedCreditorSupplier[]
}

export default function AgedCreditorsPage() {
  const [data, setData] = useState<AgedCreditorsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [asAtDate, setAsAtDate] = useState(formatDateISO(new Date()))
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/finance/purchase-invoices/aged?asAtDate=${asAtDate}`)
        if (!res.ok) throw new Error('Failed to load aged creditors report')

        const json = await res.json()
        setData(json)

        // Auto-expand all suppliers
        if (json.suppliers) {
          setExpandedSuppliers(new Set(json.suppliers.map((s: AgedCreditorSupplier) => s.supplierId)))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [asAtDate])

  function toggleSupplier(supplierId: string) {
    setExpandedSuppliers((prev) => {
      const next = new Set(prev)
      if (next.has(supplierId)) {
        next.delete(supplierId)
      } else {
        next.add(supplierId)
      }
      return next
    })
  }

  const summaryCards = [
    {
      label: 'Total Outstanding',
      value: data?.totals?.total ?? '0.00',
      icon: PoundSterling,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Current',
      value: data?.totals?.current ?? '0.00',
      icon: Clock,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: '30 Days',
      value: data?.totals?.days30 ?? '0.00',
      icon: AlertTriangle,
      color: 'text-yellow-600 bg-yellow-50',
    },
    {
      label: '60 Days',
      value: data?.totals?.days60 ?? '0.00',
      icon: AlertTriangle,
      color: 'text-orange-600 bg-orange-50',
    },
    {
      label: '90+ Days',
      value: data?.totals?.days90Plus ?? '0.00',
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50',
    },
  ]

  const AGE_BAND_BADGES: Record<string, string> = {
    CURRENT: 'badge-success',
    '30_DAYS': 'badge-warning',
    '60_DAYS': 'badge-warning',
    '90_PLUS': 'badge-danger',
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/finance/purchases" className="hover:text-gray-700">Purchase Ledger</Link>
        <span>/</span>
        <span className="text-gray-900">Aged Creditors Report</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aged Creditors Report</h1>
          <p className="text-sm text-gray-500 mt-1">
            Outstanding payables broken down by age band
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <label className="label mb-0">As at:</label>
            <input
              type="date"
              className="input"
              value={asAtDate}
              onChange={(e) => setAsAtDate(e.target.value)}
            />
          </div>
          <button
            onClick={() => window.print()}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Printer size={16} />
            Print
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                  <div className="h-6 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))
          : summaryCards.map((card) => (
              <div key={card.label} className="card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('flex h-7 w-7 items-center justify-center rounded', card.color)}>
                    <card.icon size={14} />
                  </div>
                  <p className="text-xs text-gray-500">{card.label}</p>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(card.value)}
                </p>
              </div>
            ))}
      </div>

      {/* Aged Creditors Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="animate-pulse p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
              </div>
            ))}
          </div>
        ) : !data?.suppliers?.length ? (
          <div className="p-12 text-center">
            <AlertTriangle size={40} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No outstanding creditors</h3>
            <p className="text-sm text-gray-500">All purchase invoices are paid up to {formatDate(asAtDate)}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header">Supplier / Invoice</th>
                  <th className="table-header">Invoice Date</th>
                  <th className="table-header">Due Date</th>
                  <th className="table-header text-right">Days Overdue</th>
                  <th className="table-header text-right">Total</th>
                  <th className="table-header text-right">Paid</th>
                  <th className="table-header text-right">Outstanding</th>
                  <th className="table-header text-center">Age Band</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.suppliers.map((sup) => {
                  const isExpanded = expandedSuppliers.has(sup.supplierId)
                  return (
                    <Fragment key={sup.supplierId}>
                      {/* Supplier Row */}
                      <tr
                        className="bg-gray-50 hover:bg-gray-100 cursor-pointer"
                        onClick={() => toggleSupplier(sup.supplierId)}
                      >
                        <td className="table-cell font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown size={14} className="text-gray-400" />
                            ) : (
                              <ChevronRight size={14} className="text-gray-400" />
                            )}
                            <span>{sup.supplierName}</span>
                            <span className="font-mono text-xs text-gray-400">{sup.supplierCode}</span>
                          </div>
                        </td>
                        <td className="table-cell" />
                        <td className="table-cell" />
                        <td className="table-cell" />
                        <td className="table-cell" />
                        <td className="table-cell" />
                        <td className="table-cell text-right font-semibold">
                          {formatCurrency(sup.total)}
                        </td>
                        <td className="table-cell" />
                      </tr>

                      {/* Invoice Rows */}
                      {isExpanded &&
                        sup.invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-gray-50">
                            <td className="table-cell pl-10">
                              <Link
                                href={`/finance/purchases/${inv.id}`}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                {inv.invoiceNumber}
                              </Link>
                            </td>
                            <td className="table-cell">{formatDate(inv.invoiceDate)}</td>
                            <td className="table-cell">{formatDate(inv.dueDate)}</td>
                            <td className="table-cell text-right">
                              {inv.daysOverdue > 0 ? (
                                <span className="text-red-600 font-medium">{inv.daysOverdue}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="table-cell text-right">{formatCurrency(inv.total)}</td>
                            <td className="table-cell text-right">{formatCurrency(inv.paidAmount)}</td>
                            <td className="table-cell text-right font-medium">
                              {formatCurrency(inv.outstanding)}
                            </td>
                            <td className="table-cell text-center">
                              <span className={AGE_BAND_BADGES[inv.ageBand] || 'badge-gray'}>
                                {inv.ageBand?.replace('_', ' ') || 'Current'}
                              </span>
                            </td>
                          </tr>
                        ))}

                      {/* Supplier Subtotals */}
                      {isExpanded && (
                        <tr className="bg-gray-50 border-t border-gray-300">
                          <td className="table-cell pl-10 text-xs text-gray-500 font-medium" colSpan={4}>
                            Subtotals: Current: {formatCurrency(sup.current)} | 30 Days: {formatCurrency(sup.days30)} | 60 Days: {formatCurrency(sup.days60)} | 90+ Days: {formatCurrency(sup.days90Plus)}
                          </td>
                          <td className="table-cell" colSpan={2} />
                          <td className="table-cell text-right font-semibold text-sm">
                            {formatCurrency(sup.total)}
                          </td>
                          <td className="table-cell" />
                        </tr>
                      )}
                    </Fragment>
                  )
                })}

                {/* Grand Total */}
                <tr className="bg-gray-100 border-t-2 border-gray-400 font-bold">
                  <td className="table-cell text-gray-900" colSpan={4}>
                    Grand Total
                  </td>
                  <td className="table-cell" colSpan={2} />
                  <td className="table-cell text-right text-gray-900">
                    {formatCurrency(data.totals.total)}
                  </td>
                  <td className="table-cell" />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Fragment helper for grouping rows
function Fragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
