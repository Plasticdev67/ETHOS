'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Send,
  Trash2,
  RefreshCw,
  Shield,
  AlertTriangle,
  X,
  Loader2,
  Info,
  FileCheck,
  Undo2,
} from 'lucide-react'

// --- Type definitions ---

interface BreakdownLine {
  vatCode: string
  description: string
  netAmount: number
  vatAmount: number
  hmrcBox: string
}

interface VATReturnDetail {
  id: string
  periodId: string
  periodName: string
  periodStart: string
  periodEnd: string
  box1: number
  box2: number
  box3: number
  box4: number
  box5: number
  box6: number
  box7: number
  box8: number
  box9: number
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'SUBMITTED' | 'ERROR'
  breakdown?: BreakdownLine[]
  submittedAt?: string | null
  submittedBy?: string | null
  hmrcCorrelationId?: string | null
  hmrcReceiptId?: string | null
  createdAt?: string
  updatedAt?: string
}

const statusBadge: Record<string, string> = {
  DRAFT: 'badge-gray',
  CALCULATED: 'badge-info',
  APPROVED: 'badge-warning',
  SUBMITTED: 'badge-success',
  ERROR: 'badge-danger',
}

const BOX_DESCRIPTIONS: Record<number, string> = {
  1: 'VAT due in the period on sales and other outputs',
  2: 'VAT due in the period on acquisitions of goods from EU member states',
  3: 'Total VAT due (the sum of Box 1 and Box 2)',
  4: 'VAT reclaimed in the period on purchases and other inputs',
  5: 'Net VAT to pay to HMRC or reclaim (difference between Box 3 and Box 4)',
  6: 'Total value of sales and all other outputs excluding any VAT',
  7: 'Total value of purchases and all other inputs excluding any VAT',
  8: 'Total value of dispatches of goods and related costs (excluding VAT) to EU member states',
  9: 'Total value of acquisitions of goods and related costs (excluding VAT) from EU member states',
}

export default function VATReturnDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [vatReturn, setVatReturn] = useState<VATReturnDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Editable box values (only for CALCULATED status)
  const [editBoxes, setEditBoxes] = useState({
    box1: '',
    box2: '',
    box4: '',
    box6: '',
    box7: '',
    box8: '',
    box9: '',
  })

  useEffect(() => {
    fetchReturn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchReturn() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/finance/vat/returns/${id}`)
      if (!res.ok) throw new Error('Failed to load VAT return')
      const data = await res.json()
      setVatReturn(data)
      setEditBoxes({
        box1: String(data.box1 ?? 0),
        box2: String(data.box2 ?? 0),
        box4: String(data.box4 ?? 0),
        box6: String(data.box6 ?? 0),
        box7: String(data.box7 ?? 0),
        box8: String(data.box8 ?? 0),
        box9: String(data.box9 ?? 0),
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Computed boxes
  const box1 = parseFloat(editBoxes.box1) || 0
  const box2 = parseFloat(editBoxes.box2) || 0
  const box3 = box1 + box2
  const box4 = parseFloat(editBoxes.box4) || 0
  const box5 = box3 - box4
  const box6 = parseFloat(editBoxes.box6) || 0
  const box7 = parseFloat(editBoxes.box7) || 0
  const box8 = parseFloat(editBoxes.box8) || 0
  const box9 = parseFloat(editBoxes.box9) || 0

  function handleBoxChange(box: string, value: string) {
    setEditBoxes((prev) => ({ ...prev, [box]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        box1,
        box2,
        box3,
        box4,
        box5,
        box6,
        box7,
        box8,
        box9,
      }
      const res = await fetch(`/api/finance/vat/returns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save VAT return')
      }
      await fetchReturn()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  async function handleApprove() {
    if (!confirm('Are you sure you want to approve this VAT return for submission? Please verify all values are correct.')) return
    setActionLoading('approve')
    setError(null)
    try {
      const res = await fetch(`/api/finance/vat/returns/${id}/approve`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to approve VAT return')
      }
      await fetchReturn()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve return')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSubmit() {
    if (!confirm('Are you sure you want to submit this VAT return to HMRC? This action cannot be undone.')) return
    setActionLoading('submit')
    setError(null)
    try {
      const res = await fetch(`/api/finance/vat/returns/${id}/submit`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit VAT return')
      }
      await fetchReturn()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit return')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete() {
    setActionLoading('delete')
    setError(null)
    try {
      const res = await fetch(`/api/finance/vat/returns/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete VAT return')
      }
      router.push('/finance/vat')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete return')
      setShowDeleteConfirm(false)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRevokeApproval() {
    if (!confirm('Are you sure you want to revoke approval? The return will go back to CALCULATED status.')) return
    setActionLoading('revoke')
    setError(null)
    try {
      // PUT to set status back to CALCULATED
      const res = await fetch(`/api/finance/vat/returns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CALCULATED' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to revoke approval')
      }
      await fetchReturn()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to revoke approval')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRecalculate() {
    if (!confirm('Are you sure you want to recalculate this return? Current values may be overwritten.')) return
    setActionLoading('recalculate')
    setError(null)
    try {
      // Delete then recreate
      const res = await fetch(`/api/finance/vat/returns/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to recalculate')
      }
      // Recreate
      if (vatReturn?.periodId) {
        const createRes = await fetch('/api/finance/vat/returns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ periodId: vatReturn.periodId }),
        })
        if (!createRes.ok) {
          throw new Error('Failed to recalculate VAT return')
        }
        const newReturn = await createRes.json()
        router.push(`/finance/vat/returns/${newReturn.id}`)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to recalculate return')
    } finally {
      setActionLoading(null)
    }
  }

  const isEditable = vatReturn?.status === 'CALCULATED'

  // Loading state
  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="h-4 w-48 rounded bg-gray-200 animate-pulse mb-4" />
          <div className="h-8 w-72 rounded bg-gray-200 animate-pulse mb-2" />
          <div className="h-4 w-56 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="card p-6 animate-pulse space-y-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-64 rounded bg-gray-200" />
              <div className="h-4 w-24 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state (no data)
  if (error && !vatReturn) {
    return (
      <div>
        <Link
          href="/finance/vat"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to VAT & MTD
        </Link>
        <div className="card p-12 text-center">
          <AlertTriangle size={40} className="mx-auto text-red-400 mb-3" />
          <p className="text-lg font-medium text-gray-900">Error Loading VAT Return</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!vatReturn) return null

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
          <Link href="/finance/vat" className="hover:text-gray-700">VAT & MTD</Link>
          <span>/</span>
          <span className="text-gray-900">{vatReturn.periodName || 'VAT Return'}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">
                VAT Return: {vatReturn.periodName}
              </h1>
              <span className={statusBadge[vatReturn.status] || 'badge-gray'}>
                {vatReturn.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {formatDate(vatReturn.periodStart)} to {formatDate(vatReturn.periodEnd)}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {vatReturn.status === 'DRAFT' && (
              <button
                onClick={handleRecalculate}
                disabled={actionLoading === 'recalculate'}
                className="btn-primary"
              >
                {actionLoading === 'recalculate' ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <RefreshCw size={16} className="mr-2" />
                )}
                Recalculate
              </button>
            )}
            {vatReturn.status === 'CALCULATED' && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-secondary"
                >
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading === 'approve'}
                  className="btn-primary"
                >
                  {actionLoading === 'approve' ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <CheckCircle size={16} className="mr-2" />
                  )}
                  Approve
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn-ghost text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete
                </button>
              </>
            )}
            {vatReturn.status === 'APPROVED' && (
              <>
                <button
                  onClick={handleSubmit}
                  disabled={actionLoading === 'submit'}
                  className="btn-primary"
                >
                  {actionLoading === 'submit' ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Send size={16} className="mr-2" />
                  )}
                  Submit to HMRC
                </button>
                <button
                  onClick={handleRevokeApproval}
                  disabled={actionLoading === 'revoke'}
                  className="btn-secondary"
                >
                  {actionLoading === 'revoke' ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Undo2 size={16} className="mr-2" />
                  )}
                  Revoke Approval
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* HMRC 9-Box VAT Return Form */}
      <div className="card overflow-hidden mb-6">
        {/* Form header */}
        <div className="bg-gradient-to-r from-indigo-800 to-indigo-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-indigo-200" />
            <div>
              <h2 className="text-white font-semibold">VAT Return</h2>
              <p className="text-indigo-200 text-xs mt-0.5">
                HM Revenue & Customs - Nine Box VAT Return
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {/* VAT due section - Boxes 1-5 */}
          <div className="bg-gray-50 px-6 py-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">VAT Calculation</p>
          </div>

          {/* Box 1 */}
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Box 1</p>
              <p className="text-xs text-gray-500 mt-0.5">{BOX_DESCRIPTIONS[1]}</p>
            </div>
            <div className="w-44 text-right">
              {isEditable ? (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editBoxes.box1}
                    onChange={(e) => handleBoxChange('box1', e.target.value)}
                    className="input pl-7 text-right font-mono"
                  />
                </div>
              ) : (
                <span className="text-lg font-mono font-semibold text-gray-900">
                  {formatCurrency(vatReturn.box1)}
                </span>
              )}
            </div>
          </div>

          {/* Box 2 */}
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Box 2</p>
              <p className="text-xs text-gray-500 mt-0.5">{BOX_DESCRIPTIONS[2]}</p>
            </div>
            <div className="w-44 text-right">
              {isEditable ? (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editBoxes.box2}
                    onChange={(e) => handleBoxChange('box2', e.target.value)}
                    className="input pl-7 text-right font-mono"
                  />
                </div>
              ) : (
                <span className="text-lg font-mono font-semibold text-gray-900">
                  {formatCurrency(vatReturn.box2)}
                </span>
              )}
            </div>
          </div>

          {/* Box 3 (calculated) */}
          <div className="px-6 py-4 flex items-center justify-between gap-4 bg-indigo-50/50">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-indigo-900">Box 3</p>
              <p className="text-xs text-indigo-600 mt-0.5">{BOX_DESCRIPTIONS[3]}</p>
            </div>
            <div className="w-44 text-right">
              <span className="text-lg font-mono font-bold text-indigo-900">
                {isEditable ? formatCurrency(box3) : formatCurrency(vatReturn.box3)}
              </span>
              <p className="text-xs text-indigo-500 mt-0.5">Auto-calculated</p>
            </div>
          </div>

          {/* Box 4 */}
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Box 4</p>
              <p className="text-xs text-gray-500 mt-0.5">{BOX_DESCRIPTIONS[4]}</p>
            </div>
            <div className="w-44 text-right">
              {isEditable ? (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editBoxes.box4}
                    onChange={(e) => handleBoxChange('box4', e.target.value)}
                    className="input pl-7 text-right font-mono"
                  />
                </div>
              ) : (
                <span className="text-lg font-mono font-semibold text-gray-900">
                  {formatCurrency(vatReturn.box4)}
                </span>
              )}
            </div>
          </div>

          {/* Box 5 (calculated - NET) */}
          <div className={cn(
            'px-6 py-5 flex items-center justify-between gap-4 border-t-2 border-indigo-200',
            isEditable
              ? (box5 > 0 ? 'bg-red-50' : box5 < 0 ? 'bg-green-50' : 'bg-gray-50')
              : (vatReturn.box5 > 0 ? 'bg-red-50' : vatReturn.box5 < 0 ? 'bg-green-50' : 'bg-gray-50')
          )}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">Box 5</p>
              <p className="text-xs text-gray-600 mt-0.5">{BOX_DESCRIPTIONS[5]}</p>
              {(() => {
                const displayBox5 = isEditable ? box5 : vatReturn.box5
                return (
                  <p className={cn(
                    'text-xs font-medium mt-1',
                    displayBox5 > 0 ? 'text-red-600' : displayBox5 < 0 ? 'text-green-600' : 'text-gray-500'
                  )}>
                    {displayBox5 > 0 ? 'You owe HMRC' : displayBox5 < 0 ? 'HMRC owes you' : 'No VAT liability'}
                  </p>
                )
              })()}
            </div>
            <div className="w-44 text-right">
              <span className={cn(
                'text-xl font-mono font-bold',
                (isEditable ? box5 : vatReturn.box5) > 0
                  ? 'text-red-700'
                  : (isEditable ? box5 : vatReturn.box5) < 0
                    ? 'text-green-700'
                    : 'text-gray-900'
              )}>
                {isEditable ? formatCurrency(box5) : formatCurrency(vatReturn.box5)}
              </span>
              <p className="text-xs text-gray-500 mt-0.5">Auto-calculated</p>
            </div>
          </div>

          {/* Totals section header */}
          <div className="bg-gray-50 px-6 py-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Values Excluding VAT</p>
          </div>

          {/* Box 6 */}
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Box 6</p>
              <p className="text-xs text-gray-500 mt-0.5">{BOX_DESCRIPTIONS[6]}</p>
            </div>
            <div className="w-44 text-right">
              {isEditable ? (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editBoxes.box6}
                    onChange={(e) => handleBoxChange('box6', e.target.value)}
                    className="input pl-7 text-right font-mono"
                  />
                </div>
              ) : (
                <span className="text-lg font-mono font-semibold text-gray-900">
                  {formatCurrency(vatReturn.box6)}
                </span>
              )}
            </div>
          </div>

          {/* Box 7 */}
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Box 7</p>
              <p className="text-xs text-gray-500 mt-0.5">{BOX_DESCRIPTIONS[7]}</p>
            </div>
            <div className="w-44 text-right">
              {isEditable ? (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editBoxes.box7}
                    onChange={(e) => handleBoxChange('box7', e.target.value)}
                    className="input pl-7 text-right font-mono"
                  />
                </div>
              ) : (
                <span className="text-lg font-mono font-semibold text-gray-900">
                  {formatCurrency(vatReturn.box7)}
                </span>
              )}
            </div>
          </div>

          {/* Box 8 */}
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Box 8</p>
              <p className="text-xs text-gray-500 mt-0.5">{BOX_DESCRIPTIONS[8]}</p>
            </div>
            <div className="w-44 text-right">
              {isEditable ? (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editBoxes.box8}
                    onChange={(e) => handleBoxChange('box8', e.target.value)}
                    className="input pl-7 text-right font-mono"
                  />
                </div>
              ) : (
                <span className="text-lg font-mono font-semibold text-gray-900">
                  {formatCurrency(vatReturn.box8)}
                </span>
              )}
            </div>
          </div>

          {/* Box 9 */}
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Box 9</p>
              <p className="text-xs text-gray-500 mt-0.5">{BOX_DESCRIPTIONS[9]}</p>
            </div>
            <div className="w-44 text-right">
              {isEditable ? (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editBoxes.box9}
                    onChange={(e) => handleBoxChange('box9', e.target.value)}
                    className="input pl-7 text-right font-mono"
                  />
                </div>
              ) : (
                <span className="text-lg font-mono font-semibold text-gray-900">
                  {formatCurrency(vatReturn.box9)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submission Details (for SUBMITTED returns) */}
      {vatReturn.status === 'SUBMITTED' && (
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <FileCheck size={20} />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Submission Details</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Submitted At</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {vatReturn.submittedAt ? formatDate(vatReturn.submittedAt) : '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Submitted By</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {vatReturn.submittedBy || '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">HMRC Correlation ID</p>
              <p className="mt-1 text-sm font-medium text-gray-900 font-mono">
                {vatReturn.hmrcCorrelationId || '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">HMRC Receipt ID</p>
              <p className="mt-1 text-sm font-medium text-gray-900 font-mono">
                {vatReturn.hmrcReceiptId || '--'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Section */}
      {vatReturn.breakdown && vatReturn.breakdown.length > 0 && (
        <div className="card overflow-hidden mb-6">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">VAT Breakdown by Code</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">VAT Code</th>
                  <th className="table-header">Description</th>
                  <th className="table-header text-right">Net Amount</th>
                  <th className="table-header text-right">VAT Amount</th>
                  <th className="table-header">HMRC Box</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vatReturn.breakdown.map((line, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-medium">{line.vatCode}</td>
                    <td className="table-cell text-gray-500">{line.description}</td>
                    <td className="table-cell text-right font-mono">{formatCurrency(line.netAmount)}</td>
                    <td className="table-cell text-right font-mono">{formatCurrency(line.vatAmount)}</td>
                    <td className="table-cell">
                      <span className="badge-info">{line.hmrcBox}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                  <td className="table-cell" colSpan={2}>Total</td>
                  <td className="table-cell text-right font-mono">
                    {formatCurrency(vatReturn.breakdown.reduce((s, l) => s + l.netAmount, 0))}
                  </td>
                  <td className="table-cell text-right font-mono">
                    {formatCurrency(vatReturn.breakdown.reduce((s, l) => s + l.vatAmount, 0))}
                  </td>
                  <td className="table-cell" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* MTD Compliance Notice */}
      <div className="rounded-md bg-indigo-50 border border-indigo-200 p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-indigo-800">Making Tax Digital Compliance</p>
            <p className="text-xs text-indigo-600 mt-1">
              This VAT return has been prepared in compliance with Making Tax Digital requirements.
              Digital records are maintained and the return has been calculated from transaction-level data.
              All values are derived from posted journal entries with assigned VAT codes.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete VAT Return</h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-start gap-3 mb-6">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600">
                Are you sure you want to delete the VAT return for{' '}
                <strong>{vatReturn.periodName}</strong>? This will remove the calculated return
                and you will need to recalculate it from scratch.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
                className="btn-primary bg-red-600 hover:bg-red-700"
              >
                <Trash2 size={16} className="mr-2" />
                {actionLoading === 'delete' ? 'Deleting...' : 'Delete Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
