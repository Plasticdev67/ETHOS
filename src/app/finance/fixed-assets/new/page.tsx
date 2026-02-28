'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, formatCurrency } from '@/lib/utils'
import {
  Package,
  ArrowLeft,
  Save,
  Loader2,
} from 'lucide-react'

interface Category {
  id: string
  name: string
  depreciationMethod: string
  depreciationRate: number
  usefulLifeMonths: number | null
}

export default function NewFixedAssetPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [purchaseCost, setPurchaseCost] = useState('')
  const [residualValue, setResidualValue] = useState('0')
  const [serialNumber, setSerialNumber] = useState('')
  const [location, setLocation] = useState('')

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoadingCategories(true)
        const res = await fetch('/api/finance/fixed-assets/categories')
        if (!res.ok) throw new Error('Failed to load categories')
        const data = await res.json()
        setCategories(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories')
      } finally {
        setLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [])

  const selectedCategory = categories.find((c) => c.id === categoryId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/finance/fixed-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          categoryId,
          purchaseDate,
          purchaseCost: parseFloat(purchaseCost),
          residualValue: parseFloat(residualValue || '0'),
          serialNumber: serialNumber.trim() || null,
          location: location.trim() || null,
          createdBy: 'system',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create asset')
      }

      const asset = await res.json()
      router.push(`/finance/fixed-assets/${asset.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const depreciableAmount = purchaseCost && residualValue
    ? Math.max(0, parseFloat(purchaseCost) - parseFloat(residualValue || '0'))
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <h1 className="text-2xl font-bold text-gray-900">Register New Asset</h1>
            <p className="text-sm text-gray-500 mt-1">
              Add a new fixed asset to the register
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Asset Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Asset Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input w-full"
                    placeholder="e.g. Dell Latitude 5540 Laptop"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input w-full"
                    rows={3}
                    placeholder="Optional description of the asset"
                  />
                </div>

                <div>
                  <label className="label">Category *</label>
                  {loadingCategories ? (
                    <div className="input w-full flex items-center text-gray-400">
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Loading categories...
                    </div>
                  ) : (
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="input w-full"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {categories.length === 0 && !loadingCategories && (
                    <p className="text-xs text-amber-600 mt-1">
                      No categories found.{' '}
                      <Link href="/finance/fixed-assets/categories" className="underline">
                        Create one first
                      </Link>
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Purchase Date *</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="input w-full"
                    required
                  />
                </div>

                <div>
                  <label className="label">Serial Number</label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="input w-full"
                    placeholder="Optional serial/tag number"
                  />
                </div>

                <div>
                  <label className="label">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="input w-full"
                    placeholder="e.g. Head Office, Site A"
                  />
                </div>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Financial Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Purchase Cost (GBP) *</label>
                  <input
                    type="number"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(e.target.value)}
                    className="input w-full"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="label">Residual Value (GBP)</label>
                  <input
                    type="number"
                    value={residualValue}
                    onChange={(e) => setResidualValue(e.target.value)}
                    className="input w-full"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Expected value at end of useful life
                  </p>
                </div>
              </div>

              {purchaseCost && parseFloat(purchaseCost) > 0 && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-blue-600 font-medium">Purchase Cost</p>
                      <p className="text-blue-900 font-semibold">{formatCurrency(purchaseCost)}</p>
                    </div>
                    <div>
                      <p className="text-blue-600 font-medium">Residual Value</p>
                      <p className="text-blue-900 font-semibold">{formatCurrency(residualValue || '0')}</p>
                    </div>
                    <div>
                      <p className="text-blue-600 font-medium">Depreciable Amount</p>
                      <p className="text-blue-900 font-semibold">{formatCurrency(depreciableAmount)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Category Info */}
            {selectedCategory && (
              <div className="card p-6 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Category: {selectedCategory.name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Depreciation Method</span>
                    <span className="font-medium">
                      {selectedCategory.depreciationMethod === 'STRAIGHT_LINE'
                        ? 'Straight Line'
                        : selectedCategory.depreciationMethod === 'REDUCING_BALANCE'
                        ? 'Reducing Balance'
                        : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Depreciation Rate</span>
                    <span className="font-medium">{selectedCategory.depreciationRate}%</span>
                  </div>
                  {selectedCategory.usefulLifeMonths && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Useful Life</span>
                      <span className="font-medium">
                        {selectedCategory.usefulLifeMonths} months
                        {selectedCategory.usefulLifeMonths >= 12 && (
                          <span className="text-gray-400">
                            {' '}({(selectedCategory.usefulLifeMonths / 12).toFixed(1)} years)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {selectedCategory.depreciationMethod === 'STRAIGHT_LINE' &&
                    selectedCategory.usefulLifeMonths &&
                    purchaseCost &&
                    parseFloat(purchaseCost) > 0 && (
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Monthly Depreciation</span>
                        <span className="font-medium text-orange-600">
                          {formatCurrency(
                            depreciableAmount / selectedCategory.usefulLifeMonths
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  {selectedCategory.depreciationMethod === 'REDUCING_BALANCE' &&
                    purchaseCost &&
                    parseFloat(purchaseCost) > 0 && (
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between">
                        <span className="text-gray-500">First Month Dep.</span>
                        <span className="font-medium text-orange-600">
                          {formatCurrency(
                            (parseFloat(purchaseCost) * selectedCategory.depreciationRate) / 100 / 12
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="card p-6 space-y-3">
              <button
                type="submit"
                disabled={loading || !name || !categoryId || !purchaseDate || !purchaseCost}
                className={cn(
                  'btn-primary w-full inline-flex items-center justify-center gap-2',
                  (loading || !name || !categoryId || !purchaseDate || !purchaseCost) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Register Asset
                  </>
                )}
              </button>
              <Link
                href="/finance/fixed-assets"
                className="btn-ghost w-full inline-flex items-center justify-center gap-2"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
