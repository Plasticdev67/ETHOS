'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  ShieldAlert,
  Search,
  ArrowUpDown,
  Clock,
  AlertTriangle,
  AlertOctagon,
  PoundSterling,
  Users,
  Phone,
  Mail,
} from 'lucide-react'

interface ChasingAction {
  action: string
  date: string
  notes: string | null
}

interface OverdueCustomer {
  customerId: string
  customerCode: string
  customerName: string
  contactName: string | null
  email: string | null
  phone: string | null
  totalOutstanding: string
  oldestInvoiceDate: string | null
  daysOverdue: number
  overdueInvoiceCount: number
  creditLimit: string | null
  lastAction: ChasingAction | null
  nextFollowUp: string | null
}

interface Summary {
  totalOverdue: string
  total30Plus: string
  total60Plus: string
  total90Plus: string
  customerCount: number
}

const ACTION_LABELS: Record<string, string> = {
  REMINDER_1: 'Reminder 1',
  REMINDER_2: 'Reminder 2',
  REMINDER_3: 'Reminder 3',
  FINAL_DEMAND: 'Final Demand',
  PHONE_CALL: 'Phone Call',
  ACCOUNT_ON_HOLD: 'On Hold',
  LEGAL_ACTION: 'Legal Action',
  WRITE_OFF: 'Write Off',
}

function getDaysOverdueBadge(days: number): string {
  if (days >= 90) return 'badge-danger'
  if (days >= 60) return 'text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700'
  if (days >= 30) return 'text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700'
  return 'badge-warning'
}

export default function CreditControlPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<OverdueCustomer[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [daysFilter, setDaysFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<'daysOverdue' | 'amount'>('daysOverdue')

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysFilter, sortBy])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (daysFilter) params.set('daysOverdue', daysFilter)
      if (search) params.set('search', search)
      params.set('sortBy', sortBy)

      const res = await fetch(`/api/finance/credit-control?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load credit control data')

      const data = await res.json()
      setCustomers(data.customers || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch() {
    fetchData()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      fetchData()
    }
  }

  const summaryCards = [
    {
      label: 'Total Overdue',
      value: summary?.totalOverdue ?? '0.00',
      icon: PoundSterling,
      color: 'text-red-600 bg-red-50',
      borderColor: 'border-red-200',
    },
    {
      label: '30+ Days Overdue',
      value: summary?.total30Plus ?? '0.00',
      icon: Clock,
      color: 'text-amber-600 bg-amber-50',
      borderColor: 'border-amber-200',
    },
    {
      label: '60+ Days Overdue',
      value: summary?.total60Plus ?? '0.00',
      icon: AlertTriangle,
      color: 'text-orange-600 bg-orange-50',
      borderColor: 'border-orange-200',
    },
    {
      label: '90+ Days Overdue',
      value: summary?.total90Plus ?? '0.00',
      icon: AlertOctagon,
      color: 'text-red-700 bg-red-100',
      borderColor: 'border-red-300',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credit Control</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor overdue accounts and manage debt chasing
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Users size={16} />
          <span>{summary?.customerCount ?? 0} customers with overdue invoices</span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-7 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))
          : summaryCards.map((card) => (
              <div key={card.label} className={cn('card p-5 border', card.borderColor)}>
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', card.color)}>
                    <card.icon size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{card.label}</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(card.value)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Days Overdue Filter */}
          <div>
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(e.target.value)}
              className="input"
            >
              <option value="">All Overdue</option>
              <option value="30">30+ Days</option>
              <option value="60">60+ Days</option>
              <option value="90">90+ Days</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <button
              onClick={() => setSortBy(sortBy === 'daysOverdue' ? 'amount' : 'daysOverdue')}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <ArrowUpDown size={16} />
              Sort: {sortBy === 'daysOverdue' ? 'Days Overdue' : 'Amount'}
            </button>
          </div>

          {/* Search button */}
          <button onClick={handleSearch} className="btn-primary">
            Search
          </button>
        </div>
      </div>

      {/* Customers Table */}
      {loading ? (
        <div className="card">
          <div className="animate-pulse p-6 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
              </div>
            ))}
          </div>
        </div>
      ) : customers.length === 0 ? (
        <div className="card p-12 text-center">
          <ShieldAlert size={40} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">No overdue accounts</h3>
          <p className="text-sm text-gray-500">
            {daysFilter || search
              ? 'No customers match the current filters. Try adjusting your search criteria.'
              : 'All customer accounts are up to date. No chasing action required.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header">Customer</th>
                  <th className="table-header text-right">Outstanding</th>
                  <th className="table-header">Oldest Invoice</th>
                  <th className="table-header text-center">Days Overdue</th>
                  <th className="table-header text-center">Invoices</th>
                  <th className="table-header text-right">Credit Limit</th>
                  <th className="table-header">Last Action</th>
                  <th className="table-header">Next Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr
                    key={customer.customerId}
                    className={cn(
                      'hover:bg-gray-50 cursor-pointer transition-colors',
                      customer.daysOverdue >= 90 && 'bg-red-50/30'
                    )}
                    onClick={() =>
                      router.push(`/finance/credit-control/${customer.customerId}`)
                    }
                  >
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-gray-900">{customer.customerName}</p>
                        <p className="text-xs text-gray-500">{customer.customerCode}</p>
                        {customer.contactName && (
                          <div className="flex items-center gap-2 mt-1">
                            {customer.phone && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Phone size={10} /> {customer.phone}
                              </span>
                            )}
                            {customer.email && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Mail size={10} /> {customer.email}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-right">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(customer.totalOutstanding)}
                      </span>
                    </td>
                    <td className="table-cell">
                      {customer.oldestInvoiceDate
                        ? formatDate(customer.oldestInvoiceDate)
                        : '-'}
                    </td>
                    <td className="table-cell text-center">
                      <span className={getDaysOverdueBadge(customer.daysOverdue)}>
                        {customer.daysOverdue} days
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      {customer.overdueInvoiceCount}
                    </td>
                    <td className="table-cell text-right">
                      {customer.creditLimit
                        ? formatCurrency(customer.creditLimit)
                        : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="table-cell">
                      {customer.lastAction ? (
                        <div>
                          <span className="badge-info">
                            {ACTION_LABELS[customer.lastAction.action] || customer.lastAction.action}
                          </span>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(customer.lastAction.date)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">None</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {customer.nextFollowUp ? (
                        <span
                          className={cn(
                            'text-sm',
                            new Date(customer.nextFollowUp) <= new Date()
                              ? 'text-red-600 font-medium'
                              : 'text-gray-600'
                          )}
                        >
                          {formatDate(customer.nextFollowUp)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
