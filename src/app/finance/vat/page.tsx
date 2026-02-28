'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Calculator,
  Plus,
  Settings,
  FileText,
  Clock,
  CheckCircle,
  PoundSterling,
  ArrowRight,
  Eye,
  Loader2,
} from 'lucide-react'

// --- Type definitions ---

interface Period {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
}

interface VATReturn {
  id: string
  periodId: string
  periodName?: string
  periodStart?: string
  periodEnd?: string
  box1: number
  box2: number
  box3: number
  box4: number
  box5: number
  box6: number
  box7: number
  box8: number
  box9: number
  status: 'VAT_DRAFT' | 'CALCULATED' | 'VAT_APPROVED' | 'VAT_SUBMITTED' | 'ERROR'
  submittedAt?: string | null
  createdAt?: string
}

const statusBadge: Record<string, string> = {
  VAT_DRAFT: 'badge-gray',
  CALCULATED: 'badge-info',
  VAT_APPROVED: 'badge-warning',
  VAT_SUBMITTED: 'badge-success',
  ERROR: 'badge-danger',
}

export default function VATPage() {
  const router = useRouter()
  const [returns, setReturns] = useState<VATReturn[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calculatingPeriod, setCalculatingPeriod] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const [returnsRes, periodsRes] = await Promise.all([
        fetch('/api/finance/vat-returns'),
        fetch('/api/finance/periods'),
      ])
      if (!returnsRes.ok) throw new Error('Failed to load VAT returns')
      if (!periodsRes.ok) throw new Error('Failed to load accounting periods')
      const returnsData = await returnsRes.json()
      const periodsData = await periodsRes.json()
      setReturns(Array.isArray(returnsData) ? returnsData : returnsData.returns || [])
      setPeriods(Array.isArray(periodsData) ? periodsData : [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleCalculateReturn(periodId: string) {
    setCalculatingPeriod(periodId)
    setError(null)
    try {
      const res = await fetch('/api/finance/vat-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to calculate VAT return')
      }
      const newReturn = await res.json()
      router.push(`/finance/vat/returns/${newReturn.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to calculate return')
    } finally {
      setCalculatingPeriod(null)
    }
  }

  // Derive summary data
  const returnPeriodIds = new Set(returns.map((r) => r.periodId))
  const periodsWithoutReturn = periods.filter((p) => !returnPeriodIds.has(p.id))
  const nextReturnDue = periodsWithoutReturn.sort(
    (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
  )[0]
  const lastSubmitted = returns
    .filter((r) => r.status === 'VAT_SUBMITTED')
    .sort((a, b) => new Date(b.submittedAt || b.createdAt || '').getTime() - new Date(a.submittedAt || a.createdAt || '').getTime())[0]
  const outstandingVAT = returns
    .filter((r) => r.status === 'CALCULATED' || r.status === 'VAT_APPROVED')
    .reduce((sum, r) => sum + (r.box5 || 0), 0)

  // Build a lookup for period details
  const periodMap = new Map(periods.map((p) => [p.id, p]))

  // Sorted returns by period end date descending
  const sortedReturns = [...returns].sort((a, b) => {
    const periodA = periodMap.get(a.periodId)
    const periodB = periodMap.get(b.periodId)
    const dateA = periodA ? new Date(periodA.endDate).getTime() : 0
    const dateB = periodB ? new Date(periodB.endDate).getTime() : 0
    return dateB - dateA
  })

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">VAT & MTD</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage VAT returns, HMRC submissions, and Making Tax Digital compliance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/finance/vat/codes" className="btn-secondary">
            <Settings size={16} className="mr-2" />
            Manage Codes
          </Link>
          <Link href="/finance/vat/returns/new" className="btn-primary">
            <Plus size={16} className="mr-2" />
            New Return
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-3 w-24 rounded bg-gray-200 mb-3" />
              <div className="h-7 w-36 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
          {/* Next Return Due */}
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Next Return Due</p>
                {nextReturnDue ? (
                  <div>
                    <p className="text-lg font-bold text-gray-900">{nextReturnDue.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(nextReturnDue.startDate)} - {formatDate(nextReturnDue.endDate)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">All periods covered</p>
                )}
              </div>
            </div>
          </div>

          {/* Last Submitted */}
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Last Submitted</p>
                {lastSubmitted ? (
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {lastSubmitted.periodName || periodMap.get(lastSubmitted.periodId)?.name || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {lastSubmitted.submittedAt ? formatDate(lastSubmitted.submittedAt) : 'Submitted'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No returns submitted</p>
                )}
              </div>
            </div>
          </div>

          {/* Outstanding VAT */}
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                outstandingVAT > 0 ? 'bg-red-50 text-red-600' : outstandingVAT < 0 ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'
              )}>
                <PoundSterling size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Outstanding VAT</p>
                <p className={cn(
                  'text-lg font-bold font-mono',
                  outstandingVAT > 0 ? 'text-red-700' : outstandingVAT < 0 ? 'text-green-700' : 'text-gray-900'
                )}>
                  {formatCurrency(outstandingVAT)}
                </p>
                <p className="text-xs text-gray-400">
                  {outstandingVAT > 0 ? 'Owed to HMRC' : outstandingVAT < 0 ? 'Due from HMRC' : 'No outstanding VAT'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VAT Returns Table */}
      <div className="card overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">VAT Returns</h2>
          <Link href="/finance/vat/returns/new" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Calculate new return
            <ArrowRight size={14} className="inline ml-1" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 animate-pulse space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-36 rounded bg-gray-200" />
                  <div className="h-4 w-20 rounded bg-gray-200" />
                  <div className="h-4 w-20 rounded bg-gray-200" />
                  <div className="h-4 w-20 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : sortedReturns.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Period</th>
                  <th className="table-header">Period Dates</th>
                  <th className="table-header text-right">Box 1 (Output)</th>
                  <th className="table-header text-right">Box 4 (Input)</th>
                  <th className="table-header text-right">Box 5 (Net)</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedReturns.map((ret) => {
                  const period = periodMap.get(ret.periodId)
                  return (
                    <tr
                      key={ret.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/finance/vat/returns/${ret.id}`)}
                    >
                      <td className="table-cell">
                        <span className="font-medium text-blue-600 hover:text-blue-700">
                          {ret.periodName || period?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="table-cell text-sm text-gray-500">
                        {period
                          ? `${formatDate(period.startDate)} - ${formatDate(period.endDate)}`
                          : ret.periodStart && ret.periodEnd
                            ? `${formatDate(ret.periodStart)} - ${formatDate(ret.periodEnd)}`
                            : '—'
                        }
                      </td>
                      <td className="table-cell text-right font-mono">
                        {formatCurrency(ret.box1)}
                      </td>
                      <td className="table-cell text-right font-mono">
                        {formatCurrency(ret.box4)}
                      </td>
                      <td className={cn(
                        'table-cell text-right font-mono font-semibold',
                        ret.box5 > 0 ? 'text-red-700' : ret.box5 < 0 ? 'text-green-700' : 'text-gray-900'
                      )}>
                        {formatCurrency(ret.box5)}
                      </td>
                      <td className="table-cell">
                        <span className={statusBadge[ret.status] || 'badge-gray'}>
                          {ret.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <Link
                          href={`/finance/vat/returns/${ret.id}`}
                          className="text-gray-400 hover:text-gray-600"
                          title="View"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Eye size={16} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center">
              <Calculator size={40} className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No VAT returns yet</p>
              <Link href="/finance/vat/returns/new" className="btn-primary mt-4 inline-flex">
                <Plus size={16} className="mr-2" />
                Calculate First Return
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Periods Without Returns */}
      {!loading && periodsWithoutReturn.length > 0 && (
        <div className="card overflow-hidden mt-6">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Periods Awaiting VAT Return</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Period</th>
                  <th className="table-header">Start Date</th>
                  <th className="table-header">End Date</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {periodsWithoutReturn.map((period) => (
                  <tr key={period.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-medium">{period.name}</td>
                    <td className="table-cell">{formatDate(period.startDate)}</td>
                    <td className="table-cell">{formatDate(period.endDate)}</td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleCalculateReturn(period.id)}
                        disabled={calculatingPeriod === period.id}
                        className="btn-primary py-1.5 px-3 text-sm"
                      >
                        {calculatingPeriod === period.id ? (
                          <>
                            <Loader2 size={14} className="mr-1.5 animate-spin" />
                            Calculating...
                          </>
                        ) : (
                          <>
                            <Calculator size={14} className="mr-1.5" />
                            Calculate Return
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Links */}
      {!loading && (
        <div className="mt-6 card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">VAT Codes Management</span>
            </div>
            <Link
              href="/finance/vat/codes"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center"
            >
              Manage VAT Codes
              <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
