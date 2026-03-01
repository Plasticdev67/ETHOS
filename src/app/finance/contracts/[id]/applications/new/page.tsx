'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, formatCurrency } from '@/lib/utils'
import {
  ArrowLeft,
  Plus,
  X,
  Save,
  Send,
  AlertTriangle,
} from 'lucide-react'

// --- Types ---

interface ContractSummary {
  id: string
  contractRef: string
  clientName: string
  contractType: string
  currentValue: number
  retentionPercentage: number
  retentionLimit: number | null
  cisApplicable: boolean
  cisRate: number | null
}

interface PreviousApplicationLine {
  description: string
  contractLineRef: string
  cumulativeValue: number
}

interface PreviousApplication {
  applicationNumber: number
  grossCumulative: number
  retentionHeld: number
  cisDeduction: number
  materialsOnSite: number
  variationsIncluded: number
  lines: PreviousApplicationLine[]
}

interface ApplicationLine {
  key: number
  description: string
  contractLineRef: string
  previousValue: number
  cumulativeValue: string
  percentComplete: string
}

let lineKeyCounter = 0

function newLine(prefill?: PreviousApplicationLine): ApplicationLine {
  return {
    key: ++lineKeyCounter,
    description: prefill?.description || '',
    contractLineRef: prefill?.contractLineRef || '',
    previousValue: prefill?.cumulativeValue || 0,
    cumulativeValue: prefill ? String(prefill.cumulativeValue) : '',
    percentComplete: '',
  }
}

export default function NewApplicationPage() {
  const params = useParams()
  const router = useRouter()
  const contractId = params.id as string

  const [contract, setContract] = useState<ContractSummary | null>(null)
  const [previousApp, setPreviousApp] = useState<PreviousApplication | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [lines, setLines] = useState<ApplicationLine[]>([])
  const [materialsOnSite, setMaterialsOnSite] = useState('')
  const [variationsIncluded, setVariationsIncluded] = useState('')
  const [contraCharges, setContraCharges] = useState('')
  const [contraDescription, setContraDescription] = useState('')

  // Next application number
  const [applicationNumber, setApplicationNumber] = useState(1)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId])

  async function loadData() {
    try {
      setPageLoading(true)

      // Fetch contract with all applications included
      const contractRes = await fetch(`/api/finance/contracts/${contractId}`)
      if (!contractRes.ok) throw new Error('Failed to load contract')
      const contractData = await contractRes.json()

      setContract({
        id: contractData.id,
        contractRef: contractData.contractRef,
        clientName: contractData.clientName || contractData.clientId,
        contractType: contractData.contractType,
        currentValue: parseFloat(contractData.currentValue),
        retentionPercentage: parseFloat(contractData.retentionPercent),
        retentionLimit: contractData.retentionLimit ? parseFloat(contractData.retentionLimit) : null,
        cisApplicable: contractData.cisApplicable,
        cisRate: contractData.cisRate ? parseFloat(contractData.cisRate) : null,
      })

      // Find the latest application from the included applications array
      const apps = contractData.applications || []
      if (apps.length > 0) {
        // Applications are ordered by applicationNumber asc, take the last one
        const latestApp = apps[apps.length - 1]
        const prevData: PreviousApplication = {
          applicationNumber: latestApp.applicationNumber,
          grossCumulative: parseFloat(latestApp.grossCumulativeValue),
          retentionHeld: parseFloat(latestApp.retentionHeld),
          cisDeduction: parseFloat(latestApp.cisDeduction || 0),
          materialsOnSite: parseFloat(latestApp.cumulativeMaterialsOnSite || 0),
          variationsIncluded: parseFloat(latestApp.cumulativeVariations || 0),
          lines: (latestApp.lines || []).map((l: { description: string; contractLineRef: string; cumulativeValue: string | number }) => ({
            description: l.description,
            contractLineRef: l.contractLineRef || '',
            cumulativeValue: parseFloat(String(l.cumulativeValue)),
          })),
        }
        setPreviousApp(prevData)
        setApplicationNumber(prevData.applicationNumber + 1)
        setMaterialsOnSite(String(prevData.materialsOnSite || 0))
        setVariationsIncluded(String(prevData.variationsIncluded || 0))

        // Pre-populate lines from previous application
        if (prevData.lines.length > 0) {
          setLines(prevData.lines.map((l: PreviousApplicationLine) => newLine(l)))
        } else {
          setLines([newLine(), newLine()])
        }
      } else {
        // No previous application — first application
        setLines([newLine(), newLine()])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred loading data')
    } finally {
      setPageLoading(false)
    }
  }

  function updateLine(key: number, field: keyof ApplicationLine, value: string) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line
        return { ...line, [field]: value }
      })
    )
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()])
  }

  function removeLine(key: number) {
    setLines((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((l) => l.key !== key)
    })
  }

  // --- Calculations (all automatic) ---
  const calculations = useMemo(() => {
    // Sum line cumulative values
    const grossCumulative = lines.reduce((sum, l) => {
      const val = parseFloat(l.cumulativeValue) || 0
      return sum + val
    }, 0)

    // Previous gross cumulative from previous app
    const previousGrossCumulative = previousApp?.grossCumulative || 0

    // This application gross = cumulative - previous
    const thisApplicationGross = grossCumulative - previousGrossCumulative

    // Retention: retentionPercentage * grossCumulative, capped at retentionLimit
    const retPct = (contract?.retentionPercentage || 5) / 100
    let retentionCumulative = grossCumulative * retPct
    if (contract?.retentionLimit && retentionCumulative > contract.retentionLimit) {
      retentionCumulative = contract.retentionLimit
    }
    const previousRetention = previousApp?.retentionHeld || 0
    const retentionThisPeriod = retentionCumulative - previousRetention

    // Contra charges
    const contra = parseFloat(contraCharges) || 0

    // Applied amount = thisApplicationGross - retentionThisPeriod - contra
    const appliedAmount = thisApplicationGross - retentionThisPeriod - contra

    // Per-line this period
    const lineThisPeriods = lines.map((l) => {
      const cumVal = parseFloat(l.cumulativeValue) || 0
      return cumVal - l.previousValue
    })

    return {
      grossCumulative,
      previousGrossCumulative,
      thisApplicationGross,
      retentionCumulative,
      previousRetention,
      retentionThisPeriod,
      contra,
      appliedAmount,
      lineThisPeriods,
    }
  }, [lines, contract, previousApp, contraCharges])

  async function handleSave(submit: boolean) {
    setError(null)

    if (!periodStart || !periodEnd) {
      setError('Period start and end dates are required')
      return
    }

    const validLines = lines.filter((l) => l.description.trim() && parseFloat(l.cumulativeValue) >= 0)
    if (validLines.length === 0) {
      setError('At least one application line is required')
      return
    }

    setLoading(true)
    try {
      const payload = {
        periodStart,
        periodEnd,
        materialsOnSite: parseFloat(materialsOnSite) || 0,
        variationsIncluded: parseFloat(variationsIncluded) || 0,
        contraCharges: calculations.contra,
        contraDescription: contraDescription.trim() || undefined,
        status: submit ? 'SUBMITTED' : 'DRAFT',
        lines: validLines.map((l) => ({
          description: l.description.trim(),
          contractLineRef: l.contractLineRef.trim() || undefined,
          previousValue: l.previousValue,
          cumulativeValue: parseFloat(l.cumulativeValue) || 0,
          percentComplete: l.percentComplete ? parseFloat(l.percentComplete) : undefined,
        })),
      }

      const res = await fetch(`/api/finance/contracts/${contractId}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create application')
      }

      const app = await res.json()
      router.push(`/finance/contracts/${contractId}/applications/${app.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Page loading state
  if (pageLoading) {
    return (
      <div>
        <div className="mb-6">
          <div className="h-4 w-32 rounded bg-gray-200 animate-pulse mb-4" />
          <div className="h-8 w-80 rounded bg-gray-200 animate-pulse mb-2" />
          <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="card p-6 animate-pulse space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 flex-1 rounded bg-gray-200" />
              <div className="h-4 flex-1 rounded bg-gray-200" />
              <div className="h-4 w-24 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div>
        <Link
          href={`/finance/contracts/${contractId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Contract
        </Link>
        <div className="card p-12 text-center">
          <AlertTriangle size={40} className="mx-auto text-red-400 mb-3" />
          <p className="text-lg font-medium text-gray-900">Error Loading Contract</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/finance/contracts/${contractId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to {contract.contractRef}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Application for Payment #{applicationNumber}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {contract.contractRef} — {contract.clientName}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Period */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Period</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="periodStart" className="label">
              Period Start <span className="text-red-500">*</span>
            </label>
            <input
              id="periodStart"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="periodEnd" className="label">
              Period End <span className="text-red-500">*</span>
            </label>
            <input
              id="periodEnd"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="materialsOnSite" className="label">
              Materials on Site (cumulative)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
              <input
                id="materialsOnSite"
                type="number"
                step="0.01"
                min="0"
                value={materialsOnSite}
                onChange={(e) => setMaterialsOnSite(e.target.value)}
                placeholder="0.00"
                className="input pl-7 font-mono"
              />
            </div>
          </div>
          <div>
            <label htmlFor="variationsIncluded" className="label">
              Variations Included (cumulative)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
              <input
                id="variationsIncluded"
                type="number"
                step="0.01"
                min="0"
                value={variationsIncluded}
                onChange={(e) => setVariationsIncluded(e.target.value)}
                placeholder="0.00"
                className="input pl-7 font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Application Lines */}
      <div className="card overflow-hidden mb-6">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Application Lines</h2>
          <button onClick={addLine} className="btn-secondary py-1.5">
            <Plus size={16} className="mr-1" />
            Add Line
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header w-8">#</th>
                <th className="table-header min-w-[200px]">Description</th>
                <th className="table-header w-[120px]">Contract Ref</th>
                <th className="table-header w-[140px] text-right">Previous Value</th>
                <th className="table-header w-[140px] text-right">Cumulative Value</th>
                <th className="table-header w-[140px] text-right">This Period</th>
                <th className="table-header w-[80px] text-right">% Complete</th>
                <th className="table-header w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lines.map((line, idx) => {
                const thisPeriod = calculations.lineThisPeriods[idx] || 0
                return (
                  <tr key={line.key} className="group">
                    <td className="table-cell text-gray-400 text-center">{idx + 1}</td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(line.key, 'description', e.target.value)}
                        placeholder="Description of works"
                        className="input text-sm"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={line.contractLineRef}
                        onChange={(e) => updateLine(line.key, 'contractLineRef', e.target.value)}
                        placeholder="Ref"
                        className="input text-sm"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        readOnly
                        value={formatCurrency(line.previousValue)}
                        className="input text-sm text-right font-mono bg-gray-50 cursor-not-allowed"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">£</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.cumulativeValue}
                          onChange={(e) => updateLine(line.key, 'cumulativeValue', e.target.value)}
                          placeholder="0.00"
                          className="input text-sm text-right font-mono pl-5"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div
                        className={cn(
                          'input text-sm text-right font-mono bg-gray-50 cursor-not-allowed flex items-center justify-end',
                          thisPeriod < 0 && 'text-red-600'
                        )}
                      >
                        {formatCurrency(thisPeriod)}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={line.percentComplete}
                          onChange={(e) => updateLine(line.key, 'percentComplete', e.target.value)}
                          placeholder="%"
                          className="input text-sm text-right font-mono pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length <= 1}
                        className={cn(
                          'text-gray-300 hover:text-red-500 transition-colors',
                          lines.length <= 1 && 'opacity-30 cursor-not-allowed'
                        )}
                        title="Remove line"
                      >
                        <X size={18} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {/* Running totals footer */}
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                <td className="table-cell" colSpan={3} />
                <td className="table-cell text-right font-mono text-gray-500">
                  {formatCurrency(lines.reduce((sum, l) => sum + l.previousValue, 0))}
                </td>
                <td className="table-cell text-right font-mono">
                  {formatCurrency(calculations.grossCumulative)}
                </td>
                <td className="table-cell text-right font-mono">
                  {formatCurrency(calculations.thisApplicationGross)}
                </td>
                <td className="table-cell" colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Contra Charges */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contra Charges</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contraCharges" className="label">Contra Charge Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
              <input
                id="contraCharges"
                type="number"
                step="0.01"
                min="0"
                value={contraCharges}
                onChange={(e) => setContraCharges(e.target.value)}
                placeholder="0.00"
                className="input pl-7 font-mono"
              />
            </div>
          </div>
          <div>
            <label htmlFor="contraDescription" className="label">Description</label>
            <input
              id="contraDescription"
              type="text"
              value={contraDescription}
              onChange={(e) => setContraDescription(e.target.value)}
              placeholder="Reason for contra charge..."
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Application Summary (auto-calculated) */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Summary</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Gross Cumulative Value</span>
            <span className="text-sm font-mono font-semibold">{formatCurrency(calculations.grossCumulative)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Previous Gross Cumulative</span>
            <span className="text-sm font-mono text-gray-500">{formatCurrency(calculations.previousGrossCumulative)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-200 bg-blue-50 -mx-6 px-6">
            <span className="text-sm font-semibold text-blue-900">This Application Gross</span>
            <span className="text-sm font-mono font-bold text-blue-900">{formatCurrency(calculations.thisApplicationGross)}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">
              Cumulative Retention ({contract.retentionPercentage}%
              {contract.retentionLimit ? ` capped at ${formatCurrency(contract.retentionLimit)}` : ''})
            </span>
            <span className="text-sm font-mono text-gray-500">{formatCurrency(calculations.retentionCumulative)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Previous Retention</span>
            <span className="text-sm font-mono text-gray-500">{formatCurrency(calculations.previousRetention)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Retention This Period</span>
            <span className="text-sm font-mono font-semibold text-yellow-700">({formatCurrency(calculations.retentionThisPeriod)})</span>
          </div>

          {calculations.contra > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">
                Contra Charges{contraDescription ? `: ${contraDescription}` : ''}
              </span>
              <span className="text-sm font-mono font-semibold text-orange-700">({formatCurrency(calculations.contra)})</span>
            </div>
          )}

          <div className="flex items-center justify-between py-3 border-t-2 border-gray-300 bg-green-50 -mx-6 px-6 rounded-b-lg">
            <span className="text-base font-bold text-green-900">Applied Amount</span>
            <span className="text-lg font-mono font-bold text-green-900">{formatCurrency(calculations.appliedAmount)}</span>
          </div>
        </div>

        {/* Info text */}
        <div className="mt-4 text-xs text-gray-400">
          <p>Applied Amount = This Application Gross - Retention This Period - Contra Charges</p>
          <p className="mt-1">
            All values are cumulative. &quot;This Period&quot; amounts are automatically calculated as the difference
            between cumulative values and the previous application.
          </p>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between">
        <Link href={`/finance/contracts/${contractId}`} className="btn-ghost">
          Cancel
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={loading}
            className="btn-secondary"
          >
            <Save size={16} className="mr-2" />
            {loading ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={loading || calculations.appliedAmount <= 0}
            className="btn-primary"
            title={calculations.appliedAmount <= 0 ? 'Applied amount must be positive' : 'Submit application'}
          >
            <Send size={16} className="mr-2" />
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>
    </div>
  )
}
