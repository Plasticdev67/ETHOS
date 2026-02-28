'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Clock,
  Plus,
  PlayCircle,
  RefreshCw,
  ArrowRightLeft,
  PoundSterling,
  AlertTriangle,
  CalendarClock,
} from 'lucide-react'

interface PrepaymentRelease {
  id: string
  date: string
  amount: number
}

interface Prepayment {
  id: string
  type: 'PREPAYMENT' | 'ACCRUAL'
  description: string
  totalAmount: number
  releasedAmount: number
  remainingAmount: number
  startDate: string
  endDate: string
  releaseFrequency: string
  releaseAmount: number
  status: string
  releases: PrepaymentRelease[]
  createdAt: string
}

interface Summary {
  totalActive: number
  totalRemaining: string
  dueThisMonth: string
}

const STATUS_BADGES: Record<string, string> = {
  PREP_ACTIVE: 'badge-success',
  FULLY_RELEASED: 'badge-info',
  PREP_CANCELLED: 'badge-danger',
}

const STATUS_LABELS: Record<string, string> = {
  PREP_ACTIVE: 'Active',
  FULLY_RELEASED: 'Fully Released',
  PREP_CANCELLED: 'Cancelled',
}

const TYPE_TABS = [
  { key: '', label: 'All' },
  { key: 'PREPAYMENT', label: 'Prepayments' },
  { key: 'ACCRUAL', label: 'Accruals' },
]

export default function PrepaymentsListPage() {
  const [prepayments, setPrepayments] = useState<Prepayment[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [processing, setProcessing] = useState(false)
  const [processResult, setProcessResult] = useState<string | null>(null)

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      const url = typeFilter
        ? `/api/finance/prepayments?type=${typeFilter}`
        : '/api/finance/prepayments'

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load prepayments')

      const data = await res.json()
      setPrepayments(data.data || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [typeFilter])

  async function handleProcessDue() {
    try {
      setProcessing(true)
      setProcessResult(null)

      const res = await fetch('/api/finance/prepayments/process', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setProcessResult(`Error: ${data.error}`)
        return
      }

      setProcessResult(
        `Processed ${data.processed} release(s)${data.errors > 0 ? `, ${data.errors} error(s)` : ''}`
      )
      fetchData()
    } catch (err) {
      setProcessResult('Failed to process releases')
    } finally {
      setProcessing(false)
    }
  }

  function getNextReleaseDate(p: Prepayment): string {
    if (p.status !== 'ACTIVE') return '-'
    if (p.releases.length === 0) return formatDate(p.startDate)

    const lastDate = new Date(
      Math.max(...p.releases.map(r => new Date(r.date).getTime()))
    )
    const next = new Date(lastDate)

    switch (p.releaseFrequency) {
      case 'WEEKLY': next.setDate(next.getDate() + 7); break
      case 'FORTNIGHTLY': next.setDate(next.getDate() + 14); break
      case 'MONTHLY': next.setMonth(next.getMonth() + 1); break
      case 'QUARTERLY': next.setMonth(next.getMonth() + 3); break
      case 'ANNUALLY': next.setFullYear(next.getFullYear() + 1); break
    }

    if (next > new Date(p.endDate)) return 'Complete'
    return formatDate(next)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prepayments & Accruals</h1>
          <p className="text-sm text-gray-500">
            Manage prepaid expenses and accrued liabilities with automatic periodic releases
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleProcessDue}
            disabled={processing}
            className="btn-secondary flex items-center gap-2"
          >
            <PlayCircle size={16} />
            {processing ? 'Processing...' : 'Process Due Releases'}
          </button>
          <Link href="/finance/prepayments/new" className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            New
          </Link>
        </div>
      </div>

      {/* Process result message */}
      {processResult && (
        <div className={cn(
          'rounded-md p-3 text-sm',
          processResult.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        )}>
          {processResult}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <ArrowRightLeft size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Active</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalActive}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2">
                <PoundSterling size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Remaining</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalRemaining)}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <CalendarClock size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Due This Month</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.dueThisMonth)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {TYPE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={cn(
                'border-b-2 pb-3 text-sm font-medium transition-colors',
                typeFilter === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error */}
      {error && (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-gray-400" />
        </div>
      ) : prepayments.length === 0 ? (
        <div className="card text-center py-12">
          <Clock size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No prepayments or accruals found</p>
          <Link href="/finance/prepayments/new" className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={16} />
            Create One
          </Link>
        </div>
      ) : (
        /* Table */
        <div className="card overflow-hidden p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header">Description</th>
                <th className="table-header">Type</th>
                <th className="table-header text-right">Total</th>
                <th className="table-header text-right">Released</th>
                <th className="table-header text-right">Remaining</th>
                <th className="table-header">Next Release</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {prepayments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="table-cell">
                    <Link href={`/finance/prepayments/${p.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                      {p.description}
                    </Link>
                    <div className="text-xs text-gray-400">
                      {formatDate(p.startDate)} - {formatDate(p.endDate)}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      p.type === 'PREPAYMENT' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                    )}>
                      {p.type === 'PREPAYMENT' ? 'Prepayment' : 'Accrual'}
                    </span>
                  </td>
                  <td className="table-cell text-right font-medium">{formatCurrency(p.totalAmount)}</td>
                  <td className="table-cell text-right">{formatCurrency(p.releasedAmount)}</td>
                  <td className="table-cell text-right">{formatCurrency(p.remainingAmount)}</td>
                  <td className="table-cell text-sm">{getNextReleaseDate(p)}</td>
                  <td className="table-cell">
                    <span className={STATUS_BADGES[p.status] || 'badge-gray'}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
