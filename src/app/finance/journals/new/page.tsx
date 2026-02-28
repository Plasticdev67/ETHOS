'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, formatCurrency, formatDateISO } from '@/lib/utils'
import { ArrowLeft, Plus, X, Save, CheckCircle, AlertTriangle } from 'lucide-react'

interface Account {
  id: string
  code: string
  name: string
  type: string
}

interface Period {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'OPEN' | 'CLOSED' | 'LOCKED'
}

interface JournalLine {
  key: number
  accountId: string
  description: string
  debit: string
  credit: string
  vatCode: string
}

let lineKeyCounter = 0

function newLine(): JournalLine {
  return {
    key: ++lineKeyCounter,
    accountId: '',
    description: '',
    debit: '',
    credit: '',
    vatCode: '',
  }
}

export default function NewJournalPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Header fields
  const [date, setDate] = useState(formatDateISO(new Date()))
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [periodId, setPeriodId] = useState('')

  // Journal lines
  const [lines, setLines] = useState<JournalLine[]>([newLine(), newLine()])

  // Load accounts and periods on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [accountsRes, periodsRes] = await Promise.all([
          fetch('/api/finance/accounts'),
          fetch('/api/finance/periods'),
        ])
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json()
          setAccounts(accountsData)
        }
        if (periodsRes.ok) {
          const periodsData = await periodsRes.json()
          const openPeriods = periodsData.filter((p: Period) => p.status === 'OPEN')
          setPeriods(openPeriods)
          // Auto-select current period if there is one
          if (openPeriods.length > 0) {
            setPeriodId(openPeriods[0].id)
          }
        }
      } catch {
        // Non-blocking; the form can still function
      }
    }
    loadData()
  }, [])

  function updateLine(key: number, field: keyof JournalLine, value: string) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line
        const updated = { ...line, [field]: value }

        // When user enters a debit, clear credit and vice versa
        if (field === 'debit' && value) {
          updated.credit = ''
        } else if (field === 'credit' && value) {
          updated.debit = ''
        }

        return updated
      })
    )
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()])
  }

  function removeLine(key: number) {
    setLines((prev) => {
      if (prev.length <= 2) return prev // Must keep at least 2 lines
      return prev.filter((l) => l.key !== key)
    })
  }

  // Calculate totals
  const totals = useMemo(() => {
    let totalDebit = 0
    let totalCredit = 0
    lines.forEach((line) => {
      const debit = parseFloat(line.debit) || 0
      const credit = parseFloat(line.credit) || 0
      totalDebit += debit
      totalCredit += credit
    })
    const difference = Math.abs(totalDebit - totalCredit)
    const isBalanced = difference < 0.005 // Tolerance for floating point
    return { totalDebit, totalCredit, difference, isBalanced }
  }, [lines])

  function validate(): boolean {
    const errors: Record<string, string> = {}

    if (!description.trim()) {
      errors.description = 'Description is required'
    }
    if (!date) {
      errors.date = 'Date is required'
    }

    // Check that we have at least 2 lines with amounts
    const linesWithAmounts = lines.filter(
      (l) => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0)
    )
    if (linesWithAmounts.length < 2) {
      errors.lines = 'At least 2 journal lines with accounts and amounts are required'
    }

    // Check all lines with amounts have accounts
    lines.forEach((line, idx) => {
      const hasAmount = parseFloat(line.debit) > 0 || parseFloat(line.credit) > 0
      if (hasAmount && !line.accountId) {
        errors[`line_${idx}_account`] = 'Account is required when an amount is entered'
      }
    })

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSave(shouldPost: boolean) {
    setError(null)
    if (!validate()) return
    if (shouldPost && !totals.isBalanced) {
      setError('Journal must be balanced before posting (total debits must equal total credits)')
      return
    }

    setLoading(true)
    try {
      const payload = {
        date,
        description: description.trim(),
        reference: reference.trim() || null,
        periodId: periodId || undefined,
        source: 'MANUAL',
        createdBy: 'system', // TODO: Replace with authenticated user ID
        lines: lines
          .filter((l) => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
          .map((l) => ({
            accountId: l.accountId,
            description: l.description.trim() || null,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
            vatCodeId: l.vatCode.trim() || null,
          })),
      }

      // Create journal
      const res = await fetch('/api/finance/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create journal entry')
      }

      const journal = await res.json()

      // If posting, call the post endpoint
      if (shouldPost) {
        const postRes = await fetch(`/api/finance/journals/${journal.id}/post`, {
          method: 'POST',
        })
        if (!postRes.ok) {
          // Journal was saved but not posted
          setError('Journal saved as draft but failed to post. You can post it from the journal detail page.')
          router.push(`/finance/journals/${journal.id}`)
          return
        }
      }

      router.push(`/finance/journals/${journal.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/finance/journals"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Journal Entries
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Journal Entry</h1>
        <p className="mt-1 text-sm text-gray-500">Create a manual journal entry</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Header fields */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Date */}
          <div>
            <label htmlFor="date" className="label">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              id="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={cn('input', validationErrors.date && 'border-red-500')}
            />
            {validationErrors.date && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.date}</p>
            )}
          </div>

          {/* Description */}
          <div className="lg:col-span-2">
            <label htmlFor="description" className="label">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              id="description"
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly accruals, correction entry..."
              className={cn('input', validationErrors.description && 'border-red-500')}
            />
            {validationErrors.description && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.description}</p>
            )}
          </div>

          {/* Reference */}
          <div>
            <label htmlFor="reference" className="label">
              Reference
            </label>
            <input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional"
              className="input"
            />
          </div>

          {/* Period */}
          <div>
            <label htmlFor="period" className="label">
              Accounting Period
            </label>
            <select
              id="period"
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              className="input"
            >
              <option value="">Auto-detect</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {periods.length === 0 && (
              <p className="mt-1 text-xs text-yellow-600">No open periods found</p>
            )}
          </div>
        </div>
      </div>

      {/* Journal Lines */}
      <div className="card overflow-hidden mb-6">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Journal Lines</h2>
          <button onClick={addLine} className="btn-secondary py-1.5">
            <Plus size={16} className="mr-1" />
            Add Line
          </button>
        </div>

        {validationErrors.lines && (
          <div className="mx-6 mt-4 rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-800">{validationErrors.lines}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header w-8">#</th>
                <th className="table-header min-w-[250px]">Account</th>
                <th className="table-header min-w-[200px]">Description</th>
                <th className="table-header w-[140px] text-right">Debit</th>
                <th className="table-header w-[140px] text-right">Credit</th>
                <th className="table-header w-[100px]">VAT Code</th>
                <th className="table-header w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lines.map((line, idx) => {
                const hasDebit = parseFloat(line.debit) > 0
                const hasCredit = parseFloat(line.credit) > 0

                return (
                  <tr key={line.key} className="group">
                    <td className="table-cell text-gray-400 text-center">{idx + 1}</td>
                    <td className="px-2 py-2">
                      <select
                        value={line.accountId}
                        onChange={(e) => updateLine(line.key, 'accountId', e.target.value)}
                        className={cn(
                          'input text-sm',
                          validationErrors[`line_${idx}_account`] && 'border-red-500'
                        )}
                      >
                        <option value="">Select account...</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(line.key, 'description', e.target.value)}
                        placeholder="Line description"
                        className="input text-sm"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.debit}
                        onChange={(e) => updateLine(line.key, 'debit', e.target.value)}
                        disabled={hasCredit}
                        placeholder="0.00"
                        className={cn(
                          'input text-sm text-right font-mono',
                          hasCredit && 'bg-gray-50 cursor-not-allowed'
                        )}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.credit}
                        onChange={(e) => updateLine(line.key, 'credit', e.target.value)}
                        disabled={hasDebit}
                        placeholder="0.00"
                        className={cn(
                          'input text-sm text-right font-mono',
                          hasDebit && 'bg-gray-50 cursor-not-allowed'
                        )}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={line.vatCode}
                        onChange={(e) => updateLine(line.key, 'vatCode', e.target.value)}
                        placeholder="e.g. S"
                        className="input text-sm"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length <= 2}
                        className={cn(
                          'text-gray-300 hover:text-red-500 transition-colors',
                          lines.length <= 2 && 'opacity-30 cursor-not-allowed'
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

            {/* Totals footer */}
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300">
                <td colSpan={3} className="table-cell font-semibold text-right">
                  Total Debits
                </td>
                <td className="table-cell text-right font-mono font-semibold">
                  {formatCurrency(totals.totalDebit)}
                </td>
                <td className="table-cell text-right font-mono font-semibold">
                  {formatCurrency(totals.totalCredit)}
                </td>
                <td colSpan={2} className="table-cell text-right font-semibold">
                  Total Credits
                </td>
              </tr>
              <tr
                className={cn(
                  'border-t',
                  totals.isBalanced ? 'bg-green-50' : 'bg-red-50'
                )}
              >
                <td colSpan={3} className="table-cell font-semibold text-right">
                  Difference
                </td>
                <td
                  colSpan={2}
                  className={cn(
                    'table-cell text-center font-mono font-bold text-lg',
                    totals.isBalanced ? 'text-green-700' : 'text-red-700'
                  )}
                >
                  {formatCurrency(totals.difference)}
                  {totals.isBalanced && (
                    <CheckCircle size={16} className="inline ml-2 text-green-600" />
                  )}
                </td>
                <td colSpan={2} className="table-cell">
                  {!totals.isBalanced && (
                    <span className="text-xs text-red-600">Journal is unbalanced</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between">
        <Link href="/finance/journals" className="btn-ghost">
          Cancel
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={loading || lines.length < 2}
            className="btn-secondary"
          >
            <Save size={16} className="mr-2" />
            {loading ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={loading || !totals.isBalanced || lines.length < 2}
            className="btn-primary"
            title={!totals.isBalanced ? 'Journal must be balanced to post' : 'Save and post journal'}
          >
            <CheckCircle size={16} className="mr-2" />
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
