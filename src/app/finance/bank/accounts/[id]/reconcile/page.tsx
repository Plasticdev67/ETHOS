'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { cn, formatCurrency, formatDate, formatDateISO } from '@/lib/utils'
import {
  ClipboardCheck,
  Loader2,
  X,
  CheckCircle2,
  Building2,
  AlertCircle,
  Check,
} from 'lucide-react'

interface BankAccount {
  id: string
  accountName: string
  accountNumber: string
  sortCode: string
  currentBalance: number
  lastReconciledBalance: number
  lastReconciledDate: string | null
}

interface Transaction {
  id: string
  date: string
  description: string
  reference: string
  amount: number
  type: string
  source: string
  isReconciled: boolean
}

export default function BankReconcilePage() {
  const params = useParams()
  const router = useRouter()
  const accountId = params.id as string

  const [account, setAccount] = useState<BankAccount | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Reconciliation inputs
  const [statementDate, setStatementDate] = useState(formatDateISO(new Date()))
  const [statementBalance, setStatementBalance] = useState<number>(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Fetch account and unreconciled transactions
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const [accountRes, txnRes] = await Promise.all([
          fetch(`/api/finance/bank/accounts/${accountId}`),
          fetch(
            `/api/finance/bank/accounts/${accountId}/transactions?reconciled=false&limit=500`
          ),
        ])

        if (!accountRes.ok) throw new Error('Failed to load bank account')
        if (!txnRes.ok) throw new Error('Failed to load transactions')

        const accountData = await accountRes.json()
        const txnData = await txnRes.json()

        setAccount(accountData)
        setStatementBalance(accountData.currentBalance ?? 0)

        const txnList = Array.isArray(txnData) ? txnData : txnData.data || []
        setTransactions(txnList)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accountId])

  // Toggle transaction selection
  function toggleTransaction(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Select all / deselect all
  function selectAll() {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)))
    }
  }

  // Calculate reconciliation summary
  const openingBalance = account?.lastReconciledBalance ?? 0

  const selectedReceipts = useMemo(
    () =>
      transactions
        .filter((t) => selectedIds.has(t.id) && t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions, selectedIds]
  )

  const selectedPayments = useMemo(
    () =>
      transactions
        .filter((t) => selectedIds.has(t.id) && t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [transactions, selectedIds]
  )

  const calculatedBalance = useMemo(
    () =>
      Math.round(
        (openingBalance + selectedReceipts - selectedPayments) * 100
      ) / 100,
    [openingBalance, selectedReceipts, selectedPayments]
  )

  const difference = useMemo(
    () => Math.round((statementBalance - calculatedBalance) * 100) / 100,
    [statementBalance, calculatedBalance]
  )

  const isBalanced = Math.abs(difference) < 0.01

  // Submit reconciliation
  async function handleReconcile() {
    if (selectedIds.size === 0) {
      setError('Please select at least one transaction to reconcile')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const body = {
        statementDate,
        statementBalance,
        transactionIds: Array.from(selectedIds),
      }

      const res = await fetch(
        `/api/finance/bank/accounts/${accountId}/reconcile`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to reconcile')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/finance/bank/accounts/${accountId}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded w-1/2" />
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-7 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
            <div className="card p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-7 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
          <div className="card p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded mb-3" />
            ))}
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
        <Link
          href={`/finance/bank/accounts/${accountId}`}
          className="hover:text-gray-700"
        >
          {account?.accountName}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Reconcile</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Reconcile {account?.accountName}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {account?.sortCode} / {account?.accountNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Success */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-600" />
          <p className="text-sm text-green-800 font-medium">
            Reconciliation completed successfully. Redirecting...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Statement Details */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Statement Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="label">Statement Date</label>
            <input
              type="date"
              className="input w-full"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Statement Closing Balance</label>
            <input
              type="number"
              className="input w-full"
              value={statementBalance}
              onChange={(e) => setStatementBalance(Number(e.target.value))}
              step="0.01"
            />
          </div>
          <div>
            <label className="label">Opening Balance</label>
            <input
              type="text"
              className="input w-full bg-gray-50"
              value={formatCurrency(openingBalance)}
              disabled
            />
            {account?.lastReconciledDate && (
              <p className="text-xs text-gray-400 mt-1">
                Last reconciled: {formatDate(account.lastReconciledDate)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Reconciliation Summary */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Reconciliation Summary
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-xs text-gray-500">Opening Balance</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(openingBalance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">+ Receipts Selected</p>
            <p className="text-lg font-semibold text-green-600">
              {formatCurrency(selectedReceipts)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">- Payments Selected</p>
            <p className="text-lg font-semibold text-red-600">
              {formatCurrency(selectedPayments)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">= Calculated Balance</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(calculatedBalance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Statement Balance</p>
            <p className="text-lg font-semibold text-blue-600">
              {formatCurrency(statementBalance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Difference</p>
            <p
              className={cn(
                'text-lg font-semibold',
                isBalanced
                  ? 'text-green-600'
                  : 'text-red-600'
              )}
            >
              {formatCurrency(difference)}
            </p>
            {isBalanced && (
              <div className="flex items-center gap-1 text-xs text-green-600 mt-0.5">
                <CheckCircle2 size={12} />
                Balanced
              </div>
            )}
            {!isBalanced && selectedIds.size > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-600 mt-0.5">
                <AlertCircle size={12} />
                Not balanced
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unreconciled Transactions */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Unreconciled Transactions ({transactions.length})
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="btn-ghost text-sm"
            >
              {selectedIds.size === transactions.length
                ? 'Deselect All'
                : 'Select All'}
            </button>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 size={40} className="mx-auto text-green-300 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              All transactions reconciled
            </h3>
            <p className="text-sm text-gray-500">
              There are no unreconciled transactions for this account.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === transactions.length &&
                        transactions.length > 0
                      }
                      onChange={selectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Description</th>
                  <th className="table-header">Reference</th>
                  <th className="table-header text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((txn) => {
                  const isSelected = selectedIds.has(txn.id)
                  return (
                    <tr
                      key={txn.id}
                      className={cn(
                        'hover:bg-gray-50 cursor-pointer transition-colors',
                        isSelected && 'bg-purple-50'
                      )}
                      onClick={() => toggleTransaction(txn.id)}
                    >
                      <td className="table-cell">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTransaction(txn.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="table-cell">{formatDate(txn.date)}</td>
                      <td className="table-cell font-medium">
                        {txn.description}
                        {isSelected && (
                          <Check
                            size={14}
                            className="inline ml-2 text-purple-500"
                          />
                        )}
                      </td>
                      <td className="table-cell text-gray-500">
                        {txn.reference || '-'}
                      </td>
                      <td
                        className={cn(
                          'table-cell text-right font-medium',
                          txn.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {formatCurrency(txn.amount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pb-8">
        <Link
          href={`/finance/bank/accounts/${accountId}`}
          className="btn-ghost inline-flex items-center gap-2"
        >
          <X size={16} />
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleReconcile}
          disabled={
            saving ||
            success ||
            selectedIds.size === 0
          }
          className={cn(
            'btn-primary inline-flex items-center gap-2 disabled:opacity-50',
            isBalanced
              ? 'bg-green-600 hover:bg-green-700'
              : ''
          )}
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ClipboardCheck size={16} />
          )}
          {saving
            ? 'Reconciling...'
            : isBalanced
              ? 'Mark Selected as Reconciled'
              : `Reconcile (Difference: ${formatCurrency(difference)})`}
        </button>
      </div>
    </div>
  )
}
