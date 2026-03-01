'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, formatDate } from '@/lib/utils'
import {
  Calculator,
  CheckCircle,
  Loader2,
  AlertTriangle,
  CalendarDays,
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
}

export default function NewVATReturnPage() {
  const router = useRouter()
  const [periods, setPeriods] = useState<Period[]>([])
  const [existingReturns, setExistingReturns] = useState<VATReturn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [calculating, setCalculating] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const [periodsRes, returnsRes] = await Promise.all([
        fetch('/api/finance/periods'),
        fetch('/api/finance/vat/returns'),
      ])
      if (!periodsRes.ok) throw new Error('Failed to load accounting periods')
      if (!returnsRes.ok) throw new Error('Failed to load existing VAT returns')

      const periodsData = await periodsRes.json()
      const returnsData = await returnsRes.json()

      setPeriods(Array.isArray(periodsData) ? periodsData : [])
      setExistingReturns(Array.isArray(returnsData) ? returnsData : returnsData.returns || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Filter periods that don't already have a return
  const usedPeriodIds = new Set(existingReturns.map((r) => r.periodId))
  const availablePeriods = periods.filter((p) => !usedPeriodIds.has(p.id))

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId)

  async function handleCalculate() {
    if (!selectedPeriodId) return
    setCalculating(true)
    setError(null)

    try {
      const res = await fetch('/api/finance/vat/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: selectedPeriodId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to calculate VAT return')
      }

      const newReturn = await res.json()
      setSuccess(true)

      // Brief delay to show success then redirect
      setTimeout(() => {
        router.push(`/finance/vat/returns/${newReturn.id}`)
      }, 800)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setCalculating(false)
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
          <Link href="/finance/vat" className="hover:text-gray-700">VAT & MTD</Link>
          <span>/</span>
          <span className="text-gray-900">New Return</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Calculate New VAT Return</h1>
        <p className="mt-1 text-sm text-gray-500">
          Select an accounting period and calculate the VAT return from posted transactions
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="mb-6 rounded-md bg-green-50 border border-green-200 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-green-600" />
            <p className="text-sm text-green-800">VAT return calculated successfully. Redirecting...</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card p-8 animate-pulse">
          <div className="h-6 w-48 rounded bg-gray-200 mb-6" />
          <div className="h-10 w-full rounded bg-gray-200 mb-4" />
          <div className="h-4 w-64 rounded bg-gray-200" />
        </div>
      ) : (
        <div className="max-w-2xl">
          {/* Step 1: Select Period */}
          <div className="card p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                1
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Select Accounting Period</h2>
            </div>

            {availablePeriods.length > 0 ? (
              <div>
                <label htmlFor="period" className="label">
                  Accounting Period <span className="text-red-500">*</span>
                </label>
                <select
                  id="period"
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="input"
                  disabled={calculating || success}
                >
                  <option value="">Select a period...</option>
                  {availablePeriods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatDate(p.startDate)} - {formatDate(p.endDate)})
                    </option>
                  ))}
                </select>

                {selectedPeriod && (
                  <div className="mt-4 rounded-md bg-blue-50 border border-blue-200 p-4">
                    <div className="flex items-start gap-3">
                      <CalendarDays size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">{selectedPeriod.name}</p>
                        <p className="text-xs text-blue-700 mt-1">
                          {formatDate(selectedPeriod.startDate)} to {formatDate(selectedPeriod.endDate)}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Period status: {selectedPeriod.status}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">No periods available</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      All accounting periods already have a VAT return, or no periods have been configured.
                    </p>
                    <Link
                      href="/finance/periods"
                      className="text-xs text-yellow-800 font-medium underline mt-2 inline-block"
                    >
                      Manage accounting periods
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Calculate */}
          <div className={cn(
            'card p-6',
            !selectedPeriodId && 'opacity-50'
          )}>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                selectedPeriodId ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
              )}>
                2
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Calculate Return</h2>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              The system will scan all posted transactions within the selected period and
              calculate the nine-box VAT return values from journal lines with VAT codes assigned.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCalculate}
                disabled={!selectedPeriodId || calculating || success}
                className="btn-primary"
              >
                {calculating ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle size={16} className="mr-2" />
                    Calculated!
                  </>
                ) : (
                  <>
                    <Calculator size={16} className="mr-2" />
                    Calculate VAT Return
                  </>
                )}
              </button>
              <Link href="/finance/vat" className="btn-secondary">
                Cancel
              </Link>
            </div>
          </div>

          {/* Info notice */}
          <div className="mt-6 rounded-md bg-gray-50 border border-gray-200 p-4">
            <p className="text-xs text-gray-500">
              The calculated return will be in CALCULATED status. You can review and adjust the
              values before approving and submitting to HMRC. Box 3 (Total VAT due) and Box 5
              (Net VAT) are automatically derived from the other boxes.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
