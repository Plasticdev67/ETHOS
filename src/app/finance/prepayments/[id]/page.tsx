'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  PlayCircle,
  XCircle,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'

interface PrepaymentRelease {
  id: string
  date: string
  amount: number
  journalEntryId: string | null
}

interface ScheduleItem {
  date: string
  amount: string
  released: boolean
}

interface AccountInfo {
  id: string
  code: string
  name: string
}

interface PrepaymentDetail {
  id: string
  type: 'PREPAYMENT' | 'ACCRUAL'
  description: string
  sourceAccountId: string
  targetAccountId: string
  totalAmount: number
  releasedAmount: number
  remainingAmount: number
  startDate: string
  endDate: string
  releaseFrequency: string
  releaseAmount: number
  status: string
  releases: PrepaymentRelease[]
  sourceAccount: AccountInfo | null
  targetAccount: AccountInfo | null
  schedule: ScheduleItem[]
  createdAt: string
}

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUALLY: 'Annually',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PrepaymentDetailPage({ params }: PageProps) {
  const router = useRouter()
  const [prepayment, setPrepayment] = useState<PrepaymentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [releasing, setReleasing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const { id } = await params
      const res = await fetch(`/api/finance/prepayments/${id}`)
      if (!res.ok) throw new Error('Failed to load prepayment')
      const data = await res.json()
      setPrepayment(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function handleRelease() {
    if (!prepayment) return
    try {
      setReleasing(true)
      setActionMessage(null)
      const { id } = await params
      const res = await fetch(`/api/finance/prepayments/${id}/release`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setActionMessage(`Error: ${data.error}`)
        return
      }
      setActionMessage(`Released ${formatCurrency(data.release.amount)}. Journal: ${data.journal?.entryNumber || 'N/A'}`)
      fetchData()
    } catch (err) {
      setActionMessage('Failed to release')
    } finally {
      setReleasing(false)
    }
  }

  async function handleCancel() {
    if (!prepayment) return
    if (!confirm('Are you sure you want to cancel this prepayment/accrual? This cannot be undone.')) return
    try {
      setCancelling(true)
      setActionMessage(null)
      const { id } = await params
      const res = await fetch(`/api/finance/prepayments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionMessage(`Error: ${data.error}`)
        return
      }
      setActionMessage('Prepayment cancelled successfully')
      fetchData()
    } catch (err) {
      setActionMessage('Failed to cancel')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !prepayment) {
    return (
      <div className="space-y-4">
        <Link href="/finance/prepayments" className="btn-ghost flex items-center gap-2 w-fit">
          <ArrowLeft size={16} /> Back to Prepayments
        </Link>
        <div className="card border-red-200 bg-red-50 text-red-700">
          {error || 'Prepayment not found'}
        </div>
      </div>
    )
  }

  const progressPercent = prepayment.totalAmount > 0
    ? Math.round((prepayment.releasedAmount / prepayment.totalAmount) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/finance/prepayments" className="btn-ghost p-2">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{prepayment.description}</h1>
              <span className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                prepayment.type === 'PREPAYMENT' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
              )}>
                {prepayment.type === 'PREPAYMENT' ? 'Prepayment' : 'Accrual'}
              </span>
              <span className={cn(
                prepayment.status === 'ACTIVE' ? 'badge-success' :
                prepayment.status === 'FULLY_RELEASED' ? 'badge-info' : 'badge-danger'
              )}>
                {prepayment.status === 'FULLY_RELEASED' ? 'Fully Released' : prepayment.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {formatDate(prepayment.startDate)} to {formatDate(prepayment.endDate)} | {FREQUENCY_LABELS[prepayment.releaseFrequency] || prepayment.releaseFrequency} releases
            </p>
          </div>
        </div>
        {prepayment.status === 'ACTIVE' && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="btn-ghost text-red-600 hover:text-red-700 flex items-center gap-2"
            >
              <XCircle size={16} />
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
            <button
              onClick={handleRelease}
              disabled={releasing}
              className="btn-primary flex items-center gap-2"
            >
              <PlayCircle size={16} />
              {releasing ? 'Releasing...' : 'Release Next'}
            </button>
          </div>
        )}
      </div>

      {/* Action message */}
      {actionMessage && (
        <div className={cn(
          'rounded-md p-3 text-sm',
          actionMessage.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        )}>
          {actionMessage}
        </div>
      )}

      {/* Info card with progress */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(prepayment.totalAmount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Released</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(prepayment.releasedAmount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Remaining</p>
            <p className="text-xl font-bold text-amber-600">{formatCurrency(prepayment.remainingAmount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Per Release</p>
            <p className="text-xl font-bold text-gray-700">{formatCurrency(prepayment.releaseAmount)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                progressPercent >= 100 ? 'bg-blue-500' : 'bg-green-500'
              )}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Account info */}
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">
              {prepayment.type === 'PREPAYMENT' ? 'Prepayment Account:' : 'Expense Account:'}
            </span>
            <span className="ml-2 font-medium text-gray-900">
              {prepayment.sourceAccount ? `${prepayment.sourceAccount.code} - ${prepayment.sourceAccount.name}` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">
              {prepayment.type === 'PREPAYMENT' ? 'Expense Account:' : 'Accruals Account:'}
            </span>
            <span className="ml-2 font-medium text-gray-900">
              {prepayment.targetAccount ? `${prepayment.targetAccount.code} - ${prepayment.targetAccount.name}` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Release Schedule / History */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Release Schedule
        </h2>
        {prepayment.schedule && prepayment.schedule.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header">#</th>
                <th className="table-header">Date</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {prepayment.schedule.map((item, idx) => (
                <tr key={idx} className={item.released ? 'bg-green-50' : ''}>
                  <td className="table-cell text-gray-500">{idx + 1}</td>
                  <td className="table-cell">{formatDate(item.date)}</td>
                  <td className="table-cell text-right font-medium">{formatCurrency(item.amount)}</td>
                  <td className="table-cell">
                    {item.released ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle size={14} /> Released
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 text-sm">
                        <Clock size={14} /> Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-400">No schedule data available</p>
        )}
      </div>

      {/* Actual Release History */}
      {prepayment.releases.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Release History
          </h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header">Date</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header">Journal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {prepayment.releases.map(release => (
                <tr key={release.id}>
                  <td className="table-cell">{formatDate(release.date)}</td>
                  <td className="table-cell text-right font-medium">{formatCurrency(release.amount)}</td>
                  <td className="table-cell">
                    {release.journalEntryId ? (
                      <Link
                        href={`/finance/journals/${release.journalEntryId}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Journal
                      </Link>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
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
