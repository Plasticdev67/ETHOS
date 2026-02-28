'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn, formatCurrency, formatDate, formatDateISO } from '@/lib/utils'
import {
  ArrowLeft,
  BarChart3,
  Printer,
  Download,
  Clock,
  BookOpen,
  Search,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

interface Account {
  id: string
  code: string
  name: string
  type: string
  normalBalance: string
}

interface TransactionRow {
  date: string
  entryNo: string
  reference: string
  description: string
  source: string
  debit: number
  credit: number
  runningBalance: number
}

interface NominalActivityData {
  account: {
    code: string
    name: string
    type: string
    normalBalance: string
  }
  dateFrom: string
  dateTo: string
  generatedAt: string
  openingBalance: number
  transactions: TransactionRow[]
  closingBalance: number
  summary: {
    totalDebits: number
    totalCredits: number
    netMovement: number
    transactionCount: number
  }
}

const SOURCE_BADGES: Record<string, string> = {
  MANUAL: 'badge-gray',
  SALES: 'badge-info',
  PURCHASES: 'badge-warning',
  BANK: 'badge-success',
  VAT: 'badge-danger',
  SYSTEM: 'badge-gray',
  CONTRACT: 'badge-info',
  OPENING: 'badge-gray',
}

export default function NominalActivityPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(formatDateISO(new Date()))
  const [data, setData] = useState<NominalActivityData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accountSearch, setAccountSearch] = useState('')

  // Load accounts on mount
  useEffect(() => {
    async function fetchAccounts() {
      try {
        setLoadingAccounts(true)
        const res = await fetch('/api/finance/accounts?active=true')
        if (res.ok) {
          const json = await res.json()
          // Handle both array response and paginated response
          const accountList = Array.isArray(json) ? json : json.accounts || []
          setAccounts(accountList)
        }
      } catch {
        // Non-critical
      } finally {
        setLoadingAccounts(false)
      }
    }
    fetchAccounts()
  }, [])

  async function viewActivity() {
    if (!selectedAccount) {
      setError('Please select an account')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('accountId', selectedAccount)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await fetch(`/api/finance/reports/nominal-activity?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load nominal activity')
      const json = await res.json()
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  function handleExport() {
    if (!data) return
    const lines: string[] = ['Date,Entry No,Reference,Description,Source,Debit,Credit,Running Balance']

    lines.push(`"Opening Balance","","","","",,,${data.openingBalance}`)
    data.transactions.forEach((t) => {
      lines.push(
        `"${t.date}","${t.entryNo}","${t.reference}","${t.description}","${t.source}",${t.debit || ''},${t.credit || ''},${t.runningBalance}`
      )
    })
    lines.push(`"Closing Balance","","","","",,,${data.closingBalance}`)

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nominal-activity-${data.account.code}-${dateTo || formatDateISO(new Date())}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Filter accounts for the dropdown
  const filteredAccounts = accountSearch
    ? accounts.filter(
        (a) =>
          a.code.toLowerCase().includes(accountSearch.toLowerCase()) ||
          a.name.toLowerCase().includes(accountSearch.toLowerCase())
      )
    : accounts

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/finance/reports" className="hover:text-gray-700">
            Reports
          </Link>
          <span>/</span>
          <span className="text-gray-900">Nominal Activity</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Nominal Activity</h1>
        <p className="mt-1 text-sm text-gray-500">
          Transaction-level detail for any nominal account over a date range
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Account selector */}
          <div className="flex-1 min-w-[280px]">
            <label className="label">Account</label>
            {loadingAccounts ? (
              <div className="input bg-gray-100 animate-pulse h-10" />
            ) : (
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="input"
              >
                <option value="">-- Select account --</option>
                {filteredAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name} ({a.type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date From */}
          <div className="min-w-[160px]">
            <label className="label">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input"
            />
          </div>

          {/* Date To */}
          <div className="min-w-[160px]">
            <label className="label">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input"
            />
          </div>

          {/* View Activity button */}
          <div>
            <button
              onClick={viewActivity}
              disabled={loading || !selectedAccount}
              className="btn-primary"
            >
              <BarChart3 size={16} className="mr-2" />
              {loading ? 'Loading...' : 'View Activity'}
            </button>
          </div>

          {/* Action buttons */}
          {data && (
            <>
              <div>
                <button onClick={handleExport} className="btn-secondary">
                  <Download size={16} className="mr-2" />
                  Export CSV
                </button>
              </div>
              <div>
                <button onClick={handlePrint} className="btn-secondary">
                  <Printer size={16} className="mr-2" />
                  Print
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-4">
          <div className="card p-4 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
          </div>
          <div className="card p-6 animate-pulse space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-20 rounded bg-gray-200" />
                <div className="h-4 w-16 rounded bg-gray-200" />
                <div className="h-4 w-16 rounded bg-gray-200" />
                <div className="h-4 flex-1 rounded bg-gray-200" />
                <div className="h-4 w-14 rounded bg-gray-200" />
                <div className="h-4 w-20 rounded bg-gray-200" />
                <div className="h-4 w-20 rounded bg-gray-200" />
                <div className="h-4 w-24 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      ) : data ? (
        <div className="space-y-4" id="nominal-activity-report">
          {/* Account Header Card */}
          <div className="card p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <BookOpen size={20} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">
                  {data.account.code} - {data.account.name}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="badge-info text-xs">{data.account.type}</span>
                  <span className="text-xs text-gray-500">
                    Normal Balance: {data.account.normalBalance}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {formatDate(data.dateFrom)} to {formatDate(data.dateTo)}
                </p>
              </div>
            </div>
          </div>

          {/* Transaction Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Entry No</th>
                    <th className="table-header">Reference</th>
                    <th className="table-header">Description</th>
                    <th className="table-header">Source</th>
                    <th className="table-header text-right">Debit</th>
                    <th className="table-header text-right">Credit</th>
                    <th className="table-header text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Opening Balance Row */}
                  <tr className="bg-gray-100">
                    <td className="table-cell" colSpan={5}>
                      <span className="font-semibold text-gray-700">Opening Balance</span>
                    </td>
                    <td className="table-cell" />
                    <td className="table-cell" />
                    <td className="table-cell text-right font-mono font-semibold text-gray-700">
                      {formatCurrency(data.openingBalance)}
                    </td>
                  </tr>

                  {/* Transaction Rows */}
                  {data.transactions.length > 0 ? (
                    data.transactions.map((txn, idx) => (
                      <tr
                        key={`${txn.entryNo}-${idx}`}
                        className={cn(
                          'hover:bg-gray-50',
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        )}
                      >
                        <td className="table-cell text-sm">{formatDate(txn.date)}</td>
                        <td className="table-cell font-mono text-sm text-gray-600">
                          {txn.entryNo}
                        </td>
                        <td className="table-cell text-sm">{txn.reference || '—'}</td>
                        <td className="table-cell text-sm">{txn.description}</td>
                        <td className="table-cell">
                          <span className={cn('text-xs', SOURCE_BADGES[txn.source] || 'badge-gray')}>
                            {txn.source}
                          </span>
                        </td>
                        <td className="table-cell text-right font-mono text-sm">
                          {txn.debit > 0 ? formatCurrency(txn.debit) : '—'}
                        </td>
                        <td className="table-cell text-right font-mono text-sm">
                          {txn.credit > 0 ? formatCurrency(txn.credit) : '—'}
                        </td>
                        <td className="table-cell text-right font-mono text-sm font-medium">
                          {formatCurrency(txn.runningBalance)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="table-cell text-center text-gray-400 py-8">
                        No transactions found for this period
                      </td>
                    </tr>
                  )}

                  {/* Closing Balance Row */}
                  <tr className="bg-gray-100 border-t-2 border-gray-300">
                    <td className="table-cell" colSpan={5}>
                      <span className="font-bold text-gray-900">Closing Balance</span>
                    </td>
                    <td className="table-cell" />
                    <td className="table-cell" />
                    <td className="table-cell text-right font-mono font-bold text-gray-900">
                      {formatCurrency(data.closingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-green-50 text-green-600">
                  <ArrowUpRight size={14} />
                </div>
                <p className="text-xs text-gray-500">Total Debits</p>
              </div>
              <p className="text-lg font-semibold text-gray-900 font-mono">
                {formatCurrency(data.summary.totalDebits)}
              </p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600">
                  <ArrowDownRight size={14} />
                </div>
                <p className="text-xs text-gray-500">Total Credits</p>
              </div>
              <p className="text-lg font-semibold text-gray-900 font-mono">
                {formatCurrency(data.summary.totalCredits)}
              </p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600">
                  <BarChart3 size={14} />
                </div>
                <p className="text-xs text-gray-500">Net Movement</p>
              </div>
              <p
                className={cn(
                  'text-lg font-semibold font-mono',
                  data.summary.netMovement >= 0 ? 'text-green-700' : 'text-red-700'
                )}
              >
                {formatCurrency(data.summary.netMovement)}
              </p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-purple-50 text-purple-600">
                  <BookOpen size={14} />
                </div>
                <p className="text-xs text-gray-500">Transaction Count</p>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {data.summary.transactionCount}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock size={12} />
            Generated at {formatDate(data.generatedAt)}{' '}
            {new Date(data.generatedAt).toLocaleTimeString('en-GB')}
          </div>
        </div>
      ) : (
        <div className="card py-16 text-center">
          <BookOpen size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            Select an account and date range, then click View Activity to see transaction detail
          </p>
        </div>
      )}
    </div>
  )
}
