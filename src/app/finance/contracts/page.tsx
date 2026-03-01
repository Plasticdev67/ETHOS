'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency } from '@/lib/utils'
import {
  Plus,
  Search,
  Building2,
  TrendingUp,
  ShieldCheck,
  Clock,
  FileText,
} from 'lucide-react'

interface Contract {
  id: string
  contractRef: string
  clientName: string
  contractType: 'FINANCE_NEC' | 'FINANCE_JCT' | 'FINANCE_BESPOKE'
  originalValue: number
  currentValue: number
  certifiedToDate: number
  retentionHeld: number
  status: 'CONTRACT_DRAFT' | 'CONTRACT_ACTIVE' | 'PRACTICAL_COMPLETION' | 'DEFECTS_LIABILITY' | 'FINAL_ACCOUNT' | 'CLOSED'
}

interface ContractSummary {
  totalActiveContracts: number
  totalContractValue: number
  certifiedToDate: number
  retentionHeld: number
  outstandingApplications: number
}

interface ContractsResponse {
  contracts: Contract[]
  summary: ContractSummary
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const STATUS_OPTIONS = [
  'All',
  'CONTRACT_DRAFT',
  'CONTRACT_ACTIVE',
  'PRACTICAL_COMPLETION',
  'DEFECTS_LIABILITY',
  'FINAL_ACCOUNT',
  'CLOSED',
]

const statusBadgeMap: Record<string, string> = {
  CONTRACT_DRAFT: 'badge-gray',
  CONTRACT_ACTIVE: 'badge-success',
  PRACTICAL_COMPLETION: 'badge-info',
  DEFECTS_LIABILITY: 'badge-warning',
  FINAL_ACCOUNT: 'badge-warning',
  CLOSED: 'badge-gray',
}

const statusLabel: Record<string, string> = {
  CONTRACT_DRAFT: 'Draft',
  CONTRACT_ACTIVE: 'Active',
  PRACTICAL_COMPLETION: 'Practical Completion',
  DEFECTS_LIABILITY: 'Defects Liability',
  FINAL_ACCOUNT: 'Final Account',
  CLOSED: 'Closed',
}

const typeBadgeMap: Record<string, string> = {
  FINANCE_NEC: 'badge-info',
  FINANCE_JCT: 'badge-success',
  FINANCE_BESPOKE: 'badge-warning',
}

export default function ContractsPage() {
  const router = useRouter()
  const [data, setData] = useState<ContractsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [status, setStatus] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchContracts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search])

  async function fetchContracts() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (status !== 'All') params.set('status', status)
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/finance/contracts?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load contracts')
      const json = await res.json()
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const contracts = data?.contracts || []
  const summary = data?.summary

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Construction Contracts</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Loading...' : `${data?.total || 0} contracts`}
          </p>
        </div>
        <Link href="/finance/contracts/new" className="btn-primary">
          <Plus size={16} className="mr-2" />
          New Contract
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Bar */}
      {summary && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Active Contracts</p>
                <p className="text-lg font-bold text-gray-900">{summary.totalActiveContracts}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Total Contract Value</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(summary.totalContractValue)}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Certified to Date</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(summary.certifiedToDate)}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Retention Held</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(summary.retentionHeld)}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Outstanding Apps</p>
                <p className="text-lg font-bold text-gray-900">{summary.outstandingApplications}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 card p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All Statuses' : statusLabel[s] || s}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="label">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by contract ref, client name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 animate-pulse space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 w-20 rounded bg-gray-200" />
                  <div className="h-4 w-32 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : contracts.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Contract Ref</th>
                  <th className="table-header">Client</th>
                  <th className="table-header">Type</th>
                  <th className="table-header text-right">Original Value</th>
                  <th className="table-header text-right">Current Value</th>
                  <th className="table-header text-right">Certified to Date</th>
                  <th className="table-header text-right">Retention Held</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contracts.map((contract) => {
                  const hasVariations = contract.currentValue !== contract.originalValue
                  return (
                    <tr
                      key={contract.id}
                      onClick={() => router.push(`/finance/contracts/${contract.id}`)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="table-cell">
                        <span className="font-medium text-blue-600">{contract.contractRef}</span>
                      </td>
                      <td className="table-cell">{contract.clientName}</td>
                      <td className="table-cell">
                        <span className={typeBadgeMap[contract.contractType] || 'badge-gray'}>
                          {contract.contractType}
                        </span>
                      </td>
                      <td className="table-cell text-right font-mono">
                        {formatCurrency(contract.originalValue)}
                      </td>
                      <td className="table-cell text-right font-mono">
                        <span className={cn(hasVariations && 'text-blue-600')}>
                          {formatCurrency(contract.currentValue)}
                        </span>
                        {hasVariations && (
                          <span className="ml-1 text-xs text-blue-500">
                            ({contract.currentValue > contract.originalValue ? '+' : ''}
                            {formatCurrency(contract.currentValue - contract.originalValue)})
                          </span>
                        )}
                      </td>
                      <td className="table-cell text-right font-mono">
                        {formatCurrency(contract.certifiedToDate)}
                      </td>
                      <td className="table-cell text-right font-mono">
                        {formatCurrency(contract.retentionHeld)}
                      </td>
                      <td className="table-cell">
                        <span className={statusBadgeMap[contract.status] || 'badge-gray'}>
                          {statusLabel[contract.status] || contract.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center">
              <FileText size={40} className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No contracts found</p>
              <Link href="/finance/contracts/new" className="btn-primary mt-4 inline-flex">
                <Plus size={16} className="mr-2" />
                Create Contract
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
