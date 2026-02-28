'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn, formatCurrency } from '@/lib/utils'
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Download,
  Printer,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface MonthlyBreakdown {
  month: string
  monthLabel: string
  budget: string
  actual: string
  variance: string
  variancePercent: string | null
}

interface AccountRow {
  accountId: string
  accountCode: string
  accountName: string
  accountType: string
  accountSubType: string | null
  budget: string
  actual: string
  variance: string
  variancePercent: string | null
  monthly: MonthlyBreakdown[]
}

interface GroupSummary {
  groupName: string
  accounts: AccountRow[]
  totalBudget: string
  totalActual: string
  totalVariance: string
  totalVariancePercent: string | null
}

interface ReportData {
  year: string
  fyStart: string
  fyEnd: string
  months: Array<{ key: string; label: string }>
  groups: GroupSummary[]
  totals: {
    budget: string
    actual: string
    variance: string
    variancePercent: string | null
  }
  generatedAt: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getFinancialYears(): string[] {
  const currentYear = new Date().getFullYear()
  const years: string[] = []
  for (let y = currentYear - 3; y <= currentYear + 2; y++) {
    years.push(`${y}-${y + 1}`)
  }
  return years
}

function getCurrentFinancialYear(): string {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  if (month >= 3) {
    return `${year}-${year + 1}`
  }
  return `${year - 1}-${year}`
}

function varianceColor(variance: string, accountType: string): string {
  const v = parseFloat(variance)
  if (v === 0) return 'text-gray-500'
  // For expenses: positive variance = under budget (good), negative = over budget (bad)
  // For revenue: positive variance = under target (bad), negative = over target (good)
  if (accountType === 'EXPENSE') {
    return v > 0 ? 'text-green-700' : 'text-red-700'
  }
  // Revenue: negative variance means actual > budget (good)
  return v < 0 ? 'text-green-700' : 'text-red-700'
}

function varianceBg(variance: string, accountType: string): string {
  const v = parseFloat(variance)
  if (v === 0) return ''
  if (accountType === 'EXPENSE') {
    return v > 0 ? 'bg-green-50' : 'bg-red-50'
  }
  return v < 0 ? 'bg-green-50' : 'bg-red-50'
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BudgetVsActualPage() {
  const [selectedYear, setSelectedYear] = useState(getCurrentFinancialYear())
  const [accountTypeFilter, setAccountTypeFilter] = useState('all')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())

  const financialYears = getFinancialYears()

  // ── Generate report ─────────────────────────────────────────────────────

  async function generateReport() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        year: selectedYear,
        accountType: accountTypeFilter,
      })
      const res = await fetch(`/api/finance/budgets/vs-actual?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate report')
      }
      const json: ReportData = await res.json()
      setData(json)
      setExpandedAccounts(new Set())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // ── Toggle expanded ─────────────────────────────────────────────────────

  function toggleExpanded(accountId: string) {
    setExpandedAccounts((prev) => {
      const next = new Set(prev)
      if (next.has(accountId)) {
        next.delete(accountId)
      } else {
        next.add(accountId)
      }
      return next
    })
  }

  // ── Export CSV ──────────────────────────────────────────────────────────

  function handleExport() {
    if (!data) return
    const lines: string[] = [
      'Group,Account Code,Account Name,Budget,Actual,Variance,Variance %',
    ]

    for (const group of data.groups) {
      for (const acc of group.accounts) {
        lines.push(
          `"${group.groupName}","${acc.accountCode}","${acc.accountName}",${acc.budget},${acc.actual},${acc.variance},${acc.variancePercent || 'N/A'}`
        )
      }
      lines.push(
        `"${group.groupName}","","GROUP TOTAL",${group.totalBudget},${group.totalActual},${group.totalVariance},${group.totalVariancePercent || 'N/A'}`
      )
    }
    lines.push(
      `"","","GRAND TOTAL",${data.totals.budget},${data.totals.actual},${data.totals.variance},${data.totals.variancePercent || 'N/A'}`
    )

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `budget-vs-actual-${selectedYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handlePrint() {
    window.print()
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Breadcrumb & Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/finance/budgets" className="hover:text-gray-700">
            Budgets
          </Link>
          <span>/</span>
          <span className="text-gray-900">Budget vs Actual</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Budget vs Actual</h1>
        <p className="mt-1 text-sm text-gray-500">
          Compare budgeted amounts against actual posted journal entries
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[180px]">
            <label className="label">Financial Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="input"
            >
              {financialYears.map((y) => (
                <option key={y} value={y}>
                  {y} (Apr {y.split('-')[0]} - Mar {y.split('-')[1]})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="label">Account Type</label>
            <select
              value={accountTypeFilter}
              onChange={(e) => setAccountTypeFilter(e.target.value)}
              className="input"
            >
              <option value="all">All (Revenue & Expense)</option>
              <option value="REVENUE">Revenue Only</option>
              <option value="EXPENSE">Expense Only</option>
            </select>
          </div>

          <div>
            <button
              onClick={generateReport}
              disabled={loading}
              className="btn-primary inline-flex items-center gap-1.5"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <BarChart3 size={16} />
              )}
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>

          {data && (
            <>
              <div>
                <button onClick={handleExport} className="btn-secondary inline-flex items-center gap-1.5">
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
              <div>
                <button onClick={handlePrint} className="btn-secondary inline-flex items-center gap-1.5">
                  <Printer size={16} />
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
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="card overflow-hidden" id="bva-report">
          {/* Report Header */}
          <div className="border-b border-gray-200 px-6 py-4 bg-white">
            <h2 className="text-lg font-bold text-gray-900 text-center">
              Budget vs Actual Report
            </h2>
            <p className="text-sm text-gray-500 text-center mt-1">
              Financial Year: {data.year} (April {data.year.split('-')[0]} - March {data.year.split('-')[1]})
            </p>
          </div>

          {/* Summary Totals */}
          <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase font-medium">Total Budget</p>
              <p className="text-lg font-bold text-gray-900 font-mono">
                {formatCurrency(parseFloat(data.totals.budget))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase font-medium">Total Actual</p>
              <p className="text-lg font-bold text-gray-900 font-mono">
                {formatCurrency(parseFloat(data.totals.actual))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase font-medium">Variance</p>
              <p className={cn(
                'text-lg font-bold font-mono',
                parseFloat(data.totals.variance) >= 0 ? 'text-green-700' : 'text-red-700'
              )}>
                {formatCurrency(parseFloat(data.totals.variance))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase font-medium">Variance %</p>
              <p className={cn(
                'text-lg font-bold font-mono',
                data.totals.variancePercent && parseFloat(data.totals.variancePercent) >= 0
                  ? 'text-green-700'
                  : 'text-red-700'
              )}>
                {data.totals.variancePercent ? `${data.totals.variancePercent}%` : 'N/A'}
              </p>
            </div>
          </div>

          {/* Detail Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header min-w-[250px]">Account</th>
                  <th className="table-header text-right">Budget</th>
                  <th className="table-header text-right">Actual</th>
                  <th className="table-header text-right">Variance</th>
                  <th className="table-header text-right">Variance %</th>
                </tr>
              </thead>
              <tbody>
                {data.groups.map((group) => (
                  <GroupSection
                    key={group.groupName}
                    group={group}
                    expandedAccounts={expandedAccounts}
                    onToggleExpanded={toggleExpanded}
                    months={data.months}
                  />
                ))}

                {/* Grand Total */}
                <tr className="bg-blue-50 border-t-2 border-blue-200">
                  <td className="table-cell font-bold text-gray-900">
                    Grand Total
                  </td>
                  <td className="table-cell text-right font-mono font-bold text-gray-900">
                    {formatCurrency(parseFloat(data.totals.budget))}
                  </td>
                  <td className="table-cell text-right font-mono font-bold text-gray-900">
                    {formatCurrency(parseFloat(data.totals.actual))}
                  </td>
                  <td className={cn(
                    'table-cell text-right font-mono font-bold',
                    parseFloat(data.totals.variance) >= 0 ? 'text-green-700' : 'text-red-700'
                  )}>
                    {formatCurrency(parseFloat(data.totals.variance))}
                  </td>
                  <td className={cn(
                    'table-cell text-right font-mono font-bold',
                    data.totals.variancePercent && parseFloat(data.totals.variancePercent) >= 0
                      ? 'text-green-700'
                      : 'text-red-700'
                  )}>
                    {data.totals.variancePercent ? `${data.totals.variancePercent}%` : 'N/A'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex items-center gap-2 text-xs text-gray-400">
            <Clock size={12} />
            Generated at {new Date(data.generatedAt).toLocaleDateString('en-GB')}{' '}
            {new Date(data.generatedAt).toLocaleTimeString('en-GB')}
          </div>
        </div>
      ) : (
        <div className="card py-16 text-center">
          <BarChart3 size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            Select a financial year and click Generate Report to view the Budget vs Actual comparison
          </p>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────

function GroupSection({
  group,
  expandedAccounts,
  onToggleExpanded,
  months,
}: {
  group: GroupSummary
  expandedAccounts: Set<string>
  onToggleExpanded: (id: string) => void
  months: Array<{ key: string; label: string }>
}) {
  return (
    <>
      {/* Group header */}
      <tr className="bg-gray-100">
        <td
          colSpan={5}
          className="px-4 py-2 text-sm font-bold text-gray-700 uppercase tracking-wide"
        >
          {group.groupName}
        </td>
      </tr>

      {/* Accounts */}
      {group.accounts.map((acc, idx) => {
        const isExpanded = expandedAccounts.has(acc.accountId)
        const accountType = acc.accountType

        return (
          <AccountRowWithMonthly
            key={acc.accountId}
            account={acc}
            idx={idx}
            isExpanded={isExpanded}
            onToggle={() => onToggleExpanded(acc.accountId)}
            months={months}
            accountType={accountType}
          />
        )
      })}

      {/* Group total */}
      <tr className="bg-gray-50 border-t border-gray-300">
        <td className="table-cell font-semibold text-gray-700">
          Total {group.groupName}
        </td>
        <td className="table-cell text-right font-mono text-sm font-semibold text-gray-700">
          {formatCurrency(parseFloat(group.totalBudget))}
        </td>
        <td className="table-cell text-right font-mono text-sm font-semibold text-gray-700">
          {formatCurrency(parseFloat(group.totalActual))}
        </td>
        <td className={cn(
          'table-cell text-right font-mono text-sm font-semibold',
          parseFloat(group.totalVariance) >= 0 ? 'text-green-700' : 'text-red-700'
        )}>
          {formatCurrency(parseFloat(group.totalVariance))}
        </td>
        <td className={cn(
          'table-cell text-right font-mono text-sm font-semibold',
          group.totalVariancePercent && parseFloat(group.totalVariancePercent) >= 0
            ? 'text-green-700'
            : 'text-red-700'
        )}>
          {group.totalVariancePercent ? `${group.totalVariancePercent}%` : 'N/A'}
        </td>
      </tr>
    </>
  )
}

function AccountRowWithMonthly({
  account,
  idx,
  isExpanded,
  onToggle,
  months,
  accountType,
}: {
  account: AccountRow
  idx: number
  isExpanded: boolean
  onToggle: () => void
  months: Array<{ key: string; label: string }>
  accountType: string
}) {
  return (
    <>
      <tr
        className={cn(
          'cursor-pointer hover:bg-blue-50/50 transition-colors',
          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50',
          varianceBg(account.variance, accountType)
        )}
        onClick={onToggle}
      >
        <td className="table-cell">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown size={14} className="text-gray-400 shrink-0" />
            ) : (
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
            )}
            <span className="font-mono text-xs text-gray-400">{account.accountCode}</span>
            <span className="text-sm text-gray-700">{account.accountName}</span>
          </div>
        </td>
        <td className="table-cell text-right font-mono text-sm">
          {formatCurrency(parseFloat(account.budget))}
        </td>
        <td className="table-cell text-right font-mono text-sm">
          {formatCurrency(parseFloat(account.actual))}
        </td>
        <td className={cn(
          'table-cell text-right font-mono text-sm font-semibold',
          varianceColor(account.variance, accountType)
        )}>
          {formatCurrency(parseFloat(account.variance))}
        </td>
        <td className={cn(
          'table-cell text-right font-mono text-sm font-semibold',
          varianceColor(account.variance, accountType)
        )}>
          {account.variancePercent ? `${account.variancePercent}%` : 'N/A'}
        </td>
      </tr>

      {/* Monthly breakdown (expanded) */}
      {isExpanded && account.monthly.map((m) => (
        <tr key={m.month} className="bg-blue-50/30">
          <td className="table-cell pl-12 text-xs text-gray-500">
            {m.monthLabel}
          </td>
          <td className="table-cell text-right font-mono text-xs text-gray-500">
            {formatCurrency(parseFloat(m.budget))}
          </td>
          <td className="table-cell text-right font-mono text-xs text-gray-500">
            {formatCurrency(parseFloat(m.actual))}
          </td>
          <td className={cn(
            'table-cell text-right font-mono text-xs font-medium',
            varianceColor(m.variance, accountType)
          )}>
            {formatCurrency(parseFloat(m.variance))}
          </td>
          <td className={cn(
            'table-cell text-right font-mono text-xs font-medium',
            varianceColor(m.variance, accountType)
          )}>
            {m.variancePercent ? `${m.variancePercent}%` : 'N/A'}
          </td>
        </tr>
      ))}
    </>
  )
}
