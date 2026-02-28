'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  X,
  Search,
} from 'lucide-react'

// --- Types ---

interface RetentionRecord {
  id: string
  contractRef: string
  clientName: string
  contractValue: number
  totalRetentionHeld: number
  totalReleased: number
  retentionBalance: number
  practicalCompletionDate: string | null
  defectsEndDate: string | null
  nextReleaseDate: string | null
  status: 'ACTIVE' | 'PRACTICAL_COMPLETION' | 'DEFECTS_LIABILITY' | 'FINAL_ACCOUNT' | 'CLOSED'
  isOverdue: boolean
}

interface RetentionSummary {
  totalRetentionHeld: number
  dueForRelease: number
  overdueForRelease: number
}

interface RetentionResponse {
  records: RetentionRecord[]
  summary: RetentionSummary
}

const FILTER_OPTIONS = ['All', 'Pending Release', 'Released', 'Overdue']

const statusBadgeMap: Record<string, string> = {
  CONTRACT_ACTIVE: 'badge-success',
  PRACTICAL_COMPLETION: 'badge-info',
  DEFECTS_LIABILITY: 'badge-warning',
  FINAL_ACCOUNT: 'badge-warning',
  CLOSED: 'badge-gray',
}

const statusLabel: Record<string, string> = {
  CONTRACT_ACTIVE: 'Active',
  PRACTICAL_COMPLETION: 'PC',
  DEFECTS_LIABILITY: 'Defects',
  FINAL_ACCOUNT: 'Final Account',
  CLOSED: 'Closed',
}

export default function RetentionTrackerPage() {
  const [data, setData] = useState<RetentionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Retention release modal
  const [releaseModal, setReleaseModal] = useState<{ contractId: string; contractRef: string; balance: number } | null>(null)
  const [releaseAmount, setReleaseAmount] = useState('')
  const [releaseNote, setReleaseNote] = useState('')

  useEffect(() => {
    fetchRetention()
  }, [filter, search])

  async function fetchRetention() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'All') params.set('filter', filter)
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/finance/contracts/retention?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load retention data')
      const json = await res.json()
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleReleaseRetention() {
    if (!releaseModal || !releaseAmount || parseFloat(releaseAmount) <= 0) return

    setActionLoading(releaseModal.contractId)
    try {
      const res = await fetch(`/api/finance/contracts/${releaseModal.contractId}/retention/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(releaseAmount),
          note: releaseNote.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to release retention')
      setReleaseModal(null)
      setReleaseAmount('')
      setReleaseNote('')
      await fetchRetention()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to release retention')
    } finally {
      setActionLoading(null)
    }
  }

  const records = data?.records || []
  const summary = data?.summary

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Retention Tracker</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track and manage retention held across all construction contracts
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Total Retention Held</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalRetentionHeld)}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Due for Release (30 days)</p>
                <p className="text-xl font-bold text-blue-700">{formatCurrency(summary.dueForRelease)}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Overdue for Release</p>
                <p className="text-xl font-bold text-red-700">{formatCurrency(summary.overdueForRelease)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 card p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label">Filter</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input"
            >
              {FILTER_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="label">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by contract ref, client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 animate-pulse space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 w-20 rounded bg-gray-200" />
                  <div className="h-4 w-32 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-20 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : records.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Contract Ref</th>
                  <th className="table-header">Client</th>
                  <th className="table-header text-right">Contract Value</th>
                  <th className="table-header text-right">Retention Held</th>
                  <th className="table-header text-right">Released</th>
                  <th className="table-header text-right">Balance</th>
                  <th className="table-header">PC Date</th>
                  <th className="table-header">Defects End</th>
                  <th className="table-header">Next Release</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className={cn(
                      'hover:bg-gray-50 transition-colors',
                      record.isOverdue && 'bg-red-50 hover:bg-red-100'
                    )}
                  >
                    <td className="table-cell">
                      <Link
                        href={`/finance/contracts/${record.id}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {record.contractRef}
                      </Link>
                    </td>
                    <td className="table-cell">{record.clientName}</td>
                    <td className="table-cell text-right font-mono">{formatCurrency(record.contractValue)}</td>
                    <td className="table-cell text-right font-mono">{formatCurrency(record.totalRetentionHeld)}</td>
                    <td className="table-cell text-right font-mono text-green-600">{formatCurrency(record.totalReleased)}</td>
                    <td className="table-cell text-right font-mono font-semibold">
                      {formatCurrency(record.retentionBalance)}
                    </td>
                    <td className="table-cell text-sm">
                      {record.practicalCompletionDate ? formatDate(record.practicalCompletionDate) : '—'}
                    </td>
                    <td className="table-cell text-sm">
                      {record.defectsEndDate ? formatDate(record.defectsEndDate) : '—'}
                    </td>
                    <td className="table-cell text-sm">
                      {record.nextReleaseDate ? (
                        <span className={cn(record.isOverdue && 'text-red-600 font-semibold')}>
                          {formatDate(record.nextReleaseDate)}
                          {record.isOverdue && (
                            <AlertTriangle size={12} className="inline ml-1 text-red-500" />
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="table-cell">
                      <span className={statusBadgeMap[record.status] || 'badge-gray'}>
                        {statusLabel[record.status] || record.status}
                      </span>
                    </td>
                    <td className="table-cell">
                      {record.retentionBalance > 0 && (
                        <button
                          onClick={() => {
                            setReleaseModal({
                              contractId: record.id,
                              contractRef: record.contractRef,
                              balance: record.retentionBalance,
                            })
                            setReleaseAmount('')
                            setReleaseNote('')
                          }}
                          disabled={actionLoading === record.id}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                        >
                          Release
                        </button>
                      )}
                      {record.retentionBalance === 0 && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle size={12} />
                          Released
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                  <td className="table-cell" colSpan={3}>Totals</td>
                  <td className="table-cell text-right font-mono">
                    {formatCurrency(records.reduce((s, r) => s + r.totalRetentionHeld, 0))}
                  </td>
                  <td className="table-cell text-right font-mono text-green-600">
                    {formatCurrency(records.reduce((s, r) => s + r.totalReleased, 0))}
                  </td>
                  <td className="table-cell text-right font-mono">
                    {formatCurrency(records.reduce((s, r) => s + r.retentionBalance, 0))}
                  </td>
                  <td className="table-cell" colSpan={5} />
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="py-12 text-center">
              <ShieldCheck size={40} className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No retention records found</p>
              <p className="text-xs text-gray-400 mt-1">
                Retention will appear here as applications for payment are certified
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Release Retention */}
      {releaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Release Retention</h3>
              <button
                onClick={() => setReleaseModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <p className="text-sm text-yellow-800">
                Contract: <strong>{releaseModal.contractRef}</strong>
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                Retention balance: <strong>{formatCurrency(releaseModal.balance)}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Release Amount <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={releaseModal.balance}
                    value={releaseAmount}
                    onChange={(e) => setReleaseAmount(e.target.value)}
                    placeholder="0.00"
                    className="input pl-7 font-mono"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setReleaseAmount(String(releaseModal.balance / 2))}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    50% ({formatCurrency(releaseModal.balance / 2)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReleaseAmount(String(releaseModal.balance))}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    100% ({formatCurrency(releaseModal.balance)})
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Note</label>
                <textarea
                  rows={2}
                  value={releaseNote}
                  onChange={(e) => setReleaseNote(e.target.value)}
                  placeholder="e.g. 50% release at practical completion"
                  className="input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setReleaseModal(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleReleaseRetention}
                disabled={!!actionLoading || !releaseAmount || parseFloat(releaseAmount) <= 0}
                className="btn-primary"
              >
                <ShieldCheck size={16} className="mr-2" />
                {actionLoading ? 'Releasing...' : 'Release Retention'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
