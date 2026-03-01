'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { cn, formatCurrency, formatDate, formatDateISO } from '@/lib/utils'
import Decimal from 'decimal.js'
import {
  RefreshCw,
  ArrowLeft,
  Pause,
  Play,
  Trash2,
  Edit,
  Save,
  X,
  Plus,
  FileText,
  Clock,
  Repeat,
} from 'lucide-react'

interface AccountInfo {
  id: string
  code: string
  name: string
  type: string
}

interface VatCodeInfo {
  id: string
  code: string
  name: string
  rate: number
}

interface TemplateLine {
  id: string
  accountId: string
  description: string | null
  debit: number
  credit: number
  vatCodeId: string | null
  account: AccountInfo | null
  vatCode: VatCodeInfo | null
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
  source: string
  createdBy: string
  createdAt: string
  updatedAt: string
  lines: TemplateLine[]
}

interface JournalEntry {
  id: string
  entryNumber: string
  date: string
  description: string
  status: string
  totalDebit: number
  totalCredit: number
  postedAt: string | null
}

// Edit form line type
interface EditLine {
  accountId: string
  description: string
  debit: string
  credit: string
  vatCodeId: string
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

const JOURNAL_STATUS_BADGES: Record<string, string> = {
  DRAFT: 'badge-gray',
  POSTED: 'badge-success',
  REVERSED: 'badge-danger',
}

const FREQUENCY_OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'FORTNIGHTLY', label: 'Fortnightly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUALLY', label: 'Annually' },
]

export default function RecurringTemplateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string

  const [template, setTemplate] = useState<RecurringTemplate | null>(null)
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Edit mode state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editFrequency, setEditFrequency] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editMaxRuns, setEditMaxRuns] = useState('')
  const [editLines, setEditLines] = useState<EditLine[]>([])

  // Reference data for editing
  const [allAccounts, setAllAccounts] = useState<AccountInfo[]>([])
  const [allVatCodes, setAllVatCodes] = useState<VatCodeInfo[]>([])
  const [loadingRefData, setLoadingRefData] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Fetch template details
        const templateRes = await fetch(`/api/finance/recurring/${templateId}`)
        if (!templateRes.ok) throw new Error('Failed to load recurring template')

        const templateData = await templateRes.json()
        setTemplate(templateData)

        // Fetch journal entries posted from this template
        const journalRes = await fetch(`/api/finance/journals?source=SYSTEM&limit=100`)
        if (journalRes.ok) {
          const journalData = await journalRes.json()
          const journalList = journalData.data || []
          // Filter to journals whose sourceId matches this template
          const relatedJournals = journalList.filter(
            (j: JournalEntry & { sourceId?: string }) => j.sourceId === templateId
          )
          setJournals(relatedJournals)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [templateId])

  async function fetchRefData() {
    if (allAccounts.length > 0) return // Already loaded
    try {
      setLoadingRefData(true)
      const [accRes, vatRes] = await Promise.all([
        fetch('/api/finance/accounts'),
        fetch('/api/finance/vat-codes'),
      ])

      if (accRes.ok) {
        const accData = await accRes.json()
        setAllAccounts(Array.isArray(accData) ? accData : accData.accounts || [])
      }
      if (vatRes.ok) {
        const vatData = await vatRes.json()
        setAllVatCodes(Array.isArray(vatData) ? vatData : vatData.vatCodes || [])
      }
    } catch {
      // Reference data loading is non-critical
    } finally {
      setLoadingRefData(false)
    }
  }

  function startEditing() {
    if (!template) return
    setEditName(template.name)
    setEditDescription(template.description || '')
    setEditFrequency(template.frequency)
    setEditStartDate(formatDateISO(template.startDate))
    setEditEndDate(template.endDate ? formatDateISO(template.endDate) : '')
    setEditMaxRuns(template.maxRuns?.toString() || '')
    setEditLines(
      template.lines.map((l) => ({
        accountId: l.accountId,
        description: l.description || '',
        debit: Number(l.debit) > 0 ? l.debit.toString() : '',
        credit: Number(l.credit) > 0 ? l.credit.toString() : '',
        vatCodeId: l.vatCodeId || '',
      }))
    )
    setEditing(true)
    fetchRefData()
  }

  function cancelEditing() {
    setEditing(false)
    setError(null)
  }

  function updateEditLine(index: number, field: keyof EditLine, value: string) {
    setEditLines((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      if (field === 'debit' && value) {
        updated[index].credit = ''
      } else if (field === 'credit' && value) {
        updated[index].debit = ''
      }
      return updated
    })
  }

  function addEditLine() {
    setEditLines((prev) => [
      ...prev,
      { accountId: '', description: '', debit: '', credit: '', vatCodeId: '' },
    ])
  }

  function removeEditLine(index: number) {
    if (editLines.length <= 2) return
    setEditLines((prev) => prev.filter((_, i) => i !== index))
  }

  // Edit totals
  const editTotalDebit = editLines.reduce(
    (sum, l) => sum.plus(new Decimal(l.debit || 0)),
    new Decimal(0)
  )
  const editTotalCredit = editLines.reduce(
    (sum, l) => sum.plus(new Decimal(l.credit || 0)),
    new Decimal(0)
  )
  const editIsBalanced = editTotalDebit.equals(editTotalCredit)
  const editHasValue = editTotalDebit.greaterThan(0) || editTotalCredit.greaterThan(0)
  const editDifference = editTotalDebit.minus(editTotalCredit).abs()

  async function handleSaveEdit() {
    if (!editName.trim()) {
      setError('Template name is required')
      return
    }

    const validLines = editLines.filter((l) => l.accountId && (l.debit || l.credit))
    if (validLines.length < 2) {
      setError('At least 2 journal lines with amounts are required')
      return
    }

    if (!editIsBalanced) {
      setError(
        `Debits (${formatCurrency(editTotalDebit.toNumber())}) must equal credits (${formatCurrency(editTotalCredit.toNumber())})`
      )
      return
    }

    if (!editHasValue) {
      setError('Journal entry cannot have zero value')
      return
    }

    try {
      setActionLoading(true)
      setError(null)

      const body = {
        name: editName.trim(),
        description: editDescription.trim() || null,
        frequency: editFrequency,
        startDate: editStartDate,
        endDate: editEndDate || null,
        maxRuns: editMaxRuns || null,
        lines: validLines.map((l) => ({
          accountId: l.accountId,
          description: l.description.trim() || null,
          debit: l.debit ? parseFloat(l.debit) : 0,
          credit: l.credit ? parseFloat(l.credit) : 0,
          vatCodeId: l.vatCodeId || null,
        })),
      }

      const res = await fetch(`/api/finance/recurring/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to update recurring template')
      }

      // Re-fetch to get updated data with account details
      const refreshRes = await fetch(`/api/finance/recurring/${templateId}`)
      if (refreshRes.ok) {
        const refreshed = await refreshRes.json()
        setTemplate(refreshed)
      }

      setEditing(false)
      setSuccessMsg('Template updated successfully')
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleTogglePause() {
    if (!template) return

    const action = template.status === 'ACTIVE' ? 'pause' : 'resume'
    if (!confirm(`Are you sure you want to ${action} this recurring template?`)) return

    try {
      setActionLoading(true)
      setError(null)

      const res = await fetch(`/api/finance/recurring/${templateId}/pause`, {
        method: 'POST',
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Failed to ${action} template`)
      }

      const result = await res.json()
      setTemplate(result.template)
      setSuccessMsg(result.message)
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this recurring template? This action cannot be undone.')) return

    try {
      setActionLoading(true)
      setError(null)

      const res = await fetch(`/api/finance/recurring/${templateId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to delete template')
      }

      router.push('/finance/recurring')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded w-1/2" />
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-6"><div className="h-24 bg-gray-200 rounded" /></div>
            <div className="card p-6"><div className="h-24 bg-gray-200 rounded" /></div>
          </div>
          <div className="card p-6">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !template) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
        <Link href="/finance/recurring" className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to Recurring Entries
        </Link>
      </div>
    )
  }

  if (!template) return null

  // Calculate line totals using decimal.js
  const totalDebit = template.lines.reduce(
    (sum, l) => sum.plus(new Decimal(l.debit.toString())),
    new Decimal(0)
  )
  const totalCredit = template.lines.reduce(
    (sum, l) => sum.plus(new Decimal(l.credit.toString())),
    new Decimal(0)
  )

  const isDue =
    template.status === 'ACTIVE' &&
    new Date(template.nextRunDate) <= new Date()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/finance" className="hover:text-gray-700">Finance</Link>
        <span>/</span>
        <Link href="/finance/recurring" className="hover:text-gray-700">Recurring Entries</Link>
        <span>/</span>
        <span className="text-gray-900">{template.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <RefreshCw size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
              <span className={STATUS_BADGES[template.status] || 'badge-gray'}>
                {STATUS_LABELS[template.status] || template.status}
              </span>
              {isDue && <span className="badge-warning">Due</span>}
            </div>
            {template.description && (
              <p className="text-sm text-gray-500">{template.description}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {!editing && (
          <div className="flex gap-2 flex-wrap">
            {template.status !== 'EXPIRED' && (
              <>
                <button
                  onClick={startEditing}
                  disabled={actionLoading}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={handleTogglePause}
                  disabled={actionLoading}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  {template.status === 'ACTIVE' ? (
                    <>
                      <Pause size={16} />
                      {actionLoading ? 'Pausing...' : 'Pause'}
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      {actionLoading ? 'Resuming...' : 'Resume'}
                    </>
                  )}
                </button>
              </>
            )}
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="btn-ghost inline-flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Success */}
      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">{successMsg}</p>
        </div>
      )}

      {/* Editing Mode */}
      {editing ? (
        <>
          {/* Edit Form */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Template</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="label">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input w-full"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="label">Description</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Frequency</label>
                <select
                  className="input w-full"
                  value={editFrequency}
                  onChange={(e) => setEditFrequency(e.target.value)}
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Start Date</label>
                <input
                  type="date"
                  className="input w-full"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="label">End Date (optional)</label>
                <input
                  type="date"
                  className="input w-full"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Max Runs (optional)</label>
                <input
                  type="number"
                  className="input w-full"
                  placeholder="Unlimited"
                  value={editMaxRuns}
                  onChange={(e) => setEditMaxRuns(e.target.value)}
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Edit Lines */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Journal Lines</h2>
              <button
                type="button"
                onClick={addEditLine}
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                <Plus size={14} />
                Add Line
              </button>
            </div>

            {loadingRefData ? (
              <div className="p-6">
                <div className="animate-pulse space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="table-header w-10">#</th>
                      <th className="table-header">Account</th>
                      <th className="table-header">Description</th>
                      <th className="table-header w-32 text-right">Debit</th>
                      <th className="table-header w-32 text-right">Credit</th>
                      <th className="table-header">VAT Code</th>
                      <th className="table-header w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {editLines.map((line, index) => (
                      <tr key={index}>
                        <td className="table-cell text-center text-gray-400">{index + 1}</td>
                        <td className="table-cell">
                          <select
                            className="input w-full min-w-[200px]"
                            value={line.accountId}
                            onChange={(e) => updateEditLine(index, 'accountId', e.target.value)}
                          >
                            <option value="">Select account</option>
                            {allAccounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.code} - {acc.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="table-cell">
                          <input
                            type="text"
                            className="input w-full min-w-[150px]"
                            placeholder="Line description"
                            value={line.description}
                            onChange={(e) => updateEditLine(index, 'description', e.target.value)}
                          />
                        </td>
                        <td className="table-cell">
                          <input
                            type="number"
                            className="input w-full text-right"
                            placeholder="0.00"
                            value={line.debit}
                            onChange={(e) => updateEditLine(index, 'debit', e.target.value)}
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="table-cell">
                          <input
                            type="number"
                            className="input w-full text-right"
                            placeholder="0.00"
                            value={line.credit}
                            onChange={(e) => updateEditLine(index, 'credit', e.target.value)}
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="table-cell">
                          <select
                            className="input w-full min-w-[140px]"
                            value={line.vatCodeId}
                            onChange={(e) => updateEditLine(index, 'vatCodeId', e.target.value)}
                          >
                            <option value="">No VAT</option>
                            {allVatCodes.map((vc) => (
                              <option key={vc.id} value={vc.id}>
                                {vc.code} ({vc.rate}%)
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="table-cell text-center">
                          <button
                            type="button"
                            onClick={() => removeEditLine(index)}
                            disabled={editLines.length <= 2}
                            className={cn(
                              'p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors',
                              editLines.length <= 2 && 'opacity-30 cursor-not-allowed'
                            )}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                    <tr>
                      <td colSpan={3} className="table-cell text-right font-semibold text-gray-700">
                        Totals
                      </td>
                      <td className="table-cell text-right font-semibold">
                        {formatCurrency(editTotalDebit.toNumber())}
                      </td>
                      <td className="table-cell text-right font-semibold">
                        {formatCurrency(editTotalCredit.toNumber())}
                      </td>
                      <td colSpan={2} className="table-cell" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {editHasValue && (
              <div className={cn(
                'px-4 py-3 border-t text-sm',
                editIsBalanced
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              )}>
                {editIsBalanced ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                    Journal is balanced
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                    Unbalanced - difference of {formatCurrency(editDifference.toNumber())}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Edit Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={cancelEditing}
              className="btn-ghost inline-flex items-center gap-2"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={actionLoading}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Save size={16} />
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* View Mode */}

          {/* Template Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Schedule</h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Frequency</span>
                  <span className="font-medium inline-flex items-center gap-1.5">
                    <Repeat size={14} className="text-gray-400" />
                    {FREQUENCY_LABELS[template.frequency] || template.frequency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Start Date</span>
                  <span className="font-medium">{formatDate(template.startDate)}</span>
                </div>
                {template.endDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">End Date</span>
                    <span className="font-medium">{formatDate(template.endDate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Next Run</span>
                  <span className={cn('font-medium', isDue && 'text-orange-600')}>
                    {formatDate(template.nextRunDate)}
                    {isDue && <span className="ml-1.5 badge-warning text-xs">Due</span>}
                  </span>
                </div>
                {template.lastRunDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Run</span>
                    <span className="font-medium">{formatDate(template.lastRunDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Execution</h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Runs</span>
                  <span className="font-medium">
                    {template.totalRuns}
                    {template.maxRuns && <span className="text-gray-400"> / {template.maxRuns}</span>}
                  </span>
                </div>
                {template.maxRuns && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Remaining</span>
                    <span className="font-medium">
                      {Math.max(0, template.maxRuns - template.totalRuns)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Journal Value</span>
                  <span className="font-medium">{formatCurrency(totalDebit.toNumber())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="font-medium">{formatDate(template.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created By</span>
                  <span className="font-medium">{template.createdBy}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lines Table */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Journal Lines</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="table-header w-10">#</th>
                    <th className="table-header">Account</th>
                    <th className="table-header">Description</th>
                    <th className="table-header text-right">Debit</th>
                    <th className="table-header text-right">Credit</th>
                    <th className="table-header">VAT Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {template.lines.map((line, index) => (
                    <tr key={line.id}>
                      <td className="table-cell text-center text-gray-400">{index + 1}</td>
                      <td className="table-cell font-medium">
                        {line.account
                          ? `${line.account.code} - ${line.account.name}`
                          : line.accountId}
                      </td>
                      <td className="table-cell text-gray-500">
                        {line.description || '-'}
                      </td>
                      <td className="table-cell text-right">
                        {Number(line.debit) > 0 ? formatCurrency(line.debit) : '-'}
                      </td>
                      <td className="table-cell text-right">
                        {Number(line.credit) > 0 ? formatCurrency(line.credit) : '-'}
                      </td>
                      <td className="table-cell">
                        {line.vatCode
                          ? `${line.vatCode.code} (${line.vatCode.rate}%)`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                  <tr>
                    <td colSpan={3} className="table-cell text-right font-semibold text-gray-700">
                      Totals
                    </td>
                    <td className="table-cell text-right font-semibold">
                      {formatCurrency(totalDebit.toNumber())}
                    </td>
                    <td className="table-cell text-right font-semibold">
                      {formatCurrency(totalCredit.toNumber())}
                    </td>
                    <td className="table-cell" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Posted Journals History */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Posted Journal History ({journals.length})
                </h3>
              </div>
            </div>

            {journals.length === 0 ? (
              <div className="p-8 text-center">
                <Clock size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">
                  No journals have been posted from this template yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="table-header">Entry Number</th>
                      <th className="table-header">Date</th>
                      <th className="table-header">Description</th>
                      <th className="table-header text-right">Debit</th>
                      <th className="table-header text-right">Credit</th>
                      <th className="table-header">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {journals.map((journal) => (
                      <tr key={journal.id} className="hover:bg-gray-50">
                        <td className="table-cell">
                          <Link
                            href={`/finance/journals/${journal.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {journal.entryNumber}
                          </Link>
                        </td>
                        <td className="table-cell">{formatDate(journal.date)}</td>
                        <td className="table-cell text-gray-500">{journal.description}</td>
                        <td className="table-cell text-right">
                          {formatCurrency(journal.totalDebit)}
                        </td>
                        <td className="table-cell text-right">
                          {formatCurrency(journal.totalCredit)}
                        </td>
                        <td className="table-cell">
                          <span className={JOURNAL_STATUS_BADGES[journal.status] || 'badge-gray'}>
                            {journal.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
