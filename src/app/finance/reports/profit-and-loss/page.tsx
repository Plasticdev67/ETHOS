'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn, formatCurrency, formatDate, formatDateISO } from '@/lib/utils'
import { BarChart3, Download, Printer, Clock } from 'lucide-react'

interface Period {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
}

interface AccountRow {
  accountCode: string
  accountName: string
  amount: number
}

interface ProfitAndLossData {
  periodName: string | null
  dateFrom: string
  dateTo: string
  generatedAt: string
  revenue: {
    accounts: AccountRow[]
    total: number
  }
  costOfSales: {
    accounts: AccountRow[]
    total: number
  }
  grossProfit: number
  overheads: {
    accounts: AccountRow[]
    total: number
  }
  netProfit: number
}

export default function ProfitAndLossPage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(formatDateISO(new Date()))
  const [data, setData] = useState<ProfitAndLossData | null>(null)
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
      if (selectedPeriod) {
        params.set('periodId', selectedPeriod)
      } else {
        if (dateFrom) params.set('dateFrom', dateFrom)
        if (dateTo) params.set('dateTo', dateTo)
      }

      const res = await fetch(`/api/finance/reports/profit-and-loss?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to generate Profit & Loss report')
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
    const lines: string[] = ['Account Code,Account Name,Section,Amount']

    data.revenue.accounts.forEach((r) => {
      lines.push(`"${r.accountCode}","${r.accountName}","Revenue",${r.amount}`)
    })
    lines.push(`"","Revenue Total","Revenue",${data.revenue.total}`)

    data.costOfSales.accounts.forEach((r) => {
      lines.push(`"${r.accountCode}","${r.accountName}","Cost of Sales",${r.amount}`)
    })
    lines.push(`"","Cost of Sales Total","Cost of Sales",${data.costOfSales.total}`)
    lines.push(`"","Gross Profit","",${data.grossProfit}`)

    data.overheads.accounts.forEach((r) => {
      lines.push(`"${r.accountCode}","${r.accountName}","Overheads",${r.amount}`)
    })
    lines.push(`"","Overheads Total","Overheads",${data.overheads.total}`)
    lines.push(`"","Net Profit","",${data.netProfit}`)

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `profit-and-loss-${dateTo || formatDateISO(new Date())}.csv`
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
          <span className="text-gray-900">Profit &amp; Loss</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Profit &amp; Loss</h1>
        <p className="mt-1 text-sm text-gray-500">
          Income and expenditure statement for a selected period or date range
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
              onChange={(e) => {
                setSelectedPeriod(e.target.value)
                if (e.target.value) {
                  setDateFrom('')
                  setDateTo('')
                }
              }}
              className="input"
            >
              <option value="">-- Use date range instead --</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="flex-1 min-w-[160px]">
            <label className="label">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setSelectedPeriod('')
              }}
              className="input"
              disabled={!!selectedPeriod}
            />
          </div>

          {/* Date To */}
          <div className="flex-1 min-w-[160px]">
            <label className="label">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setSelectedPeriod('')
              }}
              className="input"
              disabled={!!selectedPeriod}
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
              {loading ? 'Generating...' : 'Generate Report'}
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
        <div className="card p-6 animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6" />
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="card overflow-hidden" id="pnl-report">
          {/* Report Header */}
          <div className="border-b border-gray-200 px-6 py-4 bg-white">
            <h2 className="text-lg font-bold text-gray-900 text-center">
              Profit &amp; Loss Statement
            </h2>
            {data.periodName && (
              <p className="text-sm text-gray-500 text-center mt-1">
                Period: {data.periodName}
              </p>
            )}
            <p className="text-sm text-gray-500 text-center mt-1">
              {formatDate(data.dateFrom)} to {formatDate(data.dateTo)}
            </p>
          </div>

          <div className="px-6 py-4">
            {/* Revenue Section */}
            <SectionHeader title="Revenue" />
            {data.revenue.accounts.map((row, idx) => (
              <AccountRowLine key={row.accountCode} row={row} isEven={idx % 2 === 0} />
            ))}
            <SectionTotal label="Total Revenue" amount={data.revenue.total} />

            {/* Cost of Sales Section */}
            <SectionHeader title="Cost of Sales" />
            {data.costOfSales.accounts.length > 0 ? (
              data.costOfSales.accounts.map((row, idx) => (
                <AccountRowLine key={row.accountCode} row={row} isEven={idx % 2 === 0} />
              ))
            ) : (
              <div className="py-2 px-4 text-sm text-gray-400 italic">No cost of sales entries</div>
            )}
            <SectionTotal label="Total Cost of Sales" amount={data.costOfSales.total} />

            {/* Gross Profit */}
            <div className="flex justify-between items-center py-3 px-4 bg-blue-50 border-t-2 border-b-2 border-blue-200 my-4 rounded">
              <span className="text-base font-bold text-gray-900">Gross Profit</span>
              <span
                className={cn(
                  'text-base font-bold font-mono',
                  data.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'
                )}
              >
                {formatCurrency(data.grossProfit)}
              </span>
            </div>

            {/* Overheads Section */}
            <SectionHeader title="Overheads" />
            {data.overheads.accounts.length > 0 ? (
              data.overheads.accounts.map((row, idx) => (
                <AccountRowLine key={row.accountCode} row={row} isEven={idx % 2 === 0} />
              ))
            ) : (
              <div className="py-2 px-4 text-sm text-gray-400 italic">No overhead entries</div>
            )}
            <SectionTotal label="Total Overheads" amount={data.overheads.total} />

            {/* Net Profit */}
            <div
              className={cn(
                'flex justify-between items-center py-4 px-4 mt-6 rounded border-2',
                data.netProfit >= 0
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
              )}
            >
              <span className="text-lg font-bold text-gray-900">Net Profit</span>
              <span
                className={cn(
                  'text-lg font-bold font-mono',
                  data.netProfit >= 0 ? 'text-green-700' : 'text-red-700'
                )}
              >
                {formatCurrency(data.netProfit)}
              </span>
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
            Select a period or date range, then click Generate Report to view the Profit &amp; Loss statement
          </p>
        </div>
      )}
    </div>
  )
}

/* -- Sub-components -- */

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mt-4 mb-1 py-2 px-4 bg-gray-100 rounded-t">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
    </div>
  )
}

function AccountRowLine({ row, isEven }: { row: AccountRow; isEven: boolean }) {
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

function SectionTotal({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between items-center py-2 px-4 border-t border-gray-300 bg-gray-50">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <span className="text-sm font-semibold font-mono text-gray-900 border-b border-gray-400">
        {formatCurrency(amount)}
      </span>
    </div>
  )
}
