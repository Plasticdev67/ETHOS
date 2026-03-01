'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  RefreshCw,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  CalendarCheck,
  Repeat,
  Zap,
} from 'lucide-react'

interface RecurringTemplateLine {
  id: string
  accountId: string
  description: string | null
  debit: number
  credit: number
  vatCodeId: string | null
}

interface RecurringTemplate {
  id: string
  name: string
  description: string | null
  frequency: string
  startDate: string
  endDate: string | null
  nextRunDate: string
  lastRunDate: string | null
  totalRuns: number
  maxRuns: number | null
  status: string
  lines: RecurringTemplateLine[]
  createdAt: string
}

const STATUS_BADGES: Record<string, string> = {
  REC_ACTIVE: 'badge-success',
  REC_PAUSED: 'badge-warning',
  REC_EXPIRED: 'badge-gray',
}

const STATUS_LABELS: Record<string, string> = {
  REC_ACTIVE: 'Active',
  REC_PAUSED: 'Paused',
  REC_EXPIRED: 'Expired',
}

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  REC_MONTHLY: 'Monthly',
  REC_QUARTERLY: 'Quarterly',
  ANNUALLY: 'Annually',
}

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'PAUSED', label: 'Paused' },
  { key: 'EXPIRED', label: 'Expired' },
]

export default function RecurringEntriesListPage() {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [processing, setProcessing] = useState(false)
  const [processResult, setProcessResult] = useState<string | null>(null)

  async function fetchTemplates() {
    try {
      setLoading(true)
      setError(null)

      const url = statusFilter
        ? `/api/finance/recurring?status=${statusFilter}`
        : '/api/finance/recurring'

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load recurring templates')

      const data = await res.json()
      setTemplates(Array.isArray(data) ? data : data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  async function handleProcessDue() {
    if (!confirm('Process all due recurring entries? This will create journal entries for all active templates that are due.')) return

    try {
      setProcessing(true)
      setError(null)
      setProcessResult(null)

      const res = await fetch('/api/finance/recurring/process', {
        method: 'POST',
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to process recurring entries')
      }

      const result = await res.json()
      setProcessResult(result.message)

      // Refresh the list
      await fetchTemplates()

      // Clear success message after 8 seconds
      setTimeout(() => setProcessResult(null), 8000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setProcessing(false)
    }
  }

  // Summary calculations
  const activeCount = templates.filter((t) => t.status === 'ACTIVE').length
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const dueToday = templates.filter((t) => {
    if (t.status !== 'ACTIVE') return false
    const nextRun = new Date(t.nextRunDate)
    return nextRun <= todayEnd
  }).length

  // Posted this month: count totalRuns that have occurred in the current month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const postedThisMonth = templates.filter((t) => {
    if (!t.lastRunDate) return false
    const lastRun = new Date(t.lastRunDate)
    return lastRun >= monthStart
  }).length

  // Calculate total debit from lines for table display
  function getTemplateDebitTotal(lines: RecurringTemplateLine[]): number {
    let total = 0
    for (const line of lines) {
      total += Number(line.debit) || 0
    }
    return total
  }

  const summaryCards = [
    {
      label: 'Active Templates',
      value: activeCount,
      icon: Repeat,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Due Today',
      value: dueToday,
      icon: CalendarCheck,
      color: 'text-orange-600 bg-orange-50',
    },
    {
      label: 'Posted This Month',
      value: postedThisMonth,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/finance" className="hover:text-gray-700">Finance</Link>
        <span>/</span>
        <span className="text-gray-900">Recurring Entries</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <RefreshCw size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recurring Entries</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage automated recurring journal entries
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {dueToday > 0 && (
            <button
              onClick={handleProcessDue}
              disabled={processing}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Zap size={16} />
              {processing ? 'Processing...' : `Process Due Entries (${dueToday})`}
            </button>
          )}
          <Link
            href="/finance/recurring/new"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={16} />
            New Template
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Process Result */}
      {processResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">{processResult}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-7 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))
          : summaryCards.map((card) => (
              <div key={card.label} className="card p-5">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', card.color)}>
                    <card.icon size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{card.label}</p>
                    <p className="text-lg font-semibold text-gray-900">{card.value}</p>
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* Status Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                'flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                statusFilter === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Templates Table */}
      {loading ? (
        <div className="card">
          <div className="animate-pulse p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
              </div>
            ))}
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div className="card p-12 text-center">
          <RefreshCw size={40} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">No recurring templates found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {statusFilter
              ? `No templates with status "${STATUS_LABELS[statusFilter] || statusFilter}".`
              : 'Create your first recurring template to automate journal entries.'}
          </p>
          <Link
            href="/finance/recurring/new"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={16} />
            New Template
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Frequency</th>
                  <th className="table-header">Next Run</th>
                  <th className="table-header">Last Run</th>
                  <th className="table-header text-center">Total Runs</th>
                  <th className="table-header text-right">Debit Total</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {templates.map((template) => {
                  const isDue = template.status === 'ACTIVE' && new Date(template.nextRunDate) <= todayEnd

                  return (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <Link
                          href={`/finance/recurring/${template.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {template.name}
                        </Link>
                        {template.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[250px]">
                            {template.description}
                          </p>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex items-center gap-1.5">
                          <Repeat size={14} className="text-gray-400" />
                          {FREQUENCY_LABELS[template.frequency] || template.frequency}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={cn(isDue && 'text-orange-600 font-medium')}>
                          {formatDate(template.nextRunDate)}
                        </span>
                        {isDue && (
                          <span className="ml-1.5 badge-warning text-xs">Due</span>
                        )}
                      </td>
                      <td className="table-cell">
                        {template.lastRunDate ? formatDate(template.lastRunDate) : '-'}
                      </td>
                      <td className="table-cell text-center">
                        {template.totalRuns}
                        {template.maxRuns && (
                          <span className="text-gray-400"> / {template.maxRuns}</span>
                        )}
                      </td>
                      <td className="table-cell text-right font-medium">
                        {formatCurrency(getTemplateDebitTotal(template.lines))}
                      </td>
                      <td className="table-cell">
                        <span className={STATUS_BADGES[template.status] || 'badge-gray'}>
                          {STATUS_LABELS[template.status] || template.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="flex flex-wrap gap-3">
        <Link href="/finance/journals" className="btn-ghost inline-flex items-center gap-2 text-sm">
          <Clock size={16} />
          Journal Entries
        </Link>
        <Link href="/finance/periods" className="btn-ghost inline-flex items-center gap-2 text-sm">
          <AlertCircle size={16} />
          Accounting Periods
        </Link>
      </div>
    </div>
  )
}
