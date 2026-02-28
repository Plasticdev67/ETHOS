'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Calculator,
  ArrowLeft,
  Play,
  Eye,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  PoundSterling,
  History,
} from 'lucide-react'

interface PreviewItem {
  assetId: string
  assetCode: string
  assetName: string
  categoryName: string
  method: string
  purchaseCost: number
  currentNBV: number
  residualValue: number
  depreciationAmount: number
  newNBV: number
  willBeFullyDepreciated: boolean
  alreadyRunThisPeriod: boolean
}

interface Period {
  id: string
  name: string
  startDate: string
  endDate: string
}

interface RunResult {
  message: string
  period: { id: string; name: string }
  assetsProcessed: number
  totalDepreciation: number
  details: Array<{
    assetCode: string
    assetName: string
    depreciationAmount: number
    newNBV: number
    fullyDepreciated: boolean
  }>
}

interface DepreciationHistoryEntry {
  id: string
  action: string
  entityType: string
  createdAt: string
  details: {
    periodName: string
    periodDate: string
    assetsProcessed: number
    totalDepreciation: string
    journalEntries: string[]
  }
}

const METHOD_LABELS: Record<string, string> = {
  STRAIGHT_LINE: 'SL',
  REDUCING_BALANCE: 'RB',
  NONE: 'None',
}

export default function DepreciationRunPage() {
  const [periodDate, setPeriodDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState<{
    period: Period
    items: PreviewItem[]
    assetsToProcess: number
    assetsAlreadyProcessed: number
    totalDepreciation: number
  } | null>(null)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<DepreciationHistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Set default period date to today
  useEffect(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    setPeriodDate(`${year}-${month}-${day}`)
  }, [])

  // Fetch depreciation history (audit logs)
  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoadingHistory(true)
        // We'll use the audit log to fetch depreciation run history
        // For now, we can attempt to get it from a known endpoint or just show empty
        setHistory([])
      } catch {
        // silently fail
      } finally {
        setLoadingHistory(false)
      }
    }
    fetchHistory()
  }, [])

  const handlePreview = async () => {
    setLoading(true)
    setError(null)
    setRunResult(null)

    try {
      const res = await fetch('/api/finance/fixed-assets/depreciation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodDate,
          preview: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to preview depreciation')
      }

      const data = await res.json()
      setPreviewData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRun = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/finance/fixed-assets/depreciation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodDate,
          preview: false,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to run depreciation')
      }

      const data = await res.json()
      setRunResult(data)
      setPreviewData(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const itemsToProcess = previewData?.items.filter((i) => !i.alreadyRunThisPeriod) || []
  const alreadyProcessed = previewData?.items.filter((i) => i.alreadyRunThisPeriod) || []

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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <Calculator size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Run Depreciation</h1>
            <p className="text-sm text-gray-500 mt-1">
              Calculate and post monthly depreciation for all active assets
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

      {/* Success result */}
      {runResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 size={24} className="text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-800">Depreciation Run Complete</h3>
              <p className="text-sm text-green-600">{runResult.message}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-green-600">Period</p>
              <p className="font-semibold text-green-800">{runResult.period.name}</p>
            </div>
            <div>
              <p className="text-xs text-green-600">Assets Processed</p>
              <p className="font-semibold text-green-800">{runResult.assetsProcessed}</p>
            </div>
            <div>
              <p className="text-xs text-green-600">Total Depreciation</p>
              <p className="font-semibold text-green-800">
                {formatCurrency(runResult.totalDepreciation)}
              </p>
            </div>
          </div>

          {runResult.details.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-green-200 text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-3 text-green-700 font-medium">Asset</th>
                    <th className="text-right py-2 px-3 text-green-700 font-medium">Depreciation</th>
                    <th className="text-right py-2 px-3 text-green-700 font-medium">New NBV</th>
                    <th className="text-left py-2 px-3 text-green-700 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-100">
                  {runResult.details.map((item) => (
                    <tr key={item.assetCode}>
                      <td className="py-2 px-3">
                        <span className="font-mono text-xs">{item.assetCode}</span>{' '}
                        <span className="text-green-800">{item.assetName}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-green-800">
                        {formatCurrency(item.depreciationAmount)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-green-800">
                        {formatCurrency(item.newNBV)}
                      </td>
                      <td className="py-2 px-3">
                        {item.fullyDepreciated ? (
                          <span className="badge-warning">Fully Depreciated</span>
                        ) : (
                          <span className="badge-success">Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Period Selector */}
      {!runResult && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Period</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="label">Depreciation Date</label>
              <input
                type="date"
                value={periodDate}
                onChange={(e) => { setPeriodDate(e.target.value); setPreviewData(null) }}
                className="input w-full sm:w-64"
              />
              <p className="text-xs text-gray-500 mt-1">
                This date determines which accounting period the depreciation is posted to.
              </p>
            </div>
            <button
              onClick={handlePreview}
              disabled={loading || !periodDate}
              className={cn(
                'btn-secondary inline-flex items-center gap-2',
                (loading || !periodDate) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {loading && !previewData ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Eye size={16} />
                  Preview
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Preview Results */}
      {previewData && !runResult && (
        <>
          {/* Preview Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Calculator size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Period</p>
                  <p className="text-sm font-semibold text-gray-900">{previewData.period.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatDate(previewData.period.startDate)} - {formatDate(previewData.period.endDate)}
                  </p>
                </div>
              </div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <TrendingDown size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Assets to Depreciate</p>
                  <p className="text-lg font-semibold text-gray-900">{itemsToProcess.length}</p>
                </div>
              </div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                  <PoundSterling size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Depreciation</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(previewData.totalDepreciation)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Already processed warning */}
          {alreadyProcessed.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {alreadyProcessed.length} asset{alreadyProcessed.length !== 1 ? 's' : ''} already
                  depreciated this period
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  These will be skipped: {alreadyProcessed.map((i) => i.assetCode).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {itemsToProcess.length > 0 ? (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="table-header">Asset Code</th>
                      <th className="table-header">Name</th>
                      <th className="table-header">Category</th>
                      <th className="table-header">Method</th>
                      <th className="table-header text-right">Current NBV</th>
                      <th className="table-header text-right">Depreciation</th>
                      <th className="table-header text-right">New NBV</th>
                      <th className="table-header">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {itemsToProcess.map((item) => (
                      <tr key={item.assetId} className="hover:bg-gray-50">
                        <td className="table-cell font-mono text-sm">{item.assetCode}</td>
                        <td className="table-cell font-medium">{item.assetName}</td>
                        <td className="table-cell text-gray-500">{item.categoryName}</td>
                        <td className="table-cell">
                          <span className="badge-info">{METHOD_LABELS[item.method] || item.method}</span>
                        </td>
                        <td className="table-cell text-right">{formatCurrency(item.currentNBV)}</td>
                        <td className="table-cell text-right text-orange-600 font-medium">
                          ({formatCurrency(item.depreciationAmount)})
                        </td>
                        <td className="table-cell text-right font-medium">
                          {formatCurrency(item.newNBV)}
                        </td>
                        <td className="table-cell">
                          {item.willBeFullyDepreciated && (
                            <span className="badge-warning">Will be fully depreciated</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={5} className="table-cell text-right">Total Depreciation:</td>
                      <td className="table-cell text-right text-orange-600">
                        ({formatCurrency(previewData.totalDepreciation)})
                      </td>
                      <td colSpan={2} className="table-cell" />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Run Button */}
              <div className="border-t border-gray-200 p-4 flex items-center justify-between bg-gray-50">
                <p className="text-sm text-gray-600">
                  This will create journal entries and update asset records. This action cannot be undone.
                </p>
                <button
                  onClick={handleRun}
                  disabled={loading}
                  className={cn(
                    'btn-primary inline-flex items-center gap-2',
                    loading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      Run Depreciation
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center">
              <CheckCircle2 size={40} className="mx-auto text-green-300 mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                No assets to depreciate
              </h3>
              <p className="text-sm text-gray-500">
                All active assets have already been depreciated for this period,
                or there are no active assets requiring depreciation.
              </p>
            </div>
          )}
        </>
      )}

      {/* Depreciation History */}
      {!previewData && !runResult && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <History size={18} className="text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Depreciation History</h2>
          </div>

          {loadingHistory ? (
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-3/4" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <TrendingDown size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">
                No depreciation runs recorded yet. Use the preview button above to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 text-sm"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {entry.details?.periodName || 'Depreciation Run'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(entry.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(entry.details?.totalDepreciation || '0')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {entry.details?.assetsProcessed || 0} assets
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
