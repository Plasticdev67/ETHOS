'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Save,
  Edit2,
  X,
  Trash2,
  AlertTriangle,
  Tag,
  Loader2,
} from 'lucide-react'

// --- Type definitions ---

interface VATCode {
  id: string
  code: string
  name: string
  rate: number
  hmrcBox: string | null
  isDefault: boolean
  isActive: boolean
  usageCount?: number
  createdAt?: string
  updatedAt?: string
}

const HMRC_BOXES = [
  { value: '', label: 'None' },
  { value: '1', label: 'Box 1 - VAT due on sales' },
  { value: '2', label: 'Box 2 - VAT due on EU acquisitions' },
  { value: '3', label: 'Box 3 - Total VAT due' },
  { value: '4', label: 'Box 4 - VAT reclaimed on purchases' },
  { value: '5', label: 'Box 5 - Net VAT to pay/reclaim' },
  { value: '6', label: 'Box 6 - Total sales ex VAT' },
  { value: '7', label: 'Box 7 - Total purchases ex VAT' },
  { value: '8', label: 'Box 8 - EU supplies' },
  { value: '9', label: 'Box 9 - EU acquisitions' },
]

export default function VATCodeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [vatCode, setVatCode] = useState<VATCode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [form, setForm] = useState({
    name: '',
    rate: '',
    hmrcBox: '',
    isDefault: false,
  })

  useEffect(() => {
    fetchVATCode()
  }, [id])

  async function fetchVATCode() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/finance/vat/codes/${id}`)
      if (!res.ok) throw new Error('Failed to load VAT code')
      const data = await res.json()
      setVatCode(data)
      setForm({
        name: data.name || '',
        rate: String(data.rate ?? ''),
        hmrcBox: data.hmrcBox != null ? String(data.hmrcBox) : '',
        isDefault: data.isDefault || false,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleCancelEdit() {
    if (!vatCode) return
    setForm({
      name: vatCode.name || '',
      rate: String(vatCode.rate ?? ''),
      hmrcBox: vatCode.hmrcBox != null ? String(vatCode.hmrcBox) : '',
      isDefault: vatCode.isDefault || false,
    })
    setEditing(false)
    setError(null)
  }

  async function handleSave() {
    if (!vatCode) return
    setSaving(true)
    setError(null)

    try {
      const payload = {
        name: form.name.trim(),
        rate: parseFloat(form.rate),
        hmrcBox: form.hmrcBox || null,
        isDefault: form.isDefault,
      }

      if (!payload.name) throw new Error('Name is required')
      if (isNaN(payload.rate) || payload.rate < 0) throw new Error('A valid rate is required')

      const res = await fetch(`/api/finance/vat/codes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update VAT code')
      }

      setEditing(false)
      await fetchVATCode()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/vat/codes/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete VAT code')
      }
      router.push('/finance/vat/codes')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete VAT code')
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeactivate() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/vat/codes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !vatCode?.isActive }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update VAT code')
      }
      await fetchVATCode()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update VAT code')
    } finally {
      setSaving(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="h-4 w-48 rounded bg-gray-200 animate-pulse mb-4" />
          <div className="h-8 w-64 rounded bg-gray-200 animate-pulse mb-2" />
          <div className="h-4 w-36 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="card p-6 animate-pulse space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="h-4 flex-1 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state (no data)
  if (error && !vatCode) {
    return (
      <div>
        <Link
          href="/finance/vat/codes"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to VAT Codes
        </Link>
        <div className="card p-12 text-center">
          <AlertTriangle size={40} className="mx-auto text-red-400 mb-3" />
          <p className="text-lg font-medium text-gray-900">Error Loading VAT Code</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!vatCode) return null

  const hasUsage = (vatCode.usageCount || 0) > 0

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
          <Link href="/finance/vat" className="hover:text-gray-700">VAT & MTD</Link>
          <span>/</span>
          <Link href="/finance/vat/codes" className="hover:text-gray-700">VAT Codes</Link>
          <span>/</span>
          <span className="text-gray-900">{vatCode.code}</span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{vatCode.code}</h1>
              {vatCode.isActive ? (
                <span className="badge-success">Active</span>
              ) : (
                <span className="badge-gray">Inactive</span>
              )}
              {vatCode.isDefault && (
                <span className="badge-info">Default</span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">{vatCode.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <>
                <button onClick={() => setEditing(true)} className="btn-primary">
                  <Edit2 size={16} className="mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleDeactivate}
                  disabled={saving}
                  className="btn-secondary"
                >
                  {vatCode.isActive ? 'Deactivate' : 'Activate'}
                </button>
                {!hasUsage && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn-ghost text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete
                  </button>
                )}
              </>
            ) : (
              <>
                <button onClick={handleCancelEdit} className="btn-secondary">
                  <X size={16} className="mr-2" />
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
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

      {/* Details Card */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">VAT Code Details</h2>

        {editing ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Code (read-only) */}
            <div>
              <label className="label">VAT Code</label>
              <input
                type="text"
                value={vatCode.code}
                disabled
                className="input bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-400">Code cannot be changed after creation</p>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="label">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="input"
              />
            </div>

            {/* Rate */}
            <div>
              <label htmlFor="rate" className="label">
                Rate (%) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={form.rate}
                  onChange={(e) => handleChange('rate', e.target.value)}
                  className="input pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>

            {/* HMRC Box */}
            <div>
              <label htmlFor="hmrcBox" className="label">HMRC Box</label>
              <select
                id="hmrcBox"
                value={form.hmrcBox}
                onChange={(e) => handleChange('hmrcBox', e.target.value)}
                className="input"
              >
                {HMRC_BOXES.map((box) => (
                  <option key={box.value} value={box.value}>{box.label}</option>
                ))}
              </select>
            </div>

            {/* Is Default */}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => handleChange('isDefault', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900">Set as default VAT code</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">VAT Code</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{vatCode.code}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Name</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{vatCode.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Rate</p>
              <p className="mt-1 text-sm font-medium text-gray-900 font-mono">{vatCode.rate}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">HMRC Box</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {vatCode.hmrcBox || 'None'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Default</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {vatCode.isDefault ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <p className="mt-1">
                {vatCode.isActive ? (
                  <span className="badge-success">Active</span>
                ) : (
                  <span className="badge-gray">Inactive</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Usage Stats */}
      <div className="card p-6 mt-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Usage Statistics</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Tag size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 font-mono">
              {vatCode.usageCount !== undefined ? vatCode.usageCount : '--'}
            </p>
            <p className="text-xs text-gray-500">Journal lines using this VAT code</p>
          </div>
        </div>
        {hasUsage && (
          <div className="mt-4 rounded-md bg-yellow-50 border border-yellow-200 p-3">
            <p className="text-xs text-yellow-800">
              This VAT code is in use and cannot be deleted. You can deactivate it to prevent
              future use while preserving historical records.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete VAT Code</h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-start gap-3 mb-6">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete the VAT code{' '}
                  <strong>{vatCode.code} ({vatCode.name})</strong>? This action cannot be undone.
                </p>
                {hasUsage && (
                  <p className="text-sm text-red-600 mt-2">
                    Warning: This code has {vatCode.usageCount} journal lines using it.
                    Consider deactivating instead.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-primary bg-red-600 hover:bg-red-700"
              >
                <Trash2 size={16} className="mr-2" />
                {deleting ? 'Deleting...' : 'Delete VAT Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
