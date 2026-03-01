'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  CheckCircle,
  Undo2,
  Trash2,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react'

interface JournalLine {
  id: string
  accountCode: string
  accountName: string
  description: string | null
  debit: number
  credit: number
  vatCode: string | null
  vatAmount: number | null
  project: string | null
}

interface AuditLogEntry {
  id: string
  action: string
  performedBy: string
  performedAt: string
  details: string | null
}

interface Journal {
  id: string
  entryNumber: string
  date: string
  postingDate: string | null
  periodName: string | null
  description: string
  reference: string | null
  source: string
  status: 'JOURNAL_DRAFT' | 'POSTED' | 'REVERSED'
  createdBy: string
  postedAt: string | null
  postedBy: string | null
  reversalJournalId: string | null
  reversalOfJournalId: string | null
  reversalEntryNumber: string | null
  originalEntryNumber: string | null
  lines: JournalLine[]
  auditLog: AuditLogEntry[]
  totalDebit: number
  totalCredit: number
}

const statusBadgeMap: Record<string, string> = {
  JOURNAL_DRAFT: 'badge-gray',
  POSTED: 'badge-success',
  REVERSED: 'badge-danger',
}

export default function JournalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [journal, setJournal] = useState<Journal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showReverseDialog, setShowReverseDialog] = useState(false)

  useEffect(() => {
    fetchJournal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchJournal() {
    try {
      setLoading(true)
      const res = await fetch(`/api/finance/journals/${id}`)
      if (!res.ok) throw new Error('Failed to load journal entry')
      const data = await res.json()
      setJournal(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handlePost() {
    if (!confirm('Are you sure you want to post this journal entry? This cannot be undone.')) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/finance/journals/${id}/post`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to post journal')
      await fetchJournal()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post journal')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReverse() {
    setActionLoading(true)
    setShowReverseDialog(false)
    try {
      const res = await fetch(`/api/finance/journals/${id}/reverse`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to reverse journal')
      await fetchJournal()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reverse journal')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this draft journal entry? This cannot be undone.')) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/finance/journals/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete journal')
      router.push('/finance/journals')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete journal')
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="h-4 w-32 rounded bg-gray-200 animate-pulse mb-4" />
          <div className="h-8 w-64 rounded bg-gray-200 animate-pulse mb-2" />
          <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="card p-6 animate-pulse space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-28 rounded bg-gray-200" />
              <div className="h-4 flex-1 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error && !journal) {
    return (
      <div>
        <Link
          href="/finance/journals"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Journal Entries
        </Link>
        <div className="card p-12 text-center">
          <AlertTriangle size={40} className="mx-auto text-red-400 mb-3" />
          <p className="text-lg font-medium text-gray-900">Error Loading Journal</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!journal) return null

  return (
    <div>
      {/* Back link */}
      <Link
        href="/finance/journals"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={16} className="mr-1" />
        Back to Journal Entries
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Journal {journal.entryNumber}
            </h1>
            <span className={cn('text-sm px-3 py-1', statusBadgeMap[journal.status])}>
              {journal.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{journal.description}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {journal.status === 'JOURNAL_DRAFT' && (
            <>
              <button
                onClick={handlePost}
                disabled={actionLoading}
                className="btn-primary"
              >
                <CheckCircle size={16} className="mr-2" />
                Post
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="btn-danger"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </button>
            </>
          )}
          {journal.status === 'POSTED' && (
            <button
              onClick={() => setShowReverseDialog(true)}
              disabled={actionLoading}
              className="btn-danger"
            >
              <Undo2 size={16} className="mr-2" />
              Reverse
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Reversal links */}
      {journal.status === 'REVERSED' && journal.reversalJournalId && (
        <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm text-yellow-800">
            This journal has been reversed. View the reversal journal:{' '}
            <Link
              href={`/finance/journals/${journal.reversalJournalId}`}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              {journal.reversalEntryNumber || 'Reversal'}
            </Link>
          </p>
        </div>
      )}
      {journal.reversalOfJournalId && (
        <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-800">
            This is a reversal of journal:{' '}
            <Link
              href={`/finance/journals/${journal.reversalOfJournalId}`}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              {journal.originalEntryNumber || 'Original'}
            </Link>
          </p>
        </div>
      )}

      {/* Journal info */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Journal Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Entry Number</dt>
            <dd className="mt-1 text-sm text-gray-900">{journal.entryNumber}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(journal.date)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Posting Date</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {journal.postingDate ? formatDate(journal.postingDate) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Period</dt>
            <dd className="mt-1 text-sm text-gray-900">{journal.periodName || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Reference</dt>
            <dd className="mt-1 text-sm text-gray-900">{journal.reference || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Source</dt>
            <dd className="mt-1">
              <span className="badge-info">{journal.source}</span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created By</dt>
            <dd className="mt-1 text-sm text-gray-900">{journal.createdBy}</dd>
          </div>
          {journal.postedBy && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Posted By</dt>
              <dd className="mt-1 text-sm text-gray-900">{journal.postedBy}</dd>
            </div>
          )}
          {journal.postedAt && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Posted At</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(journal.postedAt)}</dd>
            </div>
          )}
        </div>
      </div>

      {/* Journal lines */}
      <div className="card overflow-hidden mb-6">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Journal Lines</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Account</th>
                <th className="table-header">Description</th>
                <th className="table-header text-right">Debit</th>
                <th className="table-header text-right">Credit</th>
                <th className="table-header">VAT Code</th>
                <th className="table-header text-right">VAT Amount</th>
                <th className="table-header">Project</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {journal.lines.map((line) => (
                <tr key={line.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <span className="font-mono text-xs text-gray-500">{line.accountCode}</span>
                    <span className="ml-2">{line.accountName}</span>
                  </td>
                  <td className="table-cell text-gray-500">{line.description || '—'}</td>
                  <td className="table-cell text-right font-mono">
                    {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                  </td>
                  <td className="table-cell text-right font-mono">
                    {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                  </td>
                  <td className="table-cell">{line.vatCode || '—'}</td>
                  <td className="table-cell text-right font-mono">
                    {line.vatAmount != null ? formatCurrency(line.vatAmount) : '—'}
                  </td>
                  <td className="table-cell">{line.project || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                <td className="table-cell" colSpan={2}>
                  Totals
                </td>
                <td className="table-cell text-right font-mono">
                  {formatCurrency(journal.totalDebit)}
                </td>
                <td className="table-cell text-right font-mono">
                  {formatCurrency(journal.totalCredit)}
                </td>
                <td colSpan={3} className="table-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Audit log */}
      {journal.auditLog && journal.auditLog.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Audit Log</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {journal.auditLog.map((entry) => (
              <div key={entry.id} className="px-6 py-3 flex items-start gap-3">
                <Clock size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{entry.action}</span>
                    {entry.details && (
                      <span className="text-gray-500"> — {entry.details}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {entry.performedBy} on {formatDate(entry.performedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reverse confirmation dialog */}
      {showReverseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Reverse Journal Entry</h3>
              <button
                onClick={() => setShowReverseDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Are you sure you want to reverse journal <strong>{journal.entryNumber}</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This will create a new journal entry with all debits and credits swapped. The original
              journal will be marked as REVERSED.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReverseDialog(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleReverse}
                disabled={actionLoading}
                className="btn-danger"
              >
                <Undo2 size={16} className="mr-2" />
                {actionLoading ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
