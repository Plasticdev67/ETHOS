'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDateISO } from '@/lib/utils'
import {
  ArrowLeftRight,
  ArrowRight,
  Loader2,
  X,
  CheckCircle2,
  Building2,
} from 'lucide-react'

interface BankAccount {
  id: string
  accountName: string
  accountNumber: string
  sortCode: string
  currentBalance: number
}

export default function BankTransferPage() {
  const router = useRouter()

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loadingRef, setLoadingRef] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Form state
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [transferDate, setTransferDate] = useState(formatDateISO(new Date()))
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')

  // Fetch bank accounts
  useEffect(() => {
    async function fetchAccounts() {
      try {
        setLoadingRef(true)
        const res = await fetch('/api/finance/bank/accounts')
        if (!res.ok) throw new Error('Failed to load bank accounts')

        const data = await res.json()
        const list = Array.isArray(data) ? data : data.data || []
        setBankAccounts(list)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoadingRef(false)
      }
    }

    fetchAccounts()
  }, [])

  const fromAccount = bankAccounts.find((a) => a.id === fromAccountId)
  const toAccount = bankAccounts.find((a) => a.id === toAccountId)

  // Filter "to" accounts to exclude "from" account
  const toAccountOptions = bankAccounts.filter((a) => a.id !== fromAccountId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!fromAccountId) {
      setError('Please select a "From" account')
      return
    }
    if (!toAccountId) {
      setError('Please select a "To" account')
      return
    }
    if (fromAccountId === toAccountId) {
      setError('From and To accounts must be different')
      return
    }
    if (!amount || amount <= 0) {
      setError('Please enter a valid transfer amount')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const body = {
        fromAccountId,
        toAccountId,
        amount,
        date: transferDate,
        reference: reference.trim(),
        description: description.trim() || `Transfer from ${fromAccount?.accountName} to ${toAccount?.accountName}`,
      }

      const res = await fetch('/api/finance/bank/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to execute transfer')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/finance/bank')
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loadingRef) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="card p-6">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
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
        <Link href="/finance/bank" className="hover:text-gray-700">
          Bank & Payments
        </Link>
        <span>/</span>
        <span className="text-gray-900">Transfer</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <ArrowLeftRight size={20} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Bank Transfer</h1>
      </div>

      {/* Success */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-600" />
          <p className="text-sm text-green-800 font-medium">
            Transfer executed successfully. Redirecting...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Transfer Form */}
      <form onSubmit={handleSubmit}>
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Transfer Details
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* From Account */}
            <div>
              <label className="label">
                From Account <span className="text-red-500">*</span>
              </label>
              <select
                className="input w-full"
                value={fromAccountId}
                onChange={(e) => {
                  setFromAccountId(e.target.value)
                  // Reset "to" if same as new "from"
                  if (e.target.value === toAccountId) setToAccountId('')
                }}
              >
                <option value="">Select source account</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} - {formatCurrency(acc.currentBalance)}
                  </option>
                ))}
              </select>
              {fromAccount && (
                <p className="text-xs text-gray-400 mt-1">
                  Balance: {formatCurrency(fromAccount.currentBalance)}
                </p>
              )}
            </div>

            {/* To Account */}
            <div>
              <label className="label">
                To Account <span className="text-red-500">*</span>
              </label>
              <select
                className="input w-full"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
              >
                <option value="">Select destination account</option>
                {toAccountOptions.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} - {formatCurrency(acc.currentBalance)}
                  </option>
                ))}
              </select>
              {toAccount && (
                <p className="text-xs text-gray-400 mt-1">
                  Balance: {formatCurrency(toAccount.currentBalance)}
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="label">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className="input w-full"
                placeholder="0.00"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                min="0"
                step="0.01"
              />
            </div>

            {/* Date */}
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input w-full"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>

            {/* Reference */}
            <div>
              <label className="label">Reference</label>
              <input
                type="text"
                className="input w-full"
                placeholder="Optional reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <label className="label">Description</label>
              <input
                type="text"
                className="input w-full"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Transfer Preview */}
        {fromAccount && toAccount && amount > 0 && (
          <div className="card p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Transfer Preview
            </h2>

            <div className="flex items-center justify-center gap-6 py-4">
              {/* From */}
              <div className="text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 mx-auto mb-2">
                  <Building2 size={24} />
                </div>
                <p className="font-semibold text-gray-900">
                  {fromAccount.accountName}
                </p>
                <p className="text-sm text-gray-500">
                  {fromAccount.sortCode} / {fromAccount.accountNumber}
                </p>
                <p className="text-sm text-red-600 font-medium mt-1">
                  -{formatCurrency(amount)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  New balance:{' '}
                  {formatCurrency(fromAccount.currentBalance - amount)}
                </p>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatCurrency(amount)}
                </div>
                <ArrowRight size={32} className="text-blue-500" />
              </div>

              {/* To */}
              <div className="text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600 mx-auto mb-2">
                  <Building2 size={24} />
                </div>
                <p className="font-semibold text-gray-900">
                  {toAccount.accountName}
                </p>
                <p className="text-sm text-gray-500">
                  {toAccount.sortCode} / {toAccount.accountNumber}
                </p>
                <p className="text-sm text-green-600 font-medium mt-1">
                  +{formatCurrency(amount)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  New balance:{' '}
                  {formatCurrency(toAccount.currentBalance + amount)}
                </p>
              </div>
            </div>

            {/* Journal Preview */}
            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500 mb-2">Journal entry:</p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="table-header">Account</th>
                      <th className="table-header text-right">Debit</th>
                      <th className="table-header text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="table-cell font-medium">
                        {toAccount.accountName} (destination)
                      </td>
                      <td className="table-cell text-right font-medium text-green-600">
                        {formatCurrency(amount)}
                      </td>
                      <td className="table-cell text-right">-</td>
                    </tr>
                    <tr>
                      <td className="table-cell font-medium">
                        {fromAccount.accountName} (source)
                      </td>
                      <td className="table-cell text-right">-</td>
                      <td className="table-cell text-right font-medium text-red-600">
                        {formatCurrency(amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pb-8">
          <Link
            href="/finance/bank"
            className="btn-ghost inline-flex items-center gap-2"
          >
            <X size={16} />
            Cancel
          </Link>
          <button
            type="submit"
            disabled={
              saving ||
              success ||
              !fromAccountId ||
              !toAccountId ||
              !amount ||
              amount <= 0
            }
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowLeftRight size={16} />
            )}
            {saving ? 'Executing...' : 'Execute Transfer'}
          </button>
        </div>
      </form>
    </div>
  )
}
