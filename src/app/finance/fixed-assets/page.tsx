'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Package,
  Plus,
  Search,
  PoundSterling,
  TrendingDown,
  BarChart3,
  Calculator,
  FolderOpen,
} from 'lucide-react'

interface FixedAsset {
  id: string
  assetCode: string
  name: string
  description: string | null
  category: {
    id: string
    name: string
    depreciationMethod: string
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
}

interface Summary {
  totalAssets: number
  activeAssets: number
  totalCost: number
  totalNBV: number
  totalAccumulatedDepreciation: number
  monthlyDepreciation: number
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

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'DISPOSED', label: 'Disposed' },
  { key: 'FULLY_DEPRECIATED', label: 'Fully Depreciated' },
]

export default function FixedAssetsPage() {
  const router = useRouter()
  const [assets, setAssets] = useState<FixedAsset[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (statusFilter) params.set('status', statusFilter)
        if (search) params.set('search', search)
        params.set('page', page.toString())
        params.set('limit', '20')

        const res = await fetch(`/api/finance/fixed-assets?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to load fixed assets')

        const data = await res.json()
        setAssets(data.data || [])
        setSummary(data.summary || null)
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [statusFilter, search, page])

  const summaryCards = [
    {
      label: 'Total Assets',
      value: summary?.totalAssets?.toString() ?? '0',
      isCurrency: false,
      icon: Package,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Total Cost',
      value: summary?.totalCost ?? 0,
      isCurrency: true,
      icon: PoundSterling,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Total Net Book Value',
      value: summary?.totalNBV ?? 0,
      isCurrency: true,
      icon: BarChart3,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Monthly Depreciation',
      value: summary?.monthlyDepreciation ?? 0,
      isCurrency: true,
      icon: TrendingDown,
      color: 'text-orange-600 bg-orange-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Package size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fixed Assets Register</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage fixed assets, depreciation, and disposals
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/finance/fixed-assets/categories" className="btn-secondary inline-flex items-center gap-2">
            <FolderOpen size={16} />
            Categories
          </Link>
          <Link href="/finance/fixed-assets/depreciation" className="btn-secondary inline-flex items-center gap-2">
            <Calculator size={16} />
            Run Depreciation
          </Link>
          <Link href="/finance/fixed-assets/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} />
            New Asset
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-7 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))
          : summaryCards.map((card) => (
              <div key={card.label} className="card p-5">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', card.color)}>
                    <card.icon size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{card.label}</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {card.isCurrency ? formatCurrency(card.value) : card.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Status Tabs */}
        <div className="border-b border-gray-200 w-full sm:w-auto">
          <nav className="flex gap-6">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setPage(1) }}
                className={cn(
                  'py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  statusFilter === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="input pl-9 w-full"
          />
        </div>
      </div>

      {/* Assets Table */}
      {loading ? (
        <div className="card">
          <div className="animate-pulse p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
              </div>
            ))}
          </div>
        </div>
      ) : assets.length === 0 ? (
        <div className="card p-12 text-center">
          <Package size={40} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">No fixed assets found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {search || statusFilter
              ? 'Try adjusting your filters.'
              : 'Create your first fixed asset to get started.'}
          </p>
          {!search && !statusFilter && (
            <Link href="/finance/fixed-assets/new" className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} />
              New Asset
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header">Asset Code</th>
                  <th className="table-header">Name</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Purchase Date</th>
                  <th className="table-header text-right">Cost</th>
                  <th className="table-header text-right">Accum. Dep.</th>
                  <th className="table-header text-right">NBV</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/finance/fixed-assets/${asset.id}`)}
                  >
                    <td className="table-cell">
                      <Link
                        href={`/finance/fixed-assets/${asset.id}`}
                        className="text-blue-600 hover:text-blue-800 font-mono text-sm font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {asset.assetCode}
                      </Link>
                    </td>
                    <td className="table-cell font-medium">{asset.name}</td>
                    <td className="table-cell text-gray-500">{asset.category.name}</td>
                    <td className="table-cell">{formatDate(asset.purchaseDate)}</td>
                    <td className="table-cell text-right">{formatCurrency(asset.purchaseCost)}</td>
                    <td className="table-cell text-right text-gray-500">
                      {formatCurrency(asset.accumulatedDepreciation)}
                    </td>
                    <td className="table-cell text-right font-medium">
                      {formatCurrency(asset.netBookValue)}
                    </td>
                    <td className="table-cell">
                      <span className={STATUS_BADGES[asset.status] || 'badge-gray'}>
                        {STATUS_LABELS[asset.status] || asset.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} assets
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="btn-ghost text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="btn-ghost text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
