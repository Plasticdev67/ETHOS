'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { cn, formatCurrency, formatDate, formatDateISO } from '@/lib/utils'
import {
  FileText,
  Printer,
  Calendar,
  Building2,
  ArrowLeft,
} from 'lucide-react'

interface Transaction {
  id: string
  date: string
  reference: string
  description: string
  debit: number
  credit: number
  balance: number
}

interface StatementData {
  customer: {
    id: string
    code: string
    name: string
    contactName: string | null
    addressLine1: string | null
    addressLine2: string | null
    city: string | null
    county: string | null
    postcode: string | null
    country: string | null
    email: string | null
    phone: string | null
  }
  openingBalance: number
  totalInvoiced: number
  totalPaid: number
  totalCredits: number
  closingBalance: number
  transactions: Transaction[]
}

export default function CustomerStatementPage() {
  const params = useParams()
  const customerId = params.customerId as string

  const [data, setData] = useState<StatementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Period filter
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90)

  const [fromDate, setFromDate] = useState(formatDateISO(thirtyDaysAgo))
  const [toDate, setToDate] = useState(formatDateISO(today))

  useEffect(() => {
    async function fetchStatement() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (fromDate) params.set('from', fromDate)
        if (toDate) params.set('to', toDate)

        const res = await fetch(
          `/api/finance/sales/statements/${customerId}?${params.toString()}`
        )
        if (!res.ok) throw new Error('Failed to load customer statement')

        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchStatement()
  }, [customerId, fromDate, toDate])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded w-1/2" />
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-6"><div className="h-24 bg-gray-200 rounded" /></div>
            <div className="card p-6"><div className="h-24 bg-gray-200 rounded" /></div>
          </div>
          <div className="card p-6">
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
        <Link href="/finance/sales" className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to Sales Ledger
        </Link>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 print:hidden">
        <Link href="/finance/sales" className="hover:text-gray-700">Sales Ledger</Link>
        <span>/</span>
        <Link href={`/finance/sales/customers/${customerId}`} className="hover:text-gray-700">
          {data.customer.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Statement</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statement of Account</h1>
          <p className="text-sm text-gray-500 mt-1">{data.customer.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-gray-400" />
            <label className="label mb-0">From:</label>
            <input
              type="date"
              className="input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <label className="label mb-0 ml-2">To:</label>
            <input
              type="date"
              className="input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
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

      {/* Print Header (visible only when printing) */}
      <div className="hidden print:block space-y-4 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold">Statement of Account</h1>
            <p className="text-sm text-gray-500">
              {formatDate(fromDate)} to {formatDate(toDate)}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold">MME Finance</p>
            <p>Generated {formatDate(new Date().toISOString())}</p>
          </div>
        </div>
      </div>

      {/* Customer Address Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Building2 size={16} className="text-gray-400" />
            Customer
          </h3>
          <div className="text-sm text-gray-600 space-y-0.5">
            <p className="font-semibold text-gray-900">{data.customer.name}</p>
            <p className="text-gray-400 font-mono text-xs">{data.customer.code}</p>
            {data.customer.contactName && <p>{data.customer.contactName}</p>}
            {data.customer.addressLine1 && (
              <>
                <p>{data.customer.addressLine1}</p>
                {data.customer.addressLine2 && <p>{data.customer.addressLine2}</p>}
                <p>
                  {[data.customer.city, data.customer.county, data.customer.postcode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                {data.customer.country && <p>{data.customer.country}</p>}
              </>
            )}
            {data.customer.email && <p className="mt-2">{data.customer.email}</p>}
            {data.customer.phone && <p>{data.customer.phone}</p>}
          </div>
        </div>

        {/* Summary */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText size={16} className="text-gray-400" />
            Summary
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Opening Balance</span>
              <span className="font-medium">{formatCurrency(data.openingBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Invoiced</span>
              <span className="font-medium">{formatCurrency(data.totalInvoiced)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Paid</span>
              <span className="font-medium text-green-600">{formatCurrency(data.totalPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Credits</span>
              <span className="font-medium text-orange-600">{formatCurrency(data.totalCredits)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="font-semibold text-gray-900">Closing Balance</span>
              <span className={cn(
                'text-base font-bold',
                data.closingBalance > 0 ? 'text-red-600' : 'text-green-600'
              )}>
                {formatCurrency(data.closingBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Transaction List */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Transactions</h3>
        </div>

        {data.transactions.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No transactions</h3>
            <p className="text-sm text-gray-500">No transactions found for the selected period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Reference</th>
                  <th className="table-header">Description</th>
                  <th className="table-header text-right">Debit</th>
                  <th className="table-header text-right">Credit</th>
                  <th className="table-header text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Opening balance row */}
                <tr className="bg-gray-50">
                  <td className="table-cell font-medium" colSpan={3}>
                    Opening Balance
                  </td>
                  <td className="table-cell" />
                  <td className="table-cell" />
                  <td className="table-cell text-right font-medium">
                    {formatCurrency(data.openingBalance)}
                  </td>
                </tr>

                {data.transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="table-cell">{formatDate(txn.date)}</td>
                    <td className="table-cell">
                      <span className="font-medium text-blue-600">{txn.reference}</span>
                    </td>
                    <td className="table-cell">{txn.description}</td>
                    <td className="table-cell text-right">
                      {txn.debit > 0 ? formatCurrency(txn.debit) : ''}
                    </td>
                    <td className="table-cell text-right">
                      {txn.credit > 0 ? (
                        <span className="text-green-600">{formatCurrency(txn.credit)}</span>
                      ) : (
                        ''
                      )}
                    </td>
                    <td className="table-cell text-right font-medium">
                      {formatCurrency(txn.balance)}
                    </td>
                  </tr>
                ))}

                {/* Closing balance row */}
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                  <td className="table-cell text-gray-900" colSpan={3}>
                    Closing Balance
                  </td>
                  <td className="table-cell text-right">
                    {formatCurrency(data.totalInvoiced)}
                  </td>
                  <td className="table-cell text-right text-green-600">
                    {formatCurrency(data.totalPaid + data.totalCredits)}
                  </td>
                  <td className="table-cell text-right text-gray-900">
                    {formatCurrency(data.closingBalance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .space-y-6,
          .space-y-6 * {
            visibility: visible;
          }
          .space-y-6 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .card {
            box-shadow: none;
            border: 1px solid #e5e7eb;
          }
        }
      `}</style>
    </div>
  )
}
