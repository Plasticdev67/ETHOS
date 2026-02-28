'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency, formatDateISO } from '@/lib/utils'
import Decimal from 'decimal.js'
import {
  RefreshCw,
  Plus,
  Trash2,
  Save,
  X,
  Eye,
} from 'lucide-react'

interface VatCode {
  id: string
  code: string
  name: string
  rate: number
}

interface Account {
  id: string
  code: string
  name: string
  type: string
}

interface TemplateLine {
  accountId: string
  description: string
  debit: string
  credit: string
  vatCodeId: string
}

const FREQUENCY_OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'FORTNIGHTLY', label: 'Fortnightly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUALLY', label: 'Annually' },
]

export default function NewRecurringTemplatePage() {
  const router = useRouter()

  // Reference data
  const [accounts, setAccounts] = useState<Account[]>([])
  const [vatCodes, setVatCodes] = useState<VatCode[]>([])
  const [loadingRef, setLoadingRef] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState('MONTHLY')
  const [startDate, setStartDate] = useState(formatDateISO(new Date()))
  const [endDate, setEndDate] = useState('')
  const [maxRuns, setMaxRuns] = useState('')

  // Journal lines
  const [lines, setLines] = useState<TemplateLine[]>([
    { accountId: '', description: '', debit: '', credit: '', vatCodeId: '' },
    { accountId: '', description: '', debit: '', credit: '', vatCodeId: '' },
  ])

  // Fetch reference data
  useEffect(() => {
    async function fetchRefData() {
      try {
        setLoadingRef(true)

        const [accRes, vatRes] = await Promise.all([
          fetch('/api/finance/accounts'),
          fetch('/api/finance/vat-codes'),
        ])

        if (!accRes.ok) throw new Error('Failed to load accounts')
        if (!vatRes.ok) throw new Error('Failed to load VAT codes')

        const accData = await accRes.json()
        const vatData = await vatRes.json()

        const loadedAccounts: Account[] = Array.isArray(accData) ? accData : accData.accounts || []
        const loadedVatCodes: VatCode[] = Array.isArray(vatData) ? vatData : vatData.vatCodes || []

        setAccounts(loadedAccounts)
        setVatCodes(loadedVatCodes)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoadingRef(false)
      }
    }

    fetchRefData()
  }, [])

  function updateLine(index: number, field: keyof TemplateLine, value: string) {
    setLines((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }

      // If user enters debit, clear credit and vice-versa
      if (field === 'debit' && value) {
        updated[index].credit = ''
      } else if (field === 'credit' && value) {
        updated[index].debit = ''
      }

      return updated
    })
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { accountId: '', description: '', debit: '', credit: '', vatCodeId: '' },
    ])
  }

  function removeLine(index: number) {
    if (lines.length <= 2) return
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  // Calculate totals using decimal.js
  const totalDebit = lines.reduce(
    (sum, l) => sum.plus(new Decimal(l.debit || 0)),
    new Decimal(0)
  )

  const totalCredit = lines.reduce(
    (sum, l) => sum.plus(new Decimal(l.credit || 0)),
    new Decimal(0)
  )

  const isBalanced = totalDebit.equals(totalCredit)
  const hasValue = totalDebit.greaterThan(0) || totalCredit.greaterThan(0)
  const difference = totalDebit.minus(totalCredit).abs()

  // Validate before submit
  function validate(): string | null {
    if (!name.trim()) return 'Template name is required'
    if (!startDate) return 'Start date is required'

    const validLines = lines.filter((l) => l.accountId && (l.debit || l.credit))
    if (validLines.length < 2) return 'At least 2 journal lines with amounts are required'

    if (!isBalanced) {
      return `Debits (${formatCurrency(totalDebit.toNumber())}) must equal credits (${formatCurrency(totalCredit.toNumber())}). Difference: ${formatCurrency(difference.toNumber())}`
    }

    if (!hasValue) return 'Journal entry cannot have zero value'

    // Check all lines with amounts have accounts
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if ((line.debit || line.credit) && !line.accountId) {
        return `Line ${i + 1}: Account is required for lines with amounts`
      }
    }

    return null
  }

  async function handleSubmit() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setSaving(true)
      setError(null)

      const validLines = lines.filter((l) => l.accountId && (l.debit || l.credit))

      const body = {
        name: name.trim(),
        description: description.trim() || null,
        frequency,
        startDate,
        endDate: endDate || null,
        maxRuns: maxRuns || null,
        lines: validLines.map((l) => ({
          accountId: l.accountId,
          description: l.description.trim() || null,
          debit: l.debit ? parseFloat(l.debit) : 0,
          credit: l.credit ? parseFloat(l.credit) : 0,
          vatCodeId: l.vatCodeId || null,
        })),
      }

      const res = await fetch('/api/finance/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to create recurring template')
      }

      const template = await res.json()
      router.push(`/finance/recurring/${template.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  // Account lookup for preview
  function getAccountName(accountId: string): string {
    const acc = accounts.find((a) => a.id === accountId)
    return acc ? `${acc.code} - ${acc.name}` : accountId
  }

  if (loadingRef) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="card p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded" />
                ))}
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/finance" className="hover:text-gray-700">Finance</Link>
        <span>/</span>
        <Link href="/finance/recurring" className="hover:text-gray-700">Recurring Entries</Link>
        <span>/</span>
        <span className="text-gray-900">New Template</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <RefreshCw size={20} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">New Recurring Template</h1>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Template Details */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Template Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Name */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="label">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input w-full"
              placeholder="e.g. Monthly Rent, Weekly Payroll"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="label">Description</label>
            <textarea
              className="input w-full"
              placeholder="Optional description of this recurring entry"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="label">
              Frequency <span className="text-red-500">*</span>
            </label>
            <select
              className="input w-full"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="label">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="input w-full"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="label">End Date (optional)</label>
            <input
              type="date"
              className="input w-full"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {/* Max Runs */}
          <div>
            <label className="label">Max Runs (optional)</label>
            <input
              type="number"
              className="input w-full"
              placeholder="Unlimited"
              value={maxRuns}
              onChange={(e) => setMaxRuns(e.target.value)}
              min="1"
            />
            <p className="text-xs text-gray-400 mt-1">
              Leave blank for unlimited runs
            </p>
          </div>
        </div>
      </div>

      {/* Journal Lines */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Journal Lines</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="btn-ghost inline-flex items-center gap-2 text-sm"
            >
              <Eye size={14} />
              {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={addLine}
              className="btn-secondary inline-flex items-center gap-2 text-sm"
            >
              <Plus size={14} />
              Add Line
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header w-10">#</th>
                <th className="table-header">Account</th>
                <th className="table-header">Description</th>
                <th className="table-header w-32 text-right">Debit</th>
                <th className="table-header w-32 text-right">Credit</th>
                <th className="table-header">VAT Code</th>
                <th className="table-header w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lines.map((line, index) => (
                <tr key={index} className="group">
                  <td className="table-cell text-center text-gray-400">{index + 1}</td>
                  <td className="table-cell">
                    <select
                      className="input w-full min-w-[200px]"
                      value={line.accountId}
                      onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                    >
                      <option value="">Select account</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="table-cell">
                    <input
                      type="text"
                      className="input w-full min-w-[150px]"
                      placeholder="Line description"
                      value={line.description}
                      onChange={(e) => updateLine(index, 'description', e.target.value)}
                    />
                  </td>
                  <td className="table-cell">
                    <input
                      type="number"
                      className="input w-full text-right"
                      placeholder="0.00"
                      value={line.debit}
                      onChange={(e) => updateLine(index, 'debit', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="table-cell">
                    <input
                      type="number"
                      className="input w-full text-right"
                      placeholder="0.00"
                      value={line.credit}
                      onChange={(e) => updateLine(index, 'credit', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="table-cell">
                    <select
                      className="input w-full min-w-[140px]"
                      value={line.vatCodeId}
                      onChange={(e) => updateLine(index, 'vatCodeId', e.target.value)}
                    >
                      <option value="">No VAT</option>
                      {vatCodes.map((vc) => (
                        <option key={vc.id} value={vc.id}>
                          {vc.code} ({vc.rate}%)
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="table-cell text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={lines.length <= 2}
                      className={cn(
                        'p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors',
                        lines.length <= 2 && 'opacity-30 cursor-not-allowed'
                      )}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-300 bg-gray-50">
              <tr>
                <td colSpan={3} className="table-cell text-right font-semibold text-gray-700">
                  Totals
                </td>
                <td className="table-cell text-right font-semibold">
                  {formatCurrency(totalDebit.toNumber())}
                </td>
                <td className="table-cell text-right font-semibold">
                  {formatCurrency(totalCredit.toNumber())}
                </td>
                <td colSpan={2} className="table-cell" />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Balance indicator */}
        {hasValue && (
          <div className={cn(
            'px-4 py-3 border-t text-sm',
            isBalanced
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          )}>
            {isBalanced ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                Journal is balanced - debits equal credits
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                Journal is unbalanced - difference of {formatCurrency(difference.toNumber())}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Preview Panel */}
      {showPreview && hasValue && (
        <div className="card p-6 border-2 border-indigo-200">
          <h3 className="text-lg font-semibold text-indigo-900 mb-4">
            Journal Entry Preview
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            This is what the journal entry will look like when posted:
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-500">Description:</div>
              <div className="font-medium">{name || '(Template Name)'} (Recurring)</div>
              <div className="text-gray-500">Source:</div>
              <div className="font-medium">SYSTEM</div>
              <div className="text-gray-500">Frequency:</div>
              <div className="font-medium">
                {FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label || frequency}
              </div>
            </div>
          </div>

          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr>
                <th className="table-header">Account</th>
                <th className="table-header">Description</th>
                <th className="table-header text-right">Debit</th>
                <th className="table-header text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lines
                .filter((l) => l.accountId && (l.debit || l.credit))
                .map((line, index) => (
                  <tr key={index}>
                    <td className="table-cell font-medium">{getAccountName(line.accountId)}</td>
                    <td className="table-cell text-gray-500">{line.description || '-'}</td>
                    <td className="table-cell text-right">
                      {line.debit ? formatCurrency(parseFloat(line.debit)) : '-'}
                    </td>
                    <td className="table-cell text-right">
                      {line.credit ? formatCurrency(parseFloat(line.credit)) : '-'}
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-300">
              <tr>
                <td colSpan={2} className="table-cell text-right font-semibold">Total</td>
                <td className="table-cell text-right font-semibold">
                  {formatCurrency(totalDebit.toNumber())}
                </td>
                <td className="table-cell text-right font-semibold">
                  {formatCurrency(totalCredit.toNumber())}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pb-8">
        <Link href="/finance/recurring" className="btn-ghost inline-flex items-center gap-2">
          <X size={16} />
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Save size={16} />
          {saving ? 'Creating...' : 'Create Template'}
        </button>
      </div>
    </div>
  )
}
