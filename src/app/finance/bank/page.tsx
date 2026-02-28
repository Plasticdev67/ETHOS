'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Building2,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

interface BankAccount {
  id: string
  accountName: string
  accountNumber: string
  sortCode: string
  currentBalance: number
  unreconciledCount: number
  currency: string
  isActive: boolean
}

interface Transaction {
  id: string
  bankAccountId: string
  bankAccountName: string
  date: string
  description: string
  reference: string
  amount: number
  type: string
  isReconciled: boolean
}

export default function BankPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const accountsRes = await fetch('/api/finance/bank/accounts')
        if (!accountsRes.ok) throw new Error('Failed to load bank accounts')

        const accountsData = await accountsRes.json()
        const accountsList: BankAccount[] = Array.isArray(accountsData)
          ? accountsData
          : accountsData.data || []
        setAccounts(accountsList)

        // Fetch recent transactions from each account
        if (accountsList.length > 0) {
          const txnPromises = accountsList.slice(0, 5).map(async (acc) => {
            try {
              const res = await fetch(
                `/api/finance/bank/accounts/${acc.id}/transactions?limit=10`
              )
              if (!res.ok) return []
              const data = await res.json()
              const txns = Array.isArray(data) ? data : data.data || []
              return txns.map((t: Transaction) => ({
                ...t,
                bankAccountId: acc.id,
                bankAccountName: acc.accountName,
              }))
            } catch {
              return []
            }
          })

          const allTxns = (await Promise.all(txnPromises)).flat()
          allTxns.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
          setRecentTransactions(allTxns.slice(0, 20))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const totalBalance = accounts.reduce((sum, a) => sum + (a.currentBalance ?? 0), 0)
  const totalUnreconciled = accounts.reduce(
    (sum, a) => sum + (a.unreconciledCount ?? 0),
    0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bank & Payments</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage bank accounts, receipts, payments, and reconciliation
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/finance/bank/receive"
            className="btn-primary inline-flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <ArrowDownLeft size={16} />
            Receive Payment
          </Link>
          <Link
            href="/finance/bank/pay"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <ArrowUpRight size={16} />
            Make Payment
          </Link>
          <Link
            href="/finance/bank/transfer"
            className="btn-ghost inline-flex items-center gap-2"
          >
            <ArrowLeftRight size={16} />
            Transfer
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
      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Balance</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(totalBalance)}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active Accounts</p>
                <p className="text-lg font-semibold text-gray-900">
                  {accounts.filter((a) => a.isActive !== false).length}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Unreconciled</p>
                <p className="text-lg font-semibold text-gray-900">
                  {totalUnreconciled} transactions
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded w-1/3 mt-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && accounts.length === 0 && !error && (
        <div className="card p-12 text-center">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No bank accounts yet
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Set up your bank accounts to start recording receipts, payments, and
            reconciling your bank statements.
          </p>
          <Link
            href="/finance/bank/accounts/new"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Create Bank Account
          </Link>
        </div>
      )}

      {/* Bank Account Cards */}
      {!loading && accounts.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Bank Accounts</h2>
            <Link
              href="/finance/bank/accounts/new"
              className="btn-secondary inline-flex items-center gap-2 text-sm"
            >
              <Plus size={14} />
              New Account
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <Link
                key={account.id}
                href={`/finance/bank/accounts/${account.id}`}
                className="card p-6 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {account.accountName}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {account.sortCode} / {account.accountNumber}
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600">
                    <Building2 size={16} />
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-gray-500">Current Balance</p>
                  <p
                    className={cn(
                      'text-2xl font-bold',
                      account.currentBalance >= 0
                        ? 'text-gray-900'
                        : 'text-red-600'
                    )}
                  >
                    {formatCurrency(account.currentBalance)}
                  </p>
                </div>

                {(account.unreconciledCount ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-yellow-600">
                    <AlertCircle size={12} />
                    <span>
                      {account.unreconciledCount} unreconciled transaction
                      {account.unreconciledCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {(account.unreconciledCount ?? 0) === 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600">
                    <CheckCircle2 size={12} />
                    <span>Fully reconciled</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Recent Transactions */}
      {!loading && recentTransactions.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Transactions
          </h2>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Account</th>
                    <th className="table-header">Description</th>
                    <th className="table-header">Reference</th>
                    <th className="table-header text-right">Amount</th>
                    <th className="table-header text-center">Reconciled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentTransactions.map((txn) => (
                    <tr
                      key={txn.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/finance/bank/accounts/${txn.bankAccountId}`
                        )
                      }
                    >
                      <td className="table-cell">{formatDate(txn.date)}</td>
                      <td className="table-cell font-medium">
                        {txn.bankAccountName}
                      </td>
                      <td className="table-cell">{txn.description}</td>
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
                      <td className="table-cell text-center">
                        {txn.isReconciled ? (
                          <CheckCircle2
                            size={16}
                            className="inline text-green-500"
                          />
                        ) : (
                          <XCircle
                            size={16}
                            className="inline text-gray-300"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
