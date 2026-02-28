'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Wallet,
  Users,
  Truck,
  TrendingUp,
  Plus,
  FileText,
  Receipt,
  ShoppingCart,
  HardHat,
  ShieldCheck,
  Clock,
  ArrowRight,
} from 'lucide-react'

interface DashboardData {
  bankBalances: {
    total: string
    accounts: { id: string; name: string; balance: string }[]
  }
  debtors: {
    total: string
    invoiceDebtors: string
    invoiceCount: number
    contractDebtors: string
  }
  creditors: {
    total: string
    invoiceCount: number
  }
  contracts: {
    activeCount: number
    totalValue: string
    certifiedToDate: string
    paidToDate: string
    retentionHeld: string
    outstandingApplications: number
  }
  profitAndLoss: {
    periodId: string | null
    periodName: string | null
    totalRevenue: string
    totalExpenses: string
    netProfitLoss: string
  }
  recentJournals: {
    id: string
    entryNumber: string
    date: string
    description: string
    source: string
    totalDebit: number | string
    totalCredit: number | string
    status: 'JOURNAL_DRAFT' | 'POSTED' | 'REVERSED'
  }[]
}

function SkeletonCard() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-lg bg-gray-200" />
        <div className="flex-1">
          <div className="h-4 w-24 rounded bg-gray-200 mb-2" />
          <div className="h-6 w-32 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  )
}

function SkeletonTable() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 w-16 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-4 flex-1 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  )
}

const statusBadge: Record<string, string> = {
  JOURNAL_DRAFT: 'badge-gray',
  POSTED: 'badge-success',
  REVERSED: 'badge-danger',
}

const sourceBadge: Record<string, string> = {
  MANUAL: 'badge-gray',
  CONSTRUCTION_APPLICATION: 'badge-info',
  CONSTRUCTION_RETENTION: 'badge-warning',
  CONSTRUCTION_CIS: 'badge-danger',
  SALES_INVOICE: 'badge-success',
  CREDIT_NOTE: 'badge-danger',
  PURCHASE_INVOICE: 'badge-warning',
  BANK_RECEIPT: 'badge-success',
  BANK_PAYMENT: 'badge-warning',
  BANK_TRANSFER: 'badge-info',
}

export default function AccountingDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/finance/dashboard')
        if (!res.ok) throw new Error('Failed to load dashboard data')
        const json = await res.json()
        setData(json)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounting Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">{formatDate(new Date())}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/finance/journals/new" className="btn-primary">
            <Plus size={16} className="mr-2" />
            New Journal
          </Link>
          <Link href="/finance/contracts/new" className="btn-secondary">
            <HardHat size={16} className="mr-2" />
            New Contract
          </Link>
          <Link href="/finance/sales/new" className="btn-secondary">
            <Receipt size={16} className="mr-2" />
            New Invoice
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Primary summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : data ? (
          <>
            <Link href="/finance/bank" className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Wallet size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Bank Balance</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(data.bankBalances.total)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {data.bankBalances.accounts.length} account{data.bankBalances.accounts.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </Link>
            <Link href="/finance/sales/aged-debtors" className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Debtors</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(data.debtors.total)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Invoices: {formatCurrency(data.debtors.invoiceDebtors)} ({data.debtors.invoiceCount}) | Contracts: {formatCurrency(data.debtors.contractDebtors)}
                  </p>
                </div>
              </div>
            </Link>
            <Link href="/finance/purchases/aged-creditors" className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                  <Truck size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Trade Creditors</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(data.creditors.total)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {data.creditors.invoiceCount} invoices
                  </p>
                </div>
              </div>
            </Link>
            <div className="card p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    P&L {data.profitAndLoss.periodName ? `(${data.profitAndLoss.periodName})` : ''}
                  </p>
                  <p className={cn(
                    'text-xl font-semibold',
                    parseFloat(data.profitAndLoss.netProfitLoss) >= 0 ? 'text-green-700' : 'text-red-700'
                  )}>
                    {formatCurrency(data.profitAndLoss.netProfitLoss)}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Construction Contracts Summary */}
      {!loading && data && data.contracts.activeCount > 0 && (
        <div className="mb-6 card">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <HardHat size={20} className="text-amber-600" />
              <h2 className="text-lg font-semibold text-gray-900">Construction Contracts</h2>
            </div>
            <Link href="/finance/contracts" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-gray-200">
            <div className="p-4 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase">Active</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data.contracts.activeCount}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase">Total Value</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(data.contracts.totalValue)}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase">Certified</p>
              <p className="text-lg font-semibold text-green-700 mt-1">{formatCurrency(data.contracts.certifiedToDate)}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase">Paid</p>
              <p className="text-lg font-semibold text-blue-700 mt-1">{formatCurrency(data.contracts.paidToDate)}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase flex items-center justify-center gap-1">
                <ShieldCheck size={14} /> Retention
              </p>
              <p className="text-lg font-semibold text-amber-700 mt-1">{formatCurrency(data.contracts.retentionHeld)}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase flex items-center justify-center gap-1">
                <Clock size={14} /> Outstanding
              </p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{data.contracts.outstandingApplications}</p>
              <p className="text-xs text-gray-400">applications</p>
            </div>
          </div>
        </div>
      )}

      {/* No contracts yet -- show CTA */}
      {!loading && data && data.contracts.activeCount === 0 && (
        <div className="mb-6 card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardHat size={24} className="text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">Construction Contracts</p>
                <p className="text-sm text-gray-500">Set up NEC/JCT contracts with applications for payment, retention tracking, and CIS</p>
              </div>
            </div>
            <Link href="/finance/contracts/new" className="btn-secondary">
              <Plus size={16} className="mr-2" />
              New Contract
            </Link>
          </div>
        </div>
      )}

      {/* Recent Journals */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Journals</h2>
          <Link href="/finance/journals" className="text-sm text-blue-600 hover:text-blue-700">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6">
              <SkeletonTable />
            </div>
          ) : data?.recentJournals && data.recentJournals.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Entry #</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Description</th>
                  <th className="table-header">Source</th>
                  <th className="table-header text-right">Debit</th>
                  <th className="table-header text-right">Credit</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.recentJournals.map((journal) => (
                  <tr key={journal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell">
                      <Link
                        href={`/finance/journals/${journal.id}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {journal.entryNumber}
                      </Link>
                    </td>
                    <td className="table-cell">{formatDate(journal.date)}</td>
                    <td className="table-cell max-w-xs truncate">{journal.description}</td>
                    <td className="table-cell">
                      <span className={sourceBadge[journal.source] || 'badge-info'}>
                        {journal.source.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="table-cell text-right font-mono">
                      {formatCurrency(journal.totalDebit)}
                    </td>
                    <td className="table-cell text-right font-mono">
                      {formatCurrency(journal.totalCredit)}
                    </td>
                    <td className="table-cell">
                      <span className={statusBadge[journal.status] || 'badge-gray'}>
                        {journal.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center">
              <FileText size={40} className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No journal entries yet</p>
              <Link href="/finance/journals/new" className="btn-primary mt-4 inline-flex">
                <Plus size={16} className="mr-2" />
                Create your first journal
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
