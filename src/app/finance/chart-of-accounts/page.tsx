'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { cn, formatDate } from '@/lib/utils'
import { Plus, Search, ChevronRight, ChevronDown, ToggleLeft, ToggleRight } from 'lucide-react'

interface Account {
  id: string
  code: string
  name: string
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  subType: string | null
  normalBalance: 'DEBIT' | 'CREDIT'
  isActive: boolean
  parentId: string | null
  children?: Account[]
}

const typeBadge: Record<string, string> = {
  ASSET: 'badge-info',
  LIABILITY: 'badge-warning',
  EQUITY: 'badge-success',
  REVENUE: 'badge-success',
  EXPENSE: 'badge-danger',
}

const typeFilters = ['All', 'Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses'] as const
const typeMap: Record<string, string> = {
  Assets: 'ASSET',
  Liabilities: 'LIABILITY',
  Equity: 'EQUITY',
  Revenue: 'REVENUE',
  Expenses: 'EXPENSE',
}

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('All')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAccounts()
  }, [])

  async function fetchAccounts() {
    try {
      setLoading(true)
      const res = await fetch('/api/finance/accounts')
      if (!res.ok) throw new Error('Failed to load accounts')
      const json = await res.json()
      setAccounts(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function toggleAccountStatus(account: Account) {
    setTogglingId(account.id)
    try {
      const res = await fetch(`/api/finance/accounts/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !account.isActive }),
      })
      if (!res.ok) throw new Error('Failed to update account')
      setAccounts((prev) =>
        prev.map((a) => (a.id === account.id ? { ...a, isActive: !a.isActive } : a))
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle status')
    } finally {
      setTogglingId(null)
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const filteredAccounts = useMemo(() => {
    let filtered = accounts

    // Apply type filter
    if (activeFilter !== 'All') {
      const typeValue = typeMap[activeFilter]
      filtered = filtered.filter((a) => a.type === typeValue)
    }

    // Apply search filter
    if (search.trim()) {
      const term = search.toLowerCase()
      filtered = filtered.filter(
        (a) =>
          a.code.toLowerCase().includes(term) ||
          a.name.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [accounts, activeFilter, search])

  // Build parent/child hierarchy
  const topLevel = useMemo(() => {
    return filteredAccounts.filter((a) => !a.parentId)
  }, [filteredAccounts])

  const childrenMap = useMemo(() => {
    const map: Record<string, Account[]> = {}
    filteredAccounts.forEach((a) => {
      if (a.parentId) {
        if (!map[a.parentId]) map[a.parentId] = []
        map[a.parentId].push(a)
      }
    })
    return map
  }, [filteredAccounts])

  function renderRow(account: Account, depth: number = 0) {
    const hasChildren = (childrenMap[account.id]?.length || 0) > 0
    const isExpanded = expandedIds.has(account.id)

    return (
      <tbody key={account.id}>
        <tr
          className={cn(
            'hover:bg-gray-50 transition-colors cursor-pointer',
            !account.isActive && 'opacity-60'
          )}
          onClick={() => hasChildren && toggleExpand(account.id)}
        >
          <td className="table-cell">
            <div className="flex items-center" style={{ paddingLeft: `${depth * 24}px` }}>
              {hasChildren ? (
                <button className="mr-2 text-gray-400 hover:text-gray-600">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              ) : (
                <span className="mr-2 w-4" />
              )}
              <span className="font-mono font-medium">{account.code}</span>
            </div>
          </td>
          <td className="table-cell font-medium">{account.name}</td>
          <td className="table-cell">
            <span className={typeBadge[account.type] || 'badge-gray'}>{account.type}</span>
          </td>
          <td className="table-cell text-gray-500">{account.subType || '—'}</td>
          <td className="table-cell">
            <span className="font-mono text-xs">{account.normalBalance}</span>
          </td>
          <td className="table-cell">
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleAccountStatus(account)
              }}
              disabled={togglingId === account.id}
              className="flex items-center gap-1.5 text-sm"
              title={account.isActive ? 'Click to deactivate' : 'Click to activate'}
            >
              {account.isActive ? (
                <>
                  <ToggleRight size={20} className="text-green-600" />
                  <span className="text-green-700">Active</span>
                </>
              ) : (
                <>
                  <ToggleLeft size={20} className="text-gray-400" />
                  <span className="text-gray-500">Inactive</span>
                </>
              )}
            </button>
          </td>
          <td className="table-cell">
            <Link
              href={`/finance/chart-of-accounts/${account.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit
            </Link>
          </td>
        </tr>
        {isExpanded &&
          childrenMap[account.id]?.map((child) => renderRow(child, depth + 1))}
      </tbody>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Loading...' : `${filteredAccounts.length} account${filteredAccounts.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link href="/finance/chart-of-accounts/new" className="btn-primary">
          <Plus size={16} className="mr-2" />
          Add Account
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-4 flex items-center gap-1 border-b border-gray-200">
        {typeFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeFilter === filter
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 animate-pulse space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 w-20 rounded bg-gray-200" />
                  <div className="h-4 flex-1 rounded bg-gray-200" />
                  <div className="h-4 w-20 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : filteredAccounts.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Code</th>
                  <th className="table-header">Name</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Sub-Type</th>
                  <th className="table-header">Normal Balance</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              {topLevel.map((account) => renderRow(account))}
            </table>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">No accounts found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
