'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, Save, Calendar, Calculator } from 'lucide-react'

interface Account {
  id: string
  code: string
  name: string
  type: string
}

interface ScheduleItem {
  date: string
  amount: string
}

export default function NewPrepaymentPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    type: 'PREPAYMENT',
    description: '',
    sourceAccountId: '',
    targetAccountId: '',
    totalAmount: '',
    startDate: '',
    endDate: '',
    releaseFrequency: 'MONTHLY',
  })

  const [schedule, setSchedule] = useState<ScheduleItem[]>([])

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const res = await fetch('/api/finance/accounts')
        if (!res.ok) throw new Error('Failed to load accounts')
        const data = await res.json()
        setAccounts(Array.isArray(data) ? data : data.data || [])
      } catch {
        setError('Failed to load chart of accounts')
      } finally {
        setLoading(false)
      }
    }
    fetchAccounts()
  }, [])

  // Calculate schedule preview when form changes
  useEffect(() => {
    if (!form.totalAmount || !form.startDate || !form.endDate) {
      setSchedule([])
      return
    }

    const total = parseFloat(form.totalAmount)
    if (isNaN(total) || total <= 0) {
      setSchedule([])
      return
    }

    const start = new Date(form.startDate)
    const end = new Date(form.endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      setSchedule([])
      return
    }

    // Count releases
    const dates: Date[] = []
    const current = new Date(start)
    while (current <= end) {
      dates.push(new Date(current))
      switch (form.releaseFrequency) {
        case 'WEEKLY': current.setDate(current.getDate() + 7); break
        case 'FORTNIGHTLY': current.setDate(current.getDate() + 14); break
        case 'MONTHLY': current.setMonth(current.getMonth() + 1); break
        case 'QUARTERLY': current.setMonth(current.getMonth() + 3); break
        case 'ANNUALLY': current.setFullYear(current.getFullYear() + 1); break
      }
    }

    if (dates.length === 0) {
      setSchedule([])
      return
    }

    const releaseAmount = (total / dates.length).toFixed(2)
    setSchedule(dates.map(d => ({
      date: d.toISOString().split('T')[0],
      amount: releaseAmount,
    })))
  }, [form.totalAmount, form.startDate, form.endDate, form.releaseFrequency])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)

      const res = await fetch('/api/finance/prepayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create')
        return
      }

      router.push(`/finance/prepayments/${data.id}`)
    } catch {
      setError('Failed to create prepayment')
    } finally {
      setSaving(false)
    }
  }

  const balanceSheetAccounts = accounts.filter(a => ['ASSET', 'LIABILITY'].includes(a.type))
  const expenseRevenueAccounts = accounts.filter(a => ['EXPENSE', 'REVENUE'].includes(a.type))

  // For PREPAYMENT: source = BS (Prepayment account), target = Expense
  // For ACCRUAL: source = Expense, target = BS (Accruals account)
  const sourceAccounts = form.type === 'PREPAYMENT' ? balanceSheetAccounts : expenseRevenueAccounts
  const targetAccounts = form.type === 'PREPAYMENT' ? expenseRevenueAccounts : balanceSheetAccounts

  const sourceLabel = form.type === 'PREPAYMENT'
    ? 'Prepayment Account (Balance Sheet)'
    : 'Expense Account'
  const targetLabel = form.type === 'PREPAYMENT'
    ? 'Expense Account (Release Target)'
    : 'Accruals Account (Balance Sheet)'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/finance/prepayments" className="btn-ghost p-2">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Prepayment / Accrual</h1>
          <p className="text-sm text-gray-500">Create a new prepayment or accrual with automatic release schedule</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Details</h2>

            {/* Type selector */}
            <div>
              <label className="label">Type</label>
              <div className="flex gap-4">
                <label className={cn(
                  'flex-1 cursor-pointer rounded-lg border-2 p-4 text-center transition-colors',
                  form.type === 'PREPAYMENT'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}>
                  <input
                    type="radio"
                    className="sr-only"
                    value="PREPAYMENT"
                    checked={form.type === 'PREPAYMENT'}
                    onChange={e => setForm({ ...form, type: e.target.value, sourceAccountId: '', targetAccountId: '' })}
                  />
                  <div className="font-semibold text-gray-900">Prepayment</div>
                  <div className="text-xs text-gray-500 mt-1">Paid in advance, release to expense over time</div>
                </label>
                <label className={cn(
                  'flex-1 cursor-pointer rounded-lg border-2 p-4 text-center transition-colors',
                  form.type === 'ACCRUAL'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}>
                  <input
                    type="radio"
                    className="sr-only"
                    value="ACCRUAL"
                    checked={form.type === 'ACCRUAL'}
                    onChange={e => setForm({ ...form, type: e.target.value, sourceAccountId: '', targetAccountId: '' })}
                  />
                  <div className="font-semibold text-gray-900">Accrual</div>
                  <div className="text-xs text-gray-500 mt-1">Expense recognised before invoice received</div>
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="label">Description</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Annual insurance premium, Utility bill accrual"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>

            {/* Accounts */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{sourceLabel}</label>
                <select
                  className="input"
                  value={form.sourceAccountId}
                  onChange={e => setForm({ ...form, sourceAccountId: e.target.value })}
                  required
                >
                  <option value="">Select account...</option>
                  {sourceAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{targetLabel}</label>
                <select
                  className="input"
                  value={form.targetAccountId}
                  onChange={e => setForm({ ...form, targetAccountId: e.target.value })}
                  required
                >
                  <option value="">Select account...</option>
                  {targetAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="label">Total Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">GBP</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input pl-12"
                  placeholder="0.00"
                  value={form.totalAmount}
                  onChange={e => setForm({ ...form, totalAmount: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Dates and frequency */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Start Date</label>
                <input
                  type="date"
                  className="input"
                  value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">End Date</label>
                <input
                  type="date"
                  className="input"
                  value={form.endDate}
                  onChange={e => setForm({ ...form, endDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Release Frequency</label>
                <select
                  className="input"
                  value={form.releaseFrequency}
                  onChange={e => setForm({ ...form, releaseFrequency: e.target.value })}
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="FORTNIGHTLY">Fortnightly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="ANNUALLY">Annually</option>
                </select>
              </div>
            </div>

            {/* Calculated info */}
            {schedule.length > 0 && (
              <div className="rounded-md bg-blue-50 p-4">
                <div className="flex items-center gap-2 text-blue-700 font-medium">
                  <Calculator size={16} />
                  Release Calculation
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-blue-600">
                  <div>Number of releases: <strong>{schedule.length}</strong></div>
                  <div>Amount per release: <strong>{formatCurrency(schedule[0]?.amount || '0')}</strong></div>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <Link href="/finance/prepayments" className="btn-secondary">Cancel</Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={16} />
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>

        {/* Schedule Preview */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Calendar size={16} />
              Release Schedule Preview
            </h3>
            {schedule.length === 0 ? (
              <p className="text-sm text-gray-400">Fill in amount, dates, and frequency to see the schedule</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {schedule.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600">
                      {idx + 1}. {formatDate(item.date)}
                    </span>
                    <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-300 font-bold">
                  <span>Total</span>
                  <span>
                    {formatCurrency(
                      schedule.reduce((sum, s) => sum + parseFloat(s.amount), 0).toFixed(2)
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Help box */}
          <div className="card bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">How it works</h3>
            {form.type === 'PREPAYMENT' ? (
              <div className="text-xs text-gray-500 space-y-2">
                <p><strong>Prepayment:</strong> You have paid in advance (e.g. annual insurance).</p>
                <p>Original entry: Dr Prepayment Account, Cr Bank.</p>
                <p>Each release: Dr Expense Account, Cr Prepayment Account.</p>
                <p>This spreads the cost evenly over the period.</p>
              </div>
            ) : (
              <div className="text-xs text-gray-500 space-y-2">
                <p><strong>Accrual:</strong> You owe but have not been invoiced (e.g. utility bills).</p>
                <p>Each release: Dr Expense Account, Cr Accruals Account.</p>
                <p>When the invoice arrives, reverse the accrual.</p>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
