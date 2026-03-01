'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  CheckCircle2,
  XCircle,
  FileUp,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
} from 'lucide-react'

interface BankAccount {
  id: string
  accountName: string
  accountNumber: string
  sortCode: string
  currentBalance: number
  unreconciledCount: number
  currency: string
  glAccount?: { id: string; code: string; name: string }
}

interface Transaction {
  id: string
  date: string
  description: string
  reference: string
  amount: number
  balance: number
  type: string
  source: string
  isReconciled: boolean
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Summary {
  totalIn: number
  totalOut: number
  netMovement: number
}

const SOURCE_BADGES: Record<string, string> = {
  RECEIPT: 'badge-success',
  PAYMENT: 'badge-warning',
  TRANSFER: 'badge-info',
  IMPORT: 'badge-gray',
  MANUAL: 'badge-gray',
  OPENING: 'badge-gray',
}

export default function BankAccountDetailPage() {
  const params = useParams()
  const accountId = params.id as string

  const [account, setAccount] = useState<BankAccount | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingTxns, setLoadingTxns] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [reconciledFilter, setReconciledFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const limit = 25

  // Fetch account details
  useEffect(() => {
    async function fetchAccount() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/finance/bank/accounts/${accountId}`)
        if (!res.ok) throw new Error('Failed to load bank account')

        const data = await res.json()
        setAccount(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchAccount()
  }, [accountId])

  // Fetch transactions with filters
  const fetchTransactions = useCallback(async () => {
    try {
      setLoadingTxns(true)

      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))

      if (searchQuery.trim()) params.set('search', searchQuery.trim())
      if (reconciledFilter === 'yes') params.set('reconciled', 'true')
      if (reconciledFilter === 'no') params.set('reconciled', 'false')
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await fetch(
        `/api/finance/bank/accounts/${accountId}/transactions?${params.toString()}`
      )
      if (!res.ok) throw new Error('Failed to load transactions')

      const data = await res.json()

      if (Array.isArray(data)) {
        setTransactions(data)
        setPagination(null)
        setSummary(null)
      } else {
        setTransactions(data.data || [])
        setPagination(data.pagination || null)
        setSummary(data.summary || null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoadingTxns(false)
    }
  }, [accountId, page, searchQuery, reconciledFilter, dateFrom, dateTo])

  useEffect(() => {
    if (accountId) fetchTransactions()
  }, [fetchTransactions, accountId])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [searchQuery, reconciledFilter, dateFrom, dateTo])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-7 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !account) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/finance/bank" className="hover:text-gray-700">
            Bank & Payments
          </Link>
          <span>/</span>
          <span className="text-gray-900">Account</span>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/finance/bank" className="hover:text-gray-700">
          Bank & Payments
        </Link>
        <span>/</span>
        <span className="text-gray-900">{account?.accountName}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {account?.accountName}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {account?.sortCode} / {account?.accountNumber}
              {account?.glAccount && (
                <span className="ml-2 text-gray-400">
                  (GL: {account.glAccount.code} - {account.glAccount.name})
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/finance/bank/receive"
            className="btn-primary inline-flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700"
          >
            <ArrowDownLeft size={14} />
            Receive Payment
          </Link>
          <Link
            href="/finance/bank/pay"
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <ArrowUpRight size={14} />
            Make Payment
          </Link>
          <Link
            href={`/finance/bank/accounts/${accountId}/reconcile`}
            className="btn-ghost inline-flex items-center gap-2 text-sm"
          >
            <ClipboardCheck size={14} />
            Reconcile
          </Link>
          <Link
            href={`/finance/bank/accounts/${accountId}/import`}
            className="btn-ghost inline-flex items-center gap-2 text-sm"
          >
            <FileUp size={14} />
            Import Statement
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-xs text-gray-500">Current Balance</p>
          <p
            className={cn(
              'text-xl font-bold mt-1',
              (account?.currentBalance ?? 0) >= 0
                ? 'text-gray-900'
                : 'text-red-600'
            )}
          >
            {formatCurrency(account?.currentBalance ?? 0)}
          </p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <ArrowDown size={14} className="text-green-500" />
            <p className="text-xs text-gray-500">Total Receipts</p>
          </div>
          <p className="text-xl font-bold text-green-600 mt-1">
            {formatCurrency(summary?.totalIn ?? 0)}
          </p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <ArrowUp size={14} className="text-red-500" />
            <p className="text-xs text-gray-500">Total Payments</p>
          </div>
          <p className="text-xl font-bold text-red-600 mt-1">
            {formatCurrency(summary?.totalOut ?? 0)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500">Unreconciled</p>
          <p className="text-xl font-bold text-yellow-600 mt-1">
            {account?.unreconciledCount ?? 0}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              className="input w-full pl-9"
              placeholder="Search description or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <div>
              <input
                type="date"
                className="input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From date"
              />
            </div>
            <div>
              <input
                type="date"
                className="input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To date"
              />
            </div>
            <select
              className="input"
              value={reconciledFilter}
              onChange={(e) => setReconciledFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="yes">Reconciled</option>
              <option value="no">Unreconciled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="card overflow-hidden">
        {loadingTxns ? (
          <div className="animate-pulse p-6 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/8" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 size={40} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              No transactions found
            </h3>
            <p className="text-sm text-gray-500">
              {searchQuery || reconciledFilter !== 'all' || dateFrom || dateTo
                ? 'Try adjusting your filters.'
                : 'Transactions will appear here when receipts, payments, or imports are recorded.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Description</th>
                  <th className="table-header">Reference</th>
                  <th className="table-header">Source</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header text-right">Balance</th>
                  <th className="table-header text-center">Reconciled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="table-cell">{formatDate(txn.date)}</td>
                    <td className="table-cell font-medium">
                      {txn.description}
                    </td>
                    <td className="table-cell text-gray-500">
                      {txn.reference || '-'}
                    </td>
                    <td className="table-cell">
                      <span
                        className={
                          SOURCE_BADGES[txn.source] || 'badge-gray'
                        }
                      >
                        {txn.source}
                      </span>
                    </td>
                    <td
                      className={cn(
                        'table-cell text-right font-medium',
                        txn.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="table-cell text-right">
                      {txn.balance !== undefined && txn.balance !== null
                        ? formatCurrency(txn.balance)
                        : '-'}
                    </td>
                    <td className="table-cell text-center">
                      {txn.isReconciled ? (
                        <CheckCircle2
                          size={16}
                          className="inline text-green-500"
                        />
                      ) : (
                        <XCircle
                          size={16}
                          className="inline text-gray-300"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * limit + 1} to{' '}
              {Math.min(page * limit, pagination.total)} of {pagination.total}{' '}
              transactions
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-ghost inline-flex items-center gap-1 text-sm disabled:opacity-50"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page >= pagination.totalPages}
                className="btn-ghost inline-flex items-center gap-1 text-sm disabled:opacity-50"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
