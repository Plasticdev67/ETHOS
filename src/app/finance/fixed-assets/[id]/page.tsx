'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Package,
  ArrowLeft,
  Edit3,
  Trash2,
  XCircle,
  Save,
  Loader2,
  Calendar,
  PoundSterling,
  TrendingDown,
  MapPin,
  Hash,
  FolderOpen,
  AlertTriangle,
} from 'lucide-react'

interface DepreciationEntry {
  id: string
  date: string
  amount: number
  runningNBV: number
  journalEntryId: string | null
  periodId: string | null
}

interface AssetDetail {
  id: string
  assetCode: string
  name: string
  description: string | null
  category: {
    id: string
    name: string
    depreciationMethod: string
    depreciationRate: number
    usefulLifeMonths: number | null
    assetAccount: { id: string; code: string; name: string } | null
    depreciationAccount: { id: string; code: string; name: string } | null
    accumulatedDepAccount: { id: string; code: string; name: string } | null
  }
  purchaseDate: string
  purchaseCost: number
  residualValue: number
  accumulatedDepreciation: number
  netBookValue: number
  serialNumber: string | null
  location: string | null
  status: string
  disposalDate: string | null
  disposalProceeds: number | null
  disposalGainLoss: number | null
  depreciationEntries: DepreciationEntry[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

const STATUS_BADGES: Record<string, string> = {
  ASSET_ACTIVE: 'badge-success',
  DISPOSED: 'badge-gray',
  FULLY_DEPRECIATED: 'badge-warning',
  WRITTEN_OFF: 'badge-danger',
}

const STATUS_LABELS: Record<string, string> = {
  ASSET_ACTIVE: 'Active',
  DISPOSED: 'Disposed',
  FULLY_DEPRECIATED: 'Fully Depreciated',
  WRITTEN_OFF: 'Written Off',
}

const METHOD_LABELS: Record<string, string> = {
  STRAIGHT_LINE: 'Straight Line',
  REDUCING_BALANCE: 'Reducing Balance',
  NONE: 'None',
}

export default function FixedAssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [asset, setAsset] = useState<AssetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSerialNumber, setEditSerialNumber] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editResidualValue, setEditResidualValue] = useState('')
  const [saving, setSaving] = useState(false)

  // Dispose modal
  const [showDisposeModal, setShowDisposeModal] = useState(false)
  const [disposalDate, setDisposalDate] = useState('')
  const [disposalProceeds, setDisposalProceeds] = useState('0')
  const [disposing, setDisposing] = useState(false)

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function fetchAsset() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/finance/fixed-assets/${id}`)
        if (!res.ok) {
          if (res.status === 404) throw new Error('Asset not found')
          throw new Error('Failed to load asset')
        }
        const data = await res.json()
        setAsset(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchAsset()
  }, [id])

  const startEditing = () => {
    if (!asset) return
    setEditName(asset.name)
    setEditDescription(asset.description || '')
    setEditSerialNumber(asset.serialNumber || '')
    setEditLocation(asset.location || '')
    setEditResidualValue(asset.residualValue.toString())
    setEditing(true)
  }

  const handleSave = async () => {
    if (!asset) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/finance/fixed-assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          serialNumber: editSerialNumber.trim() || null,
          location: editLocation.trim() || null,
          residualValue: parseFloat(editResidualValue || '0'),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update asset')
      }

      // Refetch full asset
      const refreshRes = await fetch(`/api/finance/fixed-assets/${id}`)
      const refreshData = await refreshRes.json()
      setAsset(refreshData)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDispose = async () => {
    setDisposing(true)
    setError(null)

    try {
      const res = await fetch(`/api/finance/fixed-assets/${id}/dispose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposalDate,
          disposalProceeds: parseFloat(disposalProceeds || '0'),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to dispose asset')
      }

      // Refetch full asset
      const refreshRes = await fetch(`/api/finance/fixed-assets/${id}`)
      const refreshData = await refreshRes.json()
      setAsset(refreshData)
      setShowDisposeModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dispose asset')
    } finally {
      setDisposing(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/finance/fixed-assets/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete asset')
      }

      router.push('/finance/fixed-assets')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete asset')
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="card p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-3/4" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !asset) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/finance/fixed-assets"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Fixed Asset</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle size={32} className="mx-auto text-red-400 mb-2" />
          <p className="text-sm text-red-800">{error}</p>
          <Link href="/finance/fixed-assets" className="btn-primary inline-flex items-center gap-2 mt-4">
            Back to Assets
          </Link>
        </div>
      </div>
    )
  }

  if (!asset) return null

  const depreciationPercentage = asset.purchaseCost > 0
    ? ((asset.accumulatedDepreciation / asset.purchaseCost) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/finance/fixed-assets"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Package size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
                <span className={STATUS_BADGES[asset.status] || 'badge-gray'}>
                  {STATUS_LABELS[asset.status] || asset.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 font-mono">{asset.assetCode}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {asset.status === 'ACTIVE' && !editing && (
            <>
              <button
                onClick={startEditing}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Edit3 size={16} />
                Edit
              </button>
              <button
                onClick={() => setShowDisposeModal(true)}
                className="btn-secondary inline-flex items-center gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <XCircle size={16} />
                Dispose
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-ghost inline-flex items-center gap-2 text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          {editing && (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="btn-ghost inline-flex items-center gap-2"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <PoundSterling size={14} />
            <span className="text-xs">Purchase Cost</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(asset.purchaseCost)}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingDown size={14} />
            <span className="text-xs">Accum. Depreciation</span>
          </div>
          <p className="text-lg font-semibold text-orange-600">
            {formatCurrency(asset.accumulatedDepreciation)}
          </p>
          <p className="text-xs text-gray-400">{depreciationPercentage}% of cost</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <PoundSterling size={14} />
            <span className="text-xs">Net Book Value</span>
          </div>
          <p className="text-lg font-semibold text-green-600">
            {formatCurrency(asset.netBookValue)}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <PoundSterling size={14} />
            <span className="text-xs">Residual Value</span>
          </div>
          <p className="text-lg font-semibold text-gray-600">
            {formatCurrency(asset.residualValue)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Asset Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {editing ? (
                <>
                  <div className="sm:col-span-2">
                    <label className="label">Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="input w-full"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="label">Serial Number</label>
                    <input
                      type="text"
                      value={editSerialNumber}
                      onChange={(e) => setEditSerialNumber(e.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label">Location</label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label">Residual Value</label>
                    <input
                      type="number"
                      value={editResidualValue}
                      onChange={(e) => setEditResidualValue(e.target.value)}
                      className="input w-full"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </>
              ) : (
                <>
                  {asset.description && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Description</p>
                      <p className="text-sm text-gray-700">{asset.description}</p>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <FolderOpen size={14} />
                      <span className="text-xs">Category</span>
                    </div>
                    <p className="text-sm font-medium">{asset.category.name}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Calendar size={14} />
                      <span className="text-xs">Purchase Date</span>
                    </div>
                    <p className="text-sm font-medium">{formatDate(asset.purchaseDate)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Hash size={14} />
                      <span className="text-xs">Serial Number</span>
                    </div>
                    <p className="text-sm font-medium">{asset.serialNumber || '-'}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <MapPin size={14} />
                      <span className="text-xs">Location</span>
                    </div>
                    <p className="text-sm font-medium">{asset.location || '-'}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Depreciation Schedule */}
          <div className="card overflow-hidden">
            <div className="p-6 pb-0">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Depreciation Schedule</h2>
              <p className="text-sm text-gray-500 mb-4">
                {METHOD_LABELS[asset.category.depreciationMethod] || asset.category.depreciationMethod}
                {asset.category.depreciationMethod === 'STRAIGHT_LINE' && asset.category.usefulLifeMonths && (
                  <> &mdash; {asset.category.usefulLifeMonths} months useful life</>
                )}
                {asset.category.depreciationMethod === 'REDUCING_BALANCE' && (
                  <> &mdash; {asset.category.depreciationRate}% per annum</>
                )}
              </p>
            </div>

            {asset.depreciationEntries.length === 0 ? (
              <div className="p-6 text-center">
                <TrendingDown size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">
                  No depreciation entries yet. Run depreciation from the{' '}
                  <Link href="/finance/fixed-assets/depreciation" className="text-blue-600 hover:underline">
                    depreciation page
                  </Link>.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="table-header">Date</th>
                      <th className="table-header text-right">Amount</th>
                      <th className="table-header text-right">Running NBV</th>
                      <th className="table-header">Journal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr className="bg-gray-50">
                      <td className="table-cell text-gray-500 italic">Purchase</td>
                      <td className="table-cell text-right">-</td>
                      <td className="table-cell text-right font-medium">
                        {formatCurrency(asset.purchaseCost)}
                      </td>
                      <td className="table-cell">-</td>
                    </tr>
                    {asset.depreciationEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="table-cell">{formatDate(entry.date)}</td>
                        <td className="table-cell text-right text-orange-600">
                          ({formatCurrency(entry.amount)})
                        </td>
                        <td className="table-cell text-right font-medium">
                          {formatCurrency(entry.runningNBV)}
                        </td>
                        <td className="table-cell">
                          {entry.journalEntryId ? (
                            <Link
                              href={`/finance/journals/${entry.journalEntryId}`}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              View Journal
                            </Link>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Disposal Info (if disposed) */}
          {asset.status === 'DISPOSED' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Disposal Information</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Disposal Date</p>
                  <p className="text-sm font-medium">
                    {asset.disposalDate ? formatDate(asset.disposalDate) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Disposal Proceeds</p>
                  <p className="text-sm font-medium">
                    {asset.disposalProceeds !== null ? formatCurrency(asset.disposalProceeds) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">NBV at Disposal</p>
                  <p className="text-sm font-medium">
                    {formatCurrency(asset.purchaseCost - asset.accumulatedDepreciation)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Gain / (Loss)</p>
                  <p className={cn(
                    'text-sm font-medium',
                    asset.disposalGainLoss !== null && asset.disposalGainLoss >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  )}>
                    {asset.disposalGainLoss !== null
                      ? (asset.disposalGainLoss >= 0 ? '' : '(') +
                        formatCurrency(Math.abs(asset.disposalGainLoss)) +
                        (asset.disposalGainLoss < 0 ? ')' : '')
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Depreciation Progress */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Depreciation Progress</h3>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="bg-orange-500 h-3 rounded-full transition-all"
                style={{ width: `${Math.min(parseFloat(depreciationPercentage), 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{depreciationPercentage}% depreciated</span>
              <span>{formatCurrency(asset.netBookValue)} remaining</span>
            </div>
          </div>

          {/* Category & Accounts */}
          <div className="card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Linked Nominal Accounts</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-gray-500">Asset Account</p>
                <p className="font-medium">
                  {asset.category.assetAccount
                    ? `${asset.category.assetAccount.code} - ${asset.category.assetAccount.name}`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Depreciation Expense</p>
                <p className="font-medium">
                  {asset.category.depreciationAccount
                    ? `${asset.category.depreciationAccount.code} - ${asset.category.depreciationAccount.name}`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Accumulated Depreciation</p>
                <p className="font-medium">
                  {asset.category.accumulatedDepAccount
                    ? `${asset.category.accumulatedDepAccount.code} - ${asset.category.accumulatedDepAccount.name}`
                    : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="card p-6 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">Record Information</h3>
            <div className="text-xs text-gray-500 space-y-1">
              <p>Created: {formatDate(asset.createdAt)}</p>
              <p>Updated: {formatDate(asset.updatedAt)}</p>
              <p>Created by: {asset.createdBy}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dispose Modal */}
      {showDisposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDisposeModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Dispose Asset</h2>
            <p className="text-sm text-gray-500 mb-4">
              This will remove <strong>{asset.assetCode}</strong> from the active register and create a journal entry.
            </p>

            <div className="space-y-4">
              <div>
                <label className="label">Disposal Date *</label>
                <input
                  type="date"
                  value={disposalDate}
                  onChange={(e) => setDisposalDate(e.target.value)}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="label">Disposal Proceeds (GBP)</label>
                <input
                  type="number"
                  value={disposalProceeds}
                  onChange={(e) => setDisposalProceeds(e.target.value)}
                  className="input w-full"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Amount received from sale/disposal. Enter 0 if scrapped.
                </p>
              </div>

              {/* Preview gain/loss */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-gray-500">Current NBV</p>
                    <p className="font-medium">{formatCurrency(asset.netBookValue)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Proceeds</p>
                    <p className="font-medium">{formatCurrency(disposalProceeds || '0')}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-gray-200">
                    <p className="text-gray-500">Estimated Gain / (Loss)</p>
                    {(() => {
                      const gl = parseFloat(disposalProceeds || '0') - asset.netBookValue
                      return (
                        <p className={cn('font-semibold', gl >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {gl >= 0 ? '' : '('}
                          {formatCurrency(Math.abs(gl))}
                          {gl < 0 ? ')' : ''}
                        </p>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDisposeModal(false)}
                className="btn-ghost flex-1"
                disabled={disposing}
              >
                Cancel
              </button>
              <button
                onClick={handleDispose}
                disabled={disposing || !disposalDate}
                className={cn(
                  'btn-primary flex-1 inline-flex items-center justify-center gap-2',
                  'bg-orange-600 hover:bg-orange-700',
                  (disposing || !disposalDate) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {disposing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Disposing...
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    Confirm Disposal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Delete Asset</h2>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to delete <strong>{asset.assetCode} - {asset.name}</strong>?
              This will permanently remove the asset from the register.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-ghost flex-1"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-primary flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700"
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
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
