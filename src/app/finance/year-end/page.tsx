'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  CalendarCheck,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  ArrowLeft,
  FileText,
  Lock,
  TrendingUp,
  TrendingDown,
  Loader2,
  Info,
} from 'lucide-react'

interface Period {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  yearEnd?: boolean
}

interface Account {
  id: string
  code: string
  name: string
  type: string
}

interface PLAccount {
  accountId: string
  code: string
  name: string
  balance: string
}

interface ClosingJournalLine {
  accountId: string
  accountCode: string
  accountName: string
  debit: string
  credit: string
}

interface PreviewData {
  period: {
    id: string
    name: string
    startDate: string
    endDate: string
  }
  periodsInYear: Period[]
  profitAndLoss: {
    revenue: { accounts: PLAccount[]; total: string }
    expenses: { accounts: PLAccount[]; total: string }
    netProfitLoss: string
    isProfit: boolean
  }
  closingJournal: {
    lines: ClosingJournalLine[]
    retainedEarningsLine: ClosingJournalLine
    totalDebit: string
    totalCredit: string
    isBalanced: boolean
  }
  warnings: string[]
  openPeriodsCount: number
}

interface ProcessResult {
  journalEntry: {
    id: string
    entryNumber: string
    date: string
    description: string
    totalDebit: number
    totalCredit: number
    lines: Array<{
      id: string
      account: { code: string; name: string; type: string }
      debit: number
      credit: number
      description: string | null
    }>
  }
  summary: {
    totalRevenue: string
    totalExpenses: string
    netProfitLoss: string
    isProfit: boolean
    retainedEarningsAccount: { id: string; code: string; name: string }
  }
  lockedPeriods: number
  newPeriods: Array<{
    id: string
    name: string
    startDate: string
    endDate: string
    yearEnd: boolean
  }>
}

const STEPS = ['Select Period', 'Preview', 'Confirm', 'Complete']

export default function YearEndPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: selection
  const [periods, setPeriods] = useState<Period[]>([])
  const [equityAccounts, setEquityAccounts] = useState<Account[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')

  // Step 2: preview
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Step 3-4: result
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    try {
      setLoading(true)
      setError(null)

      const [periodsRes, accountsRes] = await Promise.all([
        fetch('/api/finance/periods'),
        fetch('/api/finance/accounts?type=EQUITY'),
      ])

      if (!periodsRes.ok) throw new Error('Failed to load accounting periods')
      if (!accountsRes.ok) throw new Error('Failed to load accounts')

      const periodsData = await periodsRes.json()
      const accountsData = await accountsRes.json()

      // Filter to year-end periods that are not already LOCKED
      const allPeriods = Array.isArray(periodsData) ? periodsData : periodsData.data || []
      const yearEndPeriods = allPeriods.filter(
        (p: Period) => p.yearEnd && p.status !== 'LOCKED'
      )
      setPeriods(yearEndPeriods)

      // Filter equity accounts
      const allAccounts = Array.isArray(accountsData) ? accountsData : accountsData.data || []
      const equity = allAccounts.filter((a: Account) => a.type === 'EQUITY')
      setEquityAccounts(equity)

      // Auto-select retained earnings if obvious
      const retainedEarnings = equity.find(
        (a: Account) =>
          a.name.toLowerCase().includes('retained') ||
          a.name.toLowerCase().includes('profit and loss')
      )
      if (retainedEarnings) {
        setSelectedAccountId(retainedEarnings.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handlePreview() {
    if (!selectedPeriodId) {
      setError('Please select a year-end period')
      return
    }
    if (!selectedAccountId) {
      setError('Please select a retained earnings account')
      return
    }

    try {
      setPreviewLoading(true)
      setError(null)

      const res = await fetch('/api/finance/year-end/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearEndPeriodId: selectedPeriodId }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to preview year-end')
      }

      const data = await res.json()
      setPreviewData(data)
      setCurrentStep(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleProcess() {
    try {
      setProcessing(true)
      setError(null)

      const res = await fetch('/api/finance/year-end/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearEndPeriodId: selectedPeriodId,
          retainedEarningsAccountId: selectedAccountId,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to process year-end')
      }

      const data = await res.json()
      setProcessResult(data)
      setCurrentStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setProcessing(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="card p-6">
            <div className="h-40 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Year-End Processing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Close the financial year and prepare for the next period
        </p>
      </div>

      {/* Step Indicator */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                    index < currentStep
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  )}
                >
                  {index < currentStep ? (
                    <CheckCircle size={16} />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium hidden sm:block',
                    index === currentStep ? 'text-blue-600' : 'text-gray-500'
                  )}
                >
                  {step}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <ChevronRight size={16} className="mx-4 text-gray-300" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="text-sm text-red-600 underline mt-1">
            Dismiss
          </button>
        </div>
      )}

      {/* Step 1: Select Period */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Select Year-End Period and Retained Earnings Account
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Year-End Period *</label>
                {periods.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <AlertTriangle size={16} className="inline mr-2" />
                    No year-end periods available. Please ensure you have an accounting period marked as &quot;Year End&quot; that is not already locked.
                  </div>
                ) : (
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">Select a year-end period...</option>
                    {periods.map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.name} ({formatDate(period.startDate)} - {formatDate(period.endDate)}) [{period.status}]
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  The period that marks the end of your financial year
                </p>
              </div>

              <div>
                <label className="label">Retained Earnings Account *</label>
                {equityAccounts.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <AlertTriangle size={16} className="inline mr-2" />
                    No equity accounts found. Please create a Retained Earnings account in the Chart of Accounts.
                  </div>
                ) : (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">Select an equity account...</option>
                    {equityAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} — {account.name}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Net profit or loss will be transferred to this account
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <Info size={16} className="text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">What happens during year-end processing:</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>All P&L (revenue and expense) account balances are cleared to zero</li>
                    <li>The net profit or loss is transferred to the Retained Earnings account</li>
                    <li>A closing journal entry is created and posted automatically</li>
                    <li>All periods in the financial year are locked</li>
                    <li>12 new monthly periods are created for the next financial year</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handlePreview}
              disabled={!selectedPeriodId || !selectedAccountId || previewLoading}
              className="btn-primary inline-flex items-center gap-2"
            >
              {previewLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating Preview...
                </>
              ) : (
                <>
                  Preview Year-End
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {currentStep === 1 && previewData && (
        <div className="space-y-6">
          {/* Warnings */}
          {previewData.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 mb-2">
                    Warnings — please review before proceeding:
                  </p>
                  <ul className="list-disc ml-4 space-y-1">
                    {previewData.warnings.map((warning, i) => (
                      <li key={i} className="text-sm text-amber-700">{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* P&L Summary */}
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Profit & Loss Summary
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {formatDate(previewData.period.startDate)} to{' '}
              {formatDate(previewData.period.endDate)}
            </p>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="text-xs text-green-600 mb-1">Total Revenue</p>
                <p className="text-xl font-bold text-green-700">
                  {formatCurrency(previewData.profitAndLoss.revenue.total)}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-xs text-red-600 mb-1">Total Expenses</p>
                <p className="text-xl font-bold text-red-700">
                  {formatCurrency(previewData.profitAndLoss.expenses.total)}
                </p>
              </div>
              <div
                className={cn(
                  'rounded-lg border p-4',
                  previewData.profitAndLoss.isProfit
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                )}
              >
                <p
                  className={cn(
                    'text-xs mb-1',
                    previewData.profitAndLoss.isProfit ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {previewData.profitAndLoss.isProfit ? 'Net Profit' : 'Net Loss'}
                </p>
                <div className="flex items-center gap-2">
                  {previewData.profitAndLoss.isProfit ? (
                    <TrendingUp size={20} className="text-green-700" />
                  ) : (
                    <TrendingDown size={20} className="text-red-700" />
                  )}
                  <p
                    className={cn(
                      'text-xl font-bold',
                      previewData.profitAndLoss.isProfit ? 'text-green-700' : 'text-red-700'
                    )}
                  >
                    {formatCurrency(
                      Math.abs(parseFloat(previewData.profitAndLoss.netProfitLoss)).toFixed(2)
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Revenue accounts */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Revenue Accounts</h3>
              {previewData.profitAndLoss.revenue.accounts.length === 0 ? (
                <p className="text-sm text-gray-400">No revenue accounts with balances</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="table-header">Code</th>
                        <th className="table-header">Account</th>
                        <th className="table-header text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewData.profitAndLoss.revenue.accounts.map((acc) => (
                        <tr key={acc.accountId}>
                          <td className="table-cell font-mono text-sm">{acc.code}</td>
                          <td className="table-cell">{acc.name}</td>
                          <td className="table-cell text-right font-medium">
                            {formatCurrency(acc.balance)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-green-50 font-semibold">
                        <td className="table-cell" colSpan={2}>Total Revenue</td>
                        <td className="table-cell text-right">
                          {formatCurrency(previewData.profitAndLoss.revenue.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Expense accounts */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Expense Accounts</h3>
              {previewData.profitAndLoss.expenses.accounts.length === 0 ? (
                <p className="text-sm text-gray-400">No expense accounts with balances</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="table-header">Code</th>
                        <th className="table-header">Account</th>
                        <th className="table-header text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewData.profitAndLoss.expenses.accounts.map((acc) => (
                        <tr key={acc.accountId}>
                          <td className="table-cell font-mono text-sm">{acc.code}</td>
                          <td className="table-cell">{acc.name}</td>
                          <td className="table-cell text-right font-medium">
                            {formatCurrency(acc.balance)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-red-50 font-semibold">
                        <td className="table-cell" colSpan={2}>Total Expenses</td>
                        <td className="table-cell text-right">
                          {formatCurrency(previewData.profitAndLoss.expenses.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Closing Journal Preview */}
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Closing Journal Entry Preview
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              This journal entry will be created and posted automatically
            </p>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="table-header">Account Code</th>
                    <th className="table-header">Account Name</th>
                    <th className="table-header text-right">Debit</th>
                    <th className="table-header text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {previewData.closingJournal.lines.map((line, i) => (
                    <tr key={i}>
                      <td className="table-cell font-mono text-sm">{line.accountCode}</td>
                      <td className="table-cell">{line.accountName}</td>
                      <td className="table-cell text-right">
                        {parseFloat(line.debit) > 0 ? formatCurrency(line.debit) : ''}
                      </td>
                      <td className="table-cell text-right">
                        {parseFloat(line.credit) > 0 ? formatCurrency(line.credit) : ''}
                      </td>
                    </tr>
                  ))}
                  {/* Retained earnings line */}
                  <tr className="bg-blue-50">
                    <td className="table-cell font-mono text-sm">
                      {equityAccounts.find((a) => a.id === selectedAccountId)?.code || 'RE'}
                    </td>
                    <td className="table-cell font-medium">
                      {equityAccounts.find((a) => a.id === selectedAccountId)?.name ||
                        'Retained Earnings'}
                    </td>
                    <td className="table-cell text-right">
                      {parseFloat(previewData.closingJournal.retainedEarningsLine.debit) > 0
                        ? formatCurrency(previewData.closingJournal.retainedEarningsLine.debit)
                        : ''}
                    </td>
                    <td className="table-cell text-right">
                      {parseFloat(previewData.closingJournal.retainedEarningsLine.credit) > 0
                        ? formatCurrency(previewData.closingJournal.retainedEarningsLine.credit)
                        : ''}
                    </td>
                  </tr>
                  {/* Totals */}
                  <tr className="font-bold bg-gray-50">
                    <td className="table-cell" colSpan={2}>Totals</td>
                    <td className="table-cell text-right">
                      {formatCurrency(previewData.closingJournal.totalDebit)}
                    </td>
                    <td className="table-cell text-right">
                      {formatCurrency(previewData.closingJournal.totalCredit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {previewData.closingJournal.isBalanced ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                <CheckCircle size={14} />
                Journal entry is balanced
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle size={14} />
                Warning: Journal entry is NOT balanced
              </div>
            )}
          </div>

          {/* Periods to be locked */}
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Periods to be Locked
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {previewData.periodsInYear.map((period) => (
                <div
                  key={period.id}
                  className={cn(
                    'rounded-lg border p-3 text-sm',
                    period.status === 'LOCKED'
                      ? 'border-gray-200 bg-gray-50 text-gray-400'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Lock size={12} />
                    <span className="font-medium">{period.name}</span>
                  </div>
                  <p className="text-xs mt-1">
                    {period.status === 'LOCKED' ? 'Already locked' : `Currently: ${period.status}`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(0)}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={() => setCurrentStep(2)}
              className="btn-primary inline-flex items-center gap-2"
            >
              Proceed to Confirmation
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {currentStep === 2 && previewData && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <AlertTriangle size={32} className="text-amber-600" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Confirm Year-End Processing
              </h2>
              <p className="text-sm text-gray-500 max-w-lg mx-auto">
                This action is irreversible. Once processed, the financial year periods will be
                permanently locked and the closing journal entry will be posted.
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Financial Year:</span>
                  <span className="font-medium">{previewData.period.name}</span>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Net {previewData.profitAndLoss.isProfit ? 'Profit' : 'Loss'}:</span>
                  <span
                    className={cn(
                      'font-medium',
                      previewData.profitAndLoss.isProfit ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {formatCurrency(
                      Math.abs(parseFloat(previewData.profitAndLoss.netProfitLoss)).toFixed(2)
                    )}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Retained Earnings Account:</span>
                  <span className="font-medium">
                    {equityAccounts.find((a) => a.id === selectedAccountId)?.code}{' '}
                    {equityAccounts.find((a) => a.id === selectedAccountId)?.name}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Periods to Lock:</span>
                  <span className="font-medium">{previewData.periodsInYear.length}</span>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">New Periods Created:</span>
                  <span className="font-medium">12 monthly periods</span>
                </div>
              </div>

              {previewData.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-800 mb-2">
                    Outstanding warnings ({previewData.warnings.length}):
                  </p>
                  <ul className="list-disc ml-4 space-y-1">
                    {previewData.warnings.map((w, i) => (
                      <li key={i} className="text-sm text-amber-700">{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to Preview
            </button>
            <button
              onClick={handleProcess}
              disabled={processing}
              className="btn-primary inline-flex items-center gap-2 bg-red-600 hover:bg-red-700"
            >
              {processing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing Year-End...
                </>
              ) : (
                <>
                  <Lock size={16} />
                  Confirm & Process Year-End
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {currentStep === 3 && processResult && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Year-End Processing Complete
              </h2>
              <p className="text-sm text-gray-500">
                The financial year has been successfully closed.
              </p>
            </div>

            {/* Summary */}
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                  <p className="text-xs text-green-600 mb-1">Revenue</p>
                  <p className="text-lg font-bold text-green-700">
                    {formatCurrency(processResult.summary.totalRevenue)}
                  </p>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center">
                  <p className="text-xs text-red-600 mb-1">Expenses</p>
                  <p className="text-lg font-bold text-red-700">
                    {formatCurrency(processResult.summary.totalExpenses)}
                  </p>
                </div>
                <div
                  className={cn(
                    'rounded-lg border p-4 text-center',
                    processResult.summary.isProfit
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  )}
                >
                  <p
                    className={cn(
                      'text-xs mb-1',
                      processResult.summary.isProfit ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {processResult.summary.isProfit ? 'Net Profit' : 'Net Loss'}
                  </p>
                  <p
                    className={cn(
                      'text-lg font-bold',
                      processResult.summary.isProfit ? 'text-green-700' : 'text-red-700'
                    )}
                  >
                    {formatCurrency(
                      Math.abs(parseFloat(processResult.summary.netProfitLoss)).toFixed(2)
                    )}
                  </p>
                </div>
              </div>

              {/* Actions taken */}
              <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>
                    Closing journal entry created:{' '}
                    <Link
                      href={`/finance/journals/${processResult.journalEntry.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {processResult.journalEntry.entryNumber}
                    </Link>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>
                    Net {processResult.summary.isProfit ? 'profit' : 'loss'} transferred to{' '}
                    <span className="font-medium">
                      {processResult.summary.retainedEarningsAccount.code}{' '}
                      {processResult.summary.retainedEarningsAccount.name}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>{processResult.lockedPeriods} period(s) locked</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>{processResult.newPeriods.length} new periods created for next financial year</span>
                </div>
              </div>

              {/* New periods */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">New Periods Created</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {processResult.newPeriods.map((period) => (
                    <div
                      key={period.id}
                      className={cn(
                        'rounded-lg border p-2 text-sm',
                        period.yearEnd
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-gray-50'
                      )}
                    >
                      <p className="font-medium text-gray-700">{period.name}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(period.startDate)} - {formatDate(period.endDate)}
                      </p>
                      {period.yearEnd && (
                        <span className="badge-info mt-1 inline-block">Year End</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href={`/finance/journals/${processResult.journalEntry.id}`}
              className="btn-primary inline-flex items-center gap-2"
            >
              <FileText size={16} />
              View Closing Journal Entry
            </Link>
            <Link href="/finance/periods" className="btn-secondary inline-flex items-center gap-2">
              <CalendarCheck size={16} />
              View Periods
            </Link>
            <Link href="/finance" className="btn-ghost inline-flex items-center gap-2">
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
