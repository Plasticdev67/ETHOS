'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn, formatCurrency, formatDate, formatDateISO } from '@/lib/utils'
import { ArrowLeft, Download, Printer, BarChart3 } from 'lucide-react'

interface Period {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
}

interface TrialBalanceRow {
  accountCode: string
  accountName: string
  accountType: string
  debitBalance: number
  creditBalance: number
}

interface TrialBalanceData {
  rows: TrialBalanceRow[]
  generatedAt: string
  periodName: string | null
  asAtDate: string
}

const TYPE_ORDER = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']

const typeLabels: Record<string, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  EXPENSE: 'Expenses',
}

export default function TrialBalancePage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [asAtDate, setAsAtDate] = useState(formatDateISO(new Date()))
  const [data, setData] = useState<TrialBalanceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load periods on mount
  useEffect(() => {
    async function fetchPeriods() {
      try {
        const res = await fetch('/api/finance/periods')
        if (res.ok) {
          const json = await res.json()
          setPeriods(json)
        }
      } catch {
        // Non-critical
      }
    }
    fetchPeriods()
  }, [])

  async function generateReport() {
    setError(null)
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedPeriod) params.set('periodId', selectedPeriod)
      if (asAtDate) params.set('asAtDate', asAtDate)

      const res = await fetch(`/api/finance/reports/trial-balance?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to generate trial balance')
      const json = await res.json()
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  function exportCSV() {
    if (!data) return
    const header = 'Account Code,Account Name,Type,Debit Balance,Credit Balance\n'
    const rows = data.rows
      .map(
        (r) =>
          `"${r.accountCode}","${r.accountName}","${r.accountType}",${r.debitBalance},${r.creditBalance}`
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trial-balance-${asAtDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handlePrint() {
    window.print()
  }

  // Group rows by type
  function getGroupedRows() {
    if (!data) return []

    return TYPE_ORDER.map((type) => {
      const rows = data.rows.filter((r) => r.accountType === type)
      const subtotalDebit = rows.reduce((sum, r) => sum + r.debitBalance, 0)
      const subtotalCredit = rows.reduce((sum, r) => sum + r.creditBalance, 0)
      return { type, label: typeLabels[type] || type, rows, subtotalDebit, subtotalCredit }
    }).filter((g) => g.rows.length > 0)
  }

  const grouped = getGroupedRows()
  const grandTotalDebit = data?.rows.reduce((sum, r) => sum + r.debitBalance, 0) || 0
  const grandTotalCredit = data?.rows.reduce((sum, r) => sum + r.creditBalance, 0) || 0
  const isBalanced = Math.abs(grandTotalDebit - grandTotalCredit) < 0.005

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/finance/reports"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Reports
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Trial Balance</h1>
        <p className="mt-1 text-sm text-gray-500">
          View account balances to verify debits equal credits
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
          {/* Period selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="label">Accounting Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="input"
            >
              <option value="">All periods</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </select>
          </div>

          {/* As At Date */}
          <div className="flex-1 min-w-[200px]">
            <label className="label">As At Date</label>
            <input
              type="date"
              value={asAtDate}
              onChange={(e) => setAsAtDate(e.target.value)}
              className="input"
            />
          </div>

          {/* Generate button */}
          <div>
            <button
              onClick={generateReport}
              disabled={loading}
              className="btn-primary"
            >
              <BarChart3 size={16} className="mr-2" />
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {/* Export buttons */}
          {data && (
            <>
              <div>
                <button onClick={exportCSV} className="btn-secondary">
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
        <div className="card p-6 animate-pulse space-y-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-20 rounded bg-gray-200" />
              <div className="h-4 flex-1 rounded bg-gray-200" />
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="h-4 w-24 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="card overflow-hidden" id="trial-balance-report">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Trial Balance as at {formatDate(data.asAtDate)}
            </h2>
            {data.periodName && (
              <p className="text-sm text-gray-500">Period: {data.periodName}</p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Code</th>
                  <th className="table-header">Account Name</th>
                  <th className="table-header text-right">Debit Balance</th>
                  <th className="table-header text-right">Credit Balance</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((group) => (
                  <tbody key={group.type}>
                    {/* Type header */}
                    <tr className="bg-gray-100">
                      <td
                        colSpan={4}
                        className="px-4 py-2 text-sm font-bold text-gray-700 uppercase tracking-wide"
                      >
                        {group.label}
                      </td>
                    </tr>
                    {/* Account rows */}
                    {group.rows.map((row) => (
                      <tr key={row.accountCode} className="hover:bg-gray-50">
                        <td className="table-cell font-mono text-sm">{row.accountCode}</td>
                        <td className="table-cell">{row.accountName}</td>
                        <td className="table-cell text-right font-mono">
                          {row.debitBalance > 0 ? formatCurrency(row.debitBalance) : '—'}
                        </td>
                        <td className="table-cell text-right font-mono">
                          {row.creditBalance > 0 ? formatCurrency(row.creditBalance) : '—'}
                        </td>
                      </tr>
                    ))}
                    {/* Subtotal row */}
                    <tr className="border-t border-gray-300 bg-gray-50">
                      <td className="table-cell" />
                      <td className="table-cell font-semibold text-gray-700 text-right">
                        {group.label} Subtotal
                      </td>
                      <td className="table-cell text-right font-mono font-semibold">
                        {group.subtotalDebit > 0 ? formatCurrency(group.subtotalDebit) : '—'}
                      </td>
                      <td className="table-cell text-right font-mono font-semibold">
                        {group.subtotalCredit > 0 ? formatCurrency(group.subtotalCredit) : '—'}
                      </td>
                    </tr>
                  </tbody>
                ))}
              </tbody>
              <tfoot>
                <tr
                  className={cn(
                    'border-t-2 border-gray-400 font-bold',
                    isBalanced ? 'bg-green-50' : 'bg-red-50'
                  )}
                >
                  <td className="table-cell" />
                  <td className="table-cell text-right text-base">Grand Total</td>
                  <td className="table-cell text-right font-mono text-base">
                    {formatCurrency(grandTotalDebit)}
                  </td>
                  <td className="table-cell text-right font-mono text-base">
                    {formatCurrency(grandTotalCredit)}
                  </td>
                </tr>
                {!isBalanced && (
                  <tr className="bg-red-50">
                    <td colSpan={4} className="table-cell text-center text-red-700 font-medium">
                      WARNING: Trial balance is not balanced. Difference:{' '}
                      {formatCurrency(Math.abs(grandTotalDebit - grandTotalCredit))}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="card py-16 text-center">
          <BarChart3 size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            Select a period and date, then click Generate to view the trial balance
          </p>
        </div>
      )}
    </div>
  )
}
