'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FolderOpen,
  ArrowLeft,
  Plus,
  Save,
  Loader2,
  Package,
} from 'lucide-react'

interface Account {
  id: string
  code: string
  name: string
  type: string
}

interface Category {
  id: string
  name: string
  depreciationMethod: string
  depreciationRate: number
  usefulLifeMonths: number | null
  assetAccountId: string
  depreciationAccountId: string
  accumulatedDepAccountId: string
  assetAccount: { id: string; code: string; name: string } | null
  depreciationAccount: { id: string; code: string; name: string } | null
  accumulatedDepAccount: { id: string; code: string; name: string } | null
  assetCount: number
  createdAt: string
}

const METHOD_LABELS: Record<string, string> = {
  STRAIGHT_LINE: 'Straight Line',
  REDUCING_BALANCE: 'Reducing Balance',
  NONE: 'None',
}

export default function FixedAssetCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formName, setFormName] = useState('')
  const [formMethod, setFormMethod] = useState('STRAIGHT_LINE')
  const [formRate, setFormRate] = useState('')
  const [formUsefulLife, setFormUsefulLife] = useState('')
  const [formAssetAccount, setFormAssetAccount] = useState('')
  const [formDepreciationAccount, setFormDepreciationAccount] = useState('')
  const [formAccumDepAccount, setFormAccumDepAccount] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      const [catRes, accRes] = await Promise.all([
        fetch('/api/finance/fixed-assets/categories'),
        fetch('/api/finance/accounts'),
      ])

      if (!catRes.ok) throw new Error('Failed to load categories')

      const catData = await catRes.json()
      setCategories(catData)

      if (accRes.ok) {
        const accData = await accRes.json()
        setAccounts(Array.isArray(accData) ? accData : accData.data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormName('')
    setFormMethod('STRAIGHT_LINE')
    setFormRate('')
    setFormUsefulLife('')
    setFormAssetAccount('')
    setFormDepreciationAccount('')
    setFormAccumDepAccount('')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/finance/fixed-assets/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          depreciationMethod: formMethod,
          depreciationRate: parseFloat(formRate || '0'),
          usefulLifeMonths: formUsefulLife ? parseInt(formUsefulLife, 10) : null,
          assetAccountId: formAssetAccount,
          depreciationAccountId: formDepreciationAccount,
          accumulatedDepAccountId: formAccumDepAccount,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create category')
      }

      resetForm()
      setShowForm(false)
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const assetAccounts = accounts.filter((a) => a.type === 'ASSET')
  const expenseAccounts = accounts.filter((a) => a.type === 'EXPENSE')
  // Accumulated depreciation is typically an asset contra account (type ASSET)
  const allAccounts = accounts

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
              <FolderOpen size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Asset Categories</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage depreciation methods and linked nominal accounts
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus size={16} />
          New Category
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Category</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Category Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input w-full"
                  placeholder="e.g. Motor Vehicles"
                  required
                />
              </div>

              <div>
                <label className="label">Depreciation Method *</label>
                <select
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value)}
                  className="input w-full"
                  required
                >
                  <option value="STRAIGHT_LINE">Straight Line</option>
                  <option value="REDUCING_BALANCE">Reducing Balance</option>
                  <option value="NONE">None</option>
                </select>
              </div>

              <div>
                <label className="label">Depreciation Rate (% p.a.) *</label>
                <input
                  type="number"
                  value={formRate}
                  onChange={(e) => setFormRate(e.target.value)}
                  className="input w-full"
                  placeholder="e.g. 25"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                />
              </div>

              {formMethod === 'STRAIGHT_LINE' && (
                <div>
                  <label className="label">Useful Life (months) *</label>
                  <input
                    type="number"
                    value={formUsefulLife}
                    onChange={(e) => setFormUsefulLife(e.target.value)}
                    className="input w-full"
                    placeholder="e.g. 60"
                    min="1"
                    required={formMethod === 'STRAIGHT_LINE'}
                  />
                  {formUsefulLife && parseInt(formUsefulLife) >= 12 && (
                    <p className="text-xs text-gray-500 mt-1">
                      = {(parseInt(formUsefulLife) / 12).toFixed(1)} years
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="label">Asset Account (BS) *</label>
                <select
                  value={formAssetAccount}
                  onChange={(e) => setFormAssetAccount(e.target.value)}
                  className="input w-full"
                  required
                >
                  <option value="">Select account...</option>
                  {assetAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Balance sheet account for the asset cost
                </p>
              </div>

              <div>
                <label className="label">Depreciation Expense (P&L) *</label>
                <select
                  value={formDepreciationAccount}
                  onChange={(e) => setFormDepreciationAccount(e.target.value)}
                  className="input w-full"
                  required
                >
                  <option value="">Select account...</option>
                  {expenseAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  P&L account for monthly depreciation charges
                </p>
              </div>

              <div>
                <label className="label">Accumulated Depreciation (BS) *</label>
                <select
                  value={formAccumDepAccount}
                  onChange={(e) => setFormAccumDepAccount(e.target.value)}
                  className="input w-full"
                  required
                >
                  <option value="">Select account...</option>
                  {allAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Balance sheet contra account
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Create Category
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm() }}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      {loading ? (
        <div className="card">
          <div className="animate-pulse p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
              </div>
            ))}
          </div>
        </div>
      ) : categories.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen size={40} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">No categories yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Create your first asset category to start registering fixed assets.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={16} />
            New Category
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.id} className="card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                    <FolderOpen size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{cat.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="badge-info">
                        {METHOD_LABELS[cat.depreciationMethod] || cat.depreciationMethod}
                      </span>
                      <span>{cat.depreciationRate}% p.a.</span>
                      {cat.usefulLifeMonths && (
                        <span>{cat.usefulLifeMonths} months useful life</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Package size={14} className="text-gray-400" />
                  <span className="text-gray-600">{cat.assetCount} asset{cat.assetCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Asset Account (BS)</p>
                  <p className="font-medium text-gray-700">
                    {cat.assetAccount
                      ? `${cat.assetAccount.code} - ${cat.assetAccount.name}`
                      : 'Not configured'}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Depreciation Expense (P&L)</p>
                  <p className="font-medium text-gray-700">
                    {cat.depreciationAccount
                      ? `${cat.depreciationAccount.code} - ${cat.depreciationAccount.name}`
                      : 'Not configured'}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Accumulated Depreciation (BS)</p>
                  <p className="font-medium text-gray-700">
                    {cat.accumulatedDepAccount
                      ? `${cat.accumulatedDepAccount.code} - ${cat.accumulatedDepAccount.name}`
                      : 'Not configured'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
