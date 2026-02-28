'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn, formatCurrency, formatDate, formatDateISO } from '@/lib/utils'
import { BarChart3, Printer, Download, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'

interface AccountRow {
  accountCode: string
  accountName: string
  amount: number
}

interface BalanceSheetSection {
  accounts: AccountRow[]
  total: number
}

interface BalanceSheetData {
  asAt: string
  generatedAt: string
  fixedAssets: BalanceSheetSection
  currentAssets: BalanceSheetSection
  totalAssets: number
  currentLiabilities: BalanceSheetSection
  longTermLiabilities: BalanceSheetSection
  totalLiabilities: number
  equity: {
    accounts: AccountRow[]
    retainedEarnings: number
    total: number
  }
  totalLiabilitiesAndEquity: number
  isBalanced: boolean
}

export default function BalanceSheetPage() {
  const [asAtDate, setAsAtDate] = useState(formatDateISO(new Date()))
  const [data, setData] = useState<BalanceSheetData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generateReport() {
    setError(null)
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (asAtDate) params.set('asAt', asAtDate)

      const res = await fetch(`/api/finance/reports/balance-sheet?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to generate Balance Sheet')
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
    const lines: string[] = ['Section,Account Code,Account Name,Amount']

    const addSection = (section: string, accounts: AccountRow[], total: number) => {
      accounts.forEach((r) => {
        lines.push(`"${section}","${r.accountCode}","${r.accountName}",${r.amount}`)
      })
      lines.push(`"${section}","","Total",${total}`)
    }

    addSection('Fixed Assets', data.fixedAssets.accounts, data.fixedAssets.total)
    addSection('Current Assets', data.currentAssets.accounts, data.currentAssets.total)
    lines.push(`"","","Total Assets",${data.totalAssets}`)
    addSection('Current Liabilities', data.currentLiabilities.accounts, data.currentLiabilities.total)
    addSection('Long-term Liabilities', data.longTermLiabilities.accounts, data.longTermLiabilities.total)
    lines.push(`"","","Total Liabilities",${data.totalLiabilities}`)
    data.equity.accounts.forEach((r) => {
      lines.push(`"Equity","${r.accountCode}","${r.accountName}",${r.amount}`)
    })
    lines.push(`"Equity","","Retained Earnings",${data.equity.retainedEarnings}`)
    lines.push(`"Equity","","Total Equity",${data.equity.total}`)
    lines.push(`"","","Total Liabilities & Equity",${data.totalLiabilitiesAndEquity}`)

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `balance-sheet-${asAtDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/finance/reports" className="hover:text-gray-700">
            Reports
          </Link>
          <span>/</span>
          <span className="text-gray-900">Balance Sheet</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Balance Sheet</h1>
        <p className="mt-1 text-sm text-gray-500">
          Statement of financial position showing assets, liabilities, and equity
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
          <div className="flex-1 min-w-[200px]">
            <label className="label">As at Date</label>
            <input
              type="date"
              value={asAtDate}
              onChange={(e) => setAsAtDate(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <button
              onClick={generateReport}
              disabled={loading}
              className="btn-primary"
            >
              <BarChart3 size={16} className="mr-2" />
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>

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
        <div className="card p-6 animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6" />
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="card overflow-hidden" id="balance-sheet-report">
          {/* Report Header */}
          <div className="border-b border-gray-200 px-6 py-4 bg-white">
            <h2 className="text-lg font-bold text-gray-900 text-center">
              Balance Sheet
            </h2>
            <p className="text-sm text-gray-500 text-center mt-1">
              As at {formatDate(data.asAt)}
            </p>
          </div>

          <div className="px-6 py-4">
            {/* ========== ASSETS ========== */}

            {/* Fixed Assets */}
            <BSSection title="Fixed Assets" accounts={data.fixedAssets.accounts} total={data.fixedAssets.total} />

            {/* Current Assets */}
            <BSSection title="Current Assets" accounts={data.currentAssets.accounts} total={data.currentAssets.total} />

            {/* Total Assets */}
            <div className="flex justify-between items-center py-3 px-4 bg-blue-50 border-t-2 border-b-2 border-blue-200 my-4 rounded">
              <span className="text-base font-bold text-gray-900">Total Assets</span>
              <span className="text-base font-bold font-mono text-gray-900">
                {formatCurrency(data.totalAssets)}
              </span>
            </div>

            {/* Divider */}
            <div className="border-t-2 border-gray-300 my-6" />

            {/* ========== LIABILITIES ========== */}

            {/* Current Liabilities */}
            <BSSection title="Current Liabilities" accounts={data.currentLiabilities.accounts} total={data.currentLiabilities.total} />

            {/* Long-term Liabilities */}
            <BSSection title="Long-term Liabilities" accounts={data.longTermLiabilities.accounts} total={data.longTermLiabilities.total} />

            {/* Total Liabilities */}
            <div className="flex justify-between items-center py-2 px-4 border-t border-gray-300 bg-gray-50 mb-4">
              <span className="text-sm font-bold text-gray-700">Total Liabilities</span>
              <span className="text-sm font-bold font-mono text-gray-900">
                {formatCurrency(data.totalLiabilities)}
              </span>
            </div>

            {/* ========== EQUITY ========== */}
            <div className="mt-4 mb-1 py-2 px-4 bg-gray-100 rounded-t">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Equity</h3>
            </div>
            {data.equity.accounts.map((row, idx) => (
              <BSAccountRow key={row.accountCode} row={row} isEven={idx % 2 === 0} />
            ))}
            {/* Retained Earnings line */}
            <div
              className={cn(
                'flex justify-between items-center py-2 px-4 text-sm',
                data.equity.accounts.length % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-gray-400 w-14" />
                <span className="text-gray-700 italic">Retained Earnings</span>
              </div>
              <span className="font-mono text-gray-900">
                {formatCurrency(data.equity.retainedEarnings)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 px-4 border-t border-gray-300 bg-gray-50">
              <span className="text-sm font-semibold text-gray-700">Total Equity</span>
              <span className="text-sm font-semibold font-mono text-gray-900 border-b border-gray-400">
                {formatCurrency(data.equity.total)}
              </span>
            </div>

            {/* Total Liabilities & Equity */}
            <div className="flex justify-between items-center py-3 px-4 bg-blue-50 border-t-2 border-b-2 border-blue-200 my-4 rounded">
              <span className="text-base font-bold text-gray-900">
                Total Liabilities &amp; Equity
              </span>
              <span className="text-base font-bold font-mono text-gray-900">
                {formatCurrency(data.totalLiabilitiesAndEquity)}
              </span>
            </div>

            {/* Balance Check */}
            <div
              className={cn(
                'flex items-center justify-center gap-2 py-3 px-4 rounded mt-4',
                data.isBalanced
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              )}
            >
              {data.isBalanced ? (
                <>
                  <CheckCircle2 size={20} className="text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Balance sheet is balanced - Assets equal Liabilities &amp; Equity
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle size={20} className="text-red-600" />
                  <span className="text-sm font-medium text-red-800">
                    WARNING: Balance sheet is NOT balanced. Difference:{' '}
                    {formatCurrency(Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity))}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex items-center gap-2 text-xs text-gray-400">
            <Clock size={12} />
            Generated at {formatDate(data.generatedAt)}{' '}
            {new Date(data.generatedAt).toLocaleTimeString('en-GB')}
          </div>
        </div>
      ) : (
        <div className="card py-16 text-center">
          <BarChart3 size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            Select a date and click Generate Report to view the Balance Sheet
          </p>
        </div>
      )}
    </div>
  )
}

/* -- Sub-components -- */

function BSSection({
  title,
  accounts,
  total,
}: {
  title: string
  accounts: AccountRow[]
  total: number
}) {
  return (
    <>
      <div className="mt-4 mb-1 py-2 px-4 bg-gray-100 rounded-t">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
      </div>
      {accounts.length > 0 ? (
        accounts.map((row, idx) => (
          <BSAccountRow key={row.accountCode} row={row} isEven={idx % 2 === 0} />
        ))
      ) : (
        <div className="py-2 px-4 text-sm text-gray-400 italic">No {title.toLowerCase()} entries</div>
      )}
      <div className="flex justify-between items-center py-2 px-4 border-t border-gray-300 bg-gray-50">
        <span className="text-sm font-semibold text-gray-700">Total {title}</span>
        <span className="text-sm font-semibold font-mono text-gray-900 border-b border-gray-400">
          {formatCurrency(total)}
        </span>
      </div>
    </>
  )
}

function BSAccountRow({ row, isEven }: { row: AccountRow; isEven: boolean }) {
  return (
    <div
      className={cn(
        'flex justify-between items-center py-2 px-4 text-sm',
        isEven ? 'bg-white' : 'bg-gray-50'
      )}
    >
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-gray-400 w-14">{row.accountCode}</span>
        <span className="text-gray-700">{row.accountName}</span>
      </div>
      <span className="font-mono text-gray-900">{formatCurrency(row.amount)}</span>
    </div>
  )
}
