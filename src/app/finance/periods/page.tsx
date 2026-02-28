'use client'

import { useState, useEffect } from 'react'
import { cn, formatDate } from '@/lib/utils'
import { Calendar, Lock, Unlock, X, AlertTriangle, CheckCircle } from 'lucide-react'

interface Period {
  id: string
  name: string
  startDate: string
  endDate: string
  isYearEnd: boolean
  status: 'OPEN' | 'PERIOD_CLOSED' | 'LOCKED'
  closedBy: string | null
  closedAt: string | null
}

const statusBadge: Record<string, string> = {
  OPEN: 'badge-success',
  PERIOD_CLOSED: 'badge-warning',
  LOCKED: 'badge-danger',
}

function isCurrentPeriod(period: Period): boolean {
  const now = new Date()
  const start = new Date(period.startDate)
  const end = new Date(period.endDate)
  return now >= start && now <= end
}

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    periodId: string
    periodName: string
    action: 'close' | 'reopen'
  } | null>(null)

  useEffect(() => {
    fetchPeriods()
  }, [])

  async function fetchPeriods() {
    try {
      setLoading(true)
      const res = await fetch('/api/finance/periods')
      if (!res.ok) throw new Error('Failed to load accounting periods')
      const json = await res.json()
      setPeriods(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleAction() {
    if (!confirmDialog) return
    const { periodId, action } = confirmDialog
    setConfirmDialog(null)
    setActionLoading(periodId)
    setError(null)

    try {
      const endpoint =
        action === 'close'
          ? `/api/finance/periods/${periodId}/close`
          : `/api/finance/periods/${periodId}/reopen`

      const res = await fetch(endpoint, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to ${action} period`)
      }
      await fetchPeriods()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${confirmDialog.action} period`)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Accounting Periods</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage accounting periods for journal entry posting
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 animate-pulse space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 flex-1 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-20 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : periods.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Period Name</th>
                  <th className="table-header">Start Date</th>
                  <th className="table-header">End Date</th>
                  <th className="table-header text-center">Year End</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Closed By</th>
                  <th className="table-header">Closed At</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {periods.map((period) => {
                  const current = isCurrentPeriod(period)

                  return (
                    <tr
                      key={period.id}
                      className={cn(
                        'hover:bg-gray-50 transition-colors',
                        current && 'bg-blue-50/50'
                      )}
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{period.name}</span>
                          {current && (
                            <span className="badge-info text-xs">Current</span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">{formatDate(period.startDate)}</td>
                      <td className="table-cell">{formatDate(period.endDate)}</td>
                      <td className="table-cell text-center">
                        {period.isYearEnd ? (
                          <CheckCircle size={16} className="inline text-green-600" />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className={statusBadge[period.status] || 'badge-gray'}>
                          {period.status}
                        </span>
                      </td>
                      <td className="table-cell text-gray-500">
                        {period.closedBy || '—'}
                      </td>
                      <td className="table-cell text-gray-500">
                        {period.closedAt ? formatDate(period.closedAt) : '—'}
                      </td>
                      <td className="table-cell">
                        {period.status === 'OPEN' && (
                          <button
                            onClick={() =>
                              setConfirmDialog({
                                periodId: period.id,
                                periodName: period.name,
                                action: 'close',
                              })
                            }
                            disabled={actionLoading === period.id}
                            className="btn-ghost py-1 px-2 text-yellow-700 hover:text-yellow-800"
                          >
                            <Lock size={14} className="mr-1" />
                            Close
                          </button>
                        )}
                        {period.status === 'PERIOD_CLOSED' && (
                          <button
                            onClick={() =>
                              setConfirmDialog({
                                periodId: period.id,
                                periodName: period.name,
                                action: 'reopen',
                              })
                            }
                            disabled={actionLoading === period.id}
                            className="btn-ghost py-1 px-2 text-blue-700 hover:text-blue-800"
                          >
                            <Unlock size={14} className="mr-1" />
                            Reopen
                          </button>
                        )}
                        {period.status === 'LOCKED' && (
                          <span className="text-xs text-gray-400">Locked</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center">
              <Calendar size={40} className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No accounting periods configured</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {confirmDialog.action === 'close' ? 'Close Period' : 'Reopen Period'}
              </h3>
              <button
                onClick={() => setConfirmDialog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-start gap-3 mb-6">
              <AlertTriangle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                {confirmDialog.action === 'close' ? (
                  <p className="text-sm text-gray-600">
                    Are you sure you want to close the period{' '}
                    <strong>{confirmDialog.periodName}</strong>? No new journal entries can be
                    posted to a closed period.
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    Are you sure you want to reopen the period{' '}
                    <strong>{confirmDialog.periodName}</strong>? This will allow new journal
                    entries to be posted to this period.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                className={confirmDialog.action === 'close' ? 'btn-danger' : 'btn-primary'}
              >
                {confirmDialog.action === 'close' ? (
                  <>
                    <Lock size={16} className="mr-2" />
                    Close Period
                  </>
                ) : (
                  <>
                    <Unlock size={16} className="mr-2" />
                    Reopen Period
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
