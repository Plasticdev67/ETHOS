'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Plus,
  Search,
  Eye,
  CheckCircle,
  Undo2,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react'

interface JournalEntry {
  id: string
  entryNumber: string
  date: string
  description: string
  reference: string | null
  source: string
  linesCount: number
  totalDebit: number
  totalCredit: number
  status: 'JOURNAL_DRAFT' | 'POSTED' | 'REVERSED'
}

interface JournalResponse {
  entries: JournalEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const statusBadge: Record<string, string> = {
  JOURNAL_DRAFT: 'badge-gray',
  POSTED: 'badge-success',
  REVERSED: 'badge-danger',
}

const SOURCES = ['All', 'MANUAL', 'SALES', 'PURCHASE', 'BANK', 'VAT', 'OPENING', 'ADJUSTMENT']
const STATUSES = ['All', 'JOURNAL_DRAFT', 'POSTED', 'REVERSED']

export default function JournalsPage() {
  const [data, setData] = useState<JournalResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Filters
  const [status, setStatus] = useState('All')
  const [source, setSource] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => {
    fetchJournals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, source, dateFrom, dateTo, search, page])

  async function fetchJournals() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      if (status !== 'All') params.set('status', status)
      if (source !== 'All') params.set('source', source)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/finance/journals?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load journal entries')
      const json = await res.json()
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handlePost(id: string) {
    if (!confirm('Are you sure you want to post this journal entry? This cannot be undone.')) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/finance/journals/${id}/post`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to post journal')
      await fetchJournals()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post journal')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReverse(id: string) {
    if (!confirm('Are you sure you want to reverse this journal entry? A reversal journal will be created.')) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/finance/journals/${id}/reverse`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to reverse journal')
      await fetchJournals()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reverse journal')
    } finally {
      setActionLoading(null)
    }
  }

  const entries = data?.entries || []
  const totalPages = data?.totalPages || 1

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Loading...' : `${data?.total || 0} total entries`}
          </p>
        </div>
        <Link href="/finance/journals/new" className="btn-primary">
          <Plus size={16} className="mr-2" />
          New Journal
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 card p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Status */}
          <div>
            <label className="label">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              className="input"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Source */}
          <div>
            <label className="label">Source</label>
            <select
              value={source}
              onChange={(e) => { setSource(e.target.value); setPage(1) }}
              className="input"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="label">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="input"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="label">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="input"
            />
          </div>

          {/* Search */}
          <div>
            <label className="label">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Description, ref..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
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
                  <div className="h-4 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-20 rounded bg-gray-200" />
                  <div className="h-4 flex-1 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-12 rounded bg-gray-200" />
                  <div className="h-4 w-20 rounded bg-gray-200" />
                  <div className="h-4 w-20 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-20 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : entries.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Entry #</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Description</th>
                  <th className="table-header">Reference</th>
                  <th className="table-header">Source</th>
                  <th className="table-header text-center">Lines</th>
                  <th className="table-header text-right">Total Debit</th>
                  <th className="table-header text-right">Total Credit</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell">
                      <Link
                        href={`/finance/journals/${entry.id}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {entry.entryNumber}
                      </Link>
                    </td>
                    <td className="table-cell">{formatDate(entry.date)}</td>
                    <td className="table-cell max-w-xs truncate">{entry.description}</td>
                    <td className="table-cell text-gray-500">{entry.reference || '—'}</td>
                    <td className="table-cell">
                      <span className="badge-info">{entry.source}</span>
                    </td>
                    <td className="table-cell text-center">{entry.linesCount}</td>
                    <td className="table-cell text-right font-mono">
                      {formatCurrency(entry.totalDebit)}
                    </td>
                    <td className="table-cell text-right font-mono">
                      {formatCurrency(entry.totalCredit)}
                    </td>
                    <td className="table-cell">
                      <span className={statusBadge[entry.status] || 'badge-gray'}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/finance/journals/${entry.id}`}
                          className="text-gray-400 hover:text-gray-600"
                          title="View"
                        >
                          <Eye size={16} />
                        </Link>
                        {entry.status === 'JOURNAL_DRAFT' && (
                          <button
                            onClick={() => handlePost(entry.id)}
                            disabled={actionLoading === entry.id}
                            className="text-green-500 hover:text-green-700 disabled:opacity-50"
                            title="Post"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {entry.status === 'POSTED' && (
                          <button
                            onClick={() => handleReverse(entry.id)}
                            disabled={actionLoading === entry.id}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50"
                            title="Reverse"
                          >
                            <Undo2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center">
              <FileText size={40} className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No journal entries found</p>
              <Link href="/finance/journals/new" className="btn-primary mt-4 inline-flex">
                <Plus size={16} className="mr-2" />
                Create Journal Entry
              </Link>
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              Page {data.page} of {data.totalPages} ({data.total} total entries)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary py-1.5 px-3"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-secondary py-1.5 px-3"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
