'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { cn, formatCurrency } from '@/lib/utils'
import {
  PiggyBank,
  Save,
  Copy,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Loader2,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Account {
  id: string
  code: string
  name: string
  type: string
  subType: string | null
  isActive: boolean
}

interface BudgetLine {
  id: string
  accountId: string
  periodStart: string
  periodEnd: string
  amount: string
  notes: string | null
  account: Account
}

interface MonthDef {
  key: string
  label: string
  shortLabel: string
  periodStart: string
  periodEnd: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getFinancialYears(): string[] {
  const currentYear = new Date().getFullYear()
  const years: string[] = []
  // Show 3 years back and 2 years forward
  for (let y = currentYear - 3; y <= currentYear + 2; y++) {
    years.push(`${y}-${y + 1}`)
  }
  return years
}

function getCurrentFinancialYear(): string {
  const now = new Date()
  const month = now.getMonth() // 0-indexed, so April = 3
  const year = now.getFullYear()
  if (month >= 3) {
    return `${year}-${year + 1}`
  }
  return `${year - 1}-${year}`
}

function getMonthsForYear(year: string): MonthDef[] {
  const [startYear, endYear] = year.split('-').map(Number)
  const months: MonthDef[] = []
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  for (let i = 0; i < 12; i++) {
    const monthIndex = (3 + i) % 12 // Start from April (index 3)
    const yearForMonth = monthIndex >= 3 ? startYear : endYear
    const start = new Date(Date.UTC(yearForMonth, monthIndex, 1))
    const end = new Date(Date.UTC(yearForMonth, monthIndex + 1, 0, 23, 59, 59, 999))

    months.push({
      key: `${yearForMonth}-${String(monthIndex + 1).padStart(2, '0')}`,
      label: `${fullMonthNames[monthIndex]} ${yearForMonth}`,
      shortLabel: `${monthNames[monthIndex]} ${String(yearForMonth).slice(2)}`,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
    })
  }
  return months
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BudgetsPage() {
  const [selectedYear, setSelectedYear] = useState(getCurrentFinancialYear())
  const [accounts, setAccounts] = useState<Account[]>([])
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copyYear, setCopyYear] = useState('')
  const [copying, setCopying] = useState(false)

  // Grid data: accountId -> monthKey -> amount string
  const [gridData, setGridData] = useState<Record<string, Record<string, string>>>({})

  const months = getMonthsForYear(selectedYear)
  const financialYears = getFinancialYears()

  // ── Load accounts and budget lines ──────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch revenue and expense accounts
      const [revenueRes, expenseRes, budgetRes] = await Promise.all([
        fetch('/api/finance/accounts?type=REVENUE&active=true'),
        fetch('/api/finance/accounts?type=EXPENSE&active=true'),
        fetch(`/api/finance/budgets?year=${selectedYear}`),
      ])

      if (!revenueRes.ok || !expenseRes.ok) {
        throw new Error('Failed to fetch accounts')
      }

      const revenueAccounts: Account[] = await revenueRes.json()
      const expenseAccounts: Account[] = await expenseRes.json()
      const allAccounts = [...revenueAccounts, ...expenseAccounts].sort((a, b) =>
        a.code.localeCompare(b.code)
      )
      setAccounts(allAccounts)

      if (budgetRes.ok) {
        const lines: BudgetLine[] = await budgetRes.json()
        setBudgetLines(lines)

        // Build grid data from budget lines
        const grid: Record<string, Record<string, string>> = {}
        for (const acc of allAccounts) {
          grid[acc.id] = {}
          for (const m of months) {
            grid[acc.id][m.key] = ''
          }
        }
        for (const bl of lines) {
          const start = new Date(bl.periodStart)
          const monthKey = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`
          if (grid[bl.accountId]) {
            grid[bl.accountId][monthKey] = parseFloat(bl.amount).toString()
          }
        }
        setGridData(grid)
      } else {
        // No budget lines, initialize empty grid
        const grid: Record<string, Record<string, string>> = {}
        for (const acc of allAccounts) {
          grid[acc.id] = {}
          for (const m of months) {
            grid[acc.id][m.key] = ''
          }
        }
        setGridData(grid)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [selectedYear]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Cell update ──────────────────────────────────────────────────────────

  function updateCell(accountId: string, monthKey: string, value: string) {
    // Allow empty or valid number input
    if (value !== '' && isNaN(parseFloat(value)) && value !== '-') {
      return
    }
    setGridData((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        [monthKey]: value,
      },
    }))
    setSaved(false)
  }

  // ── Save budget ──────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const lines: Array<{
        accountId: string
        periodStart: string
        periodEnd: string
        amount: number
      }> = []

      for (const [accountId, monthData] of Object.entries(gridData)) {
        for (const month of months) {
          const value = monthData[month.key]
          if (value !== '' && value !== undefined) {
            const amount = parseFloat(value)
            if (!isNaN(amount)) {
              lines.push({
                accountId,
                periodStart: month.periodStart,
                periodEnd: month.periodEnd,
                amount,
              })
            }
          }
        }
      }

      if (lines.length === 0) {
        setError('No budget amounts to save. Enter at least one value.')
        setSaving(false)
        return
      }

      const res = await fetch('/api/finance/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lines),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save budget')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save budget')
    } finally {
      setSaving(false)
    }
  }

  // ── Copy previous year ───────────────────────────────────────────────────

  async function handleCopyPreviousYear() {
    if (!copyYear) return
    setCopying(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/budgets?year=${copyYear}`)
      if (!res.ok) throw new Error('Failed to fetch previous year budget')
      const lines: BudgetLine[] = await res.json()

      if (lines.length === 0) {
        setError(`No budget data found for ${copyYear}`)
        setCopying(false)
        return
      }

      // Map the previous year amounts into the current year months
      const prevMonths = getMonthsForYear(copyYear)
      const newGrid = { ...gridData }

      for (const bl of lines) {
        const start = new Date(bl.periodStart)
        const prevMonthKey = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`

        // Find which month index this was (0-11 in the FY)
        const prevIdx = prevMonths.findIndex((m) => m.key === prevMonthKey)
        if (prevIdx >= 0 && prevIdx < months.length && newGrid[bl.accountId]) {
          const currentMonthKey = months[prevIdx].key
          newGrid[bl.accountId] = {
            ...newGrid[bl.accountId],
            [currentMonthKey]: parseFloat(bl.amount).toString(),
          }
        }
      }

      setGridData(newGrid)
      setSaved(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to copy budget')
    } finally {
      setCopying(false)
    }
  }

  // ── Calculate totals ────────────────────────────────────────────────────

  function getRowTotal(accountId: string): number {
    const monthData = gridData[accountId]
    if (!monthData) return 0
    let total = 0
    for (const m of months) {
      const val = parseFloat(monthData[m.key] || '0')
      if (!isNaN(val)) total += val
    }
    return total
  }

  function getColumnTotal(monthKey: string, accountType?: string): number {
    let total = 0
    for (const acc of accounts) {
      if (accountType && acc.type !== accountType) continue
      const val = parseFloat(gridData[acc.id]?.[monthKey] || '0')
      if (!isNaN(val)) total += val
    }
    return total
  }

  function getGrandTotal(accountType?: string): number {
    let total = 0
    for (const acc of accounts) {
      if (accountType && acc.type !== accountType) continue
      total += getRowTotal(acc.id)
    }
    return total
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const revenueAccounts = accounts.filter((a) => a.type === 'REVENUE')
  const expenseAccounts = accounts.filter((a) => a.type === 'EXPENSE')

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <PiggyBank size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Budget Entry</h1>
            <p className="text-sm text-gray-500">
              Set monthly budgets for revenue and expense accounts
            </p>
          </div>
        </div>
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
          {/* Year selector */}
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

          {/* Copy from previous year */}
          <div className="flex-1 min-w-[180px]">
            <label className="label">Copy From Year</label>
            <div className="flex gap-2">
              <select
                value={copyYear}
                onChange={(e) => setCopyYear(e.target.value)}
                className="input flex-1"
              >
                <option value="">-- Select year to copy --</option>
                {financialYears
                  .filter((y) => y !== selectedYear)
                  .map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
              </select>
              <button
                onClick={handleCopyPreviousYear}
                disabled={!copyYear || copying}
                className="btn-secondary whitespace-nowrap"
              >
                {copying ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                <span className="ml-1.5">Copy</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Link href="/finance/budgets/vs-actual" className="btn-secondary inline-flex items-center gap-1.5">
              <BarChart3 size={16} />
              vs Actual
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary inline-flex items-center gap-1.5"
            >
              {saved ? (
                <>
                  <CheckCircle2 size={16} />
                  Saved
                </>
              ) : saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Budget
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Budget Grid */}
      {loading ? (
        <div className="card p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="card py-16 text-center">
          <PiggyBank size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            No revenue or expense accounts found. Create accounts in the Chart of Accounts first.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                    Account
                  </th>
                  {months.map((m) => (
                    <th key={m.key} className="table-header text-right min-w-[100px]">
                      {m.shortLabel}
                    </th>
                  ))}
                  <th className="table-header text-right min-w-[110px] bg-gray-100">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {/* Revenue Section */}
                <tr className="bg-green-50">
                  <td
                    colSpan={months.length + 2}
                    className="px-4 py-2 text-sm font-bold text-green-800 uppercase tracking-wide"
                  >
                    Revenue
                  </td>
                </tr>
                {revenueAccounts.map((acc, idx) => (
                  <tr
                    key={acc.id}
                    className={cn(
                      'hover:bg-blue-50/30 transition-colors',
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    )}
                  >
                    <td className="table-cell sticky left-0 bg-inherit z-10">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-400">{acc.code}</span>
                        <span className="text-sm text-gray-700 truncate">{acc.name}</span>
                      </div>
                    </td>
                    {months.map((m) => (
                      <td key={m.key} className="px-1 py-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={gridData[acc.id]?.[m.key] || ''}
                          onChange={(e) => updateCell(acc.id, m.key, e.target.value)}
                          className="w-full text-right text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 font-mono"
                          placeholder="0.00"
                        />
                      </td>
                    ))}
                    <td className="table-cell text-right bg-gray-50 font-mono text-sm font-semibold">
                      {formatCurrency(getRowTotal(acc.id))}
                    </td>
                  </tr>
                ))}
                {/* Revenue totals */}
                <tr className="bg-green-50 border-t-2 border-green-200">
                  <td className="table-cell sticky left-0 bg-green-50 z-10 font-semibold text-green-800">
                    Total Revenue
                  </td>
                  {months.map((m) => (
                    <td key={m.key} className="table-cell text-right font-mono text-sm font-semibold text-green-800">
                      {formatCurrency(getColumnTotal(m.key, 'REVENUE'))}
                    </td>
                  ))}
                  <td className="table-cell text-right font-mono text-sm font-bold text-green-800 bg-green-100">
                    {formatCurrency(getGrandTotal('REVENUE'))}
                  </td>
                </tr>

                {/* Spacer */}
                <tr>
                  <td colSpan={months.length + 2} className="h-2 bg-gray-100" />
                </tr>

                {/* Expense Section */}
                <tr className="bg-red-50">
                  <td
                    colSpan={months.length + 2}
                    className="px-4 py-2 text-sm font-bold text-red-800 uppercase tracking-wide"
                  >
                    Expenses
                  </td>
                </tr>
                {expenseAccounts.map((acc, idx) => (
                  <tr
                    key={acc.id}
                    className={cn(
                      'hover:bg-blue-50/30 transition-colors',
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    )}
                  >
                    <td className="table-cell sticky left-0 bg-inherit z-10">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-400">{acc.code}</span>
                        <span className="text-sm text-gray-700 truncate">{acc.name}</span>
                      </div>
                    </td>
                    {months.map((m) => (
                      <td key={m.key} className="px-1 py-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={gridData[acc.id]?.[m.key] || ''}
                          onChange={(e) => updateCell(acc.id, m.key, e.target.value)}
                          className="w-full text-right text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 font-mono"
                          placeholder="0.00"
                        />
                      </td>
                    ))}
                    <td className="table-cell text-right bg-gray-50 font-mono text-sm font-semibold">
                      {formatCurrency(getRowTotal(acc.id))}
                    </td>
                  </tr>
                ))}
                {/* Expense totals */}
                <tr className="bg-red-50 border-t-2 border-red-200">
                  <td className="table-cell sticky left-0 bg-red-50 z-10 font-semibold text-red-800">
                    Total Expenses
                  </td>
                  {months.map((m) => (
                    <td key={m.key} className="table-cell text-right font-mono text-sm font-semibold text-red-800">
                      {formatCurrency(getColumnTotal(m.key, 'EXPENSE'))}
                    </td>
                  ))}
                  <td className="table-cell text-right font-mono text-sm font-bold text-red-800 bg-red-100">
                    {formatCurrency(getGrandTotal('EXPENSE'))}
                  </td>
                </tr>

                {/* Spacer */}
                <tr>
                  <td colSpan={months.length + 2} className="h-2 bg-gray-100" />
                </tr>

                {/* Net Budget */}
                <tr className={cn(
                  'border-t-2',
                  getGrandTotal('REVENUE') - getGrandTotal('EXPENSE') >= 0
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-amber-50 border-amber-200'
                )}>
                  <td className="table-cell sticky left-0 bg-inherit z-10 font-bold text-gray-900">
                    Net Budget (Revenue - Expenses)
                  </td>
                  {months.map((m) => {
                    const net = getColumnTotal(m.key, 'REVENUE') - getColumnTotal(m.key, 'EXPENSE')
                    return (
                      <td
                        key={m.key}
                        className={cn(
                          'table-cell text-right font-mono text-sm font-bold',
                          net >= 0 ? 'text-green-700' : 'text-red-700'
                        )}
                      >
                        {formatCurrency(net)}
                      </td>
                    )
                  })}
                  <td className={cn(
                    'table-cell text-right font-mono font-bold',
                    getGrandTotal('REVENUE') - getGrandTotal('EXPENSE') >= 0
                      ? 'text-green-700 bg-blue-100'
                      : 'text-red-700 bg-amber-100'
                  )}>
                    {formatCurrency(getGrandTotal('REVENUE') - getGrandTotal('EXPENSE'))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
