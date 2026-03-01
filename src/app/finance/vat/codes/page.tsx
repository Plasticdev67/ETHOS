'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Plus,
  Edit2,
  Tag,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react'

// --- Type definitions ---

interface VATCode {
  id: string
  code: string
  name: string
  rate: number
  hmrcBox: string | null
  isDefault: boolean
  isActive: boolean
  usageCount?: number
}

export default function VATCodesPage() {
  const [codes, setCodes] = useState<VATCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    fetchCodes()
  }, [])

  async function fetchCodes() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/finance/vat-codes')
      if (!res.ok) throw new Error('Failed to load VAT codes')
      const data = await res.json()
      setCodes(Array.isArray(data) ? data : data.codes || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(code: VATCode) {
    setTogglingId(code.id)
    setError(null)
    try {
      const res = await fetch(`/api/finance/vat-codes/${code.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !code.isActive }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update VAT code')
      }
      await fetchCodes()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle VAT code')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/finance/vat"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          VAT & MTD
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">VAT Codes</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage VAT tax codes used for journal entries and VAT return calculations
            </p>
          </div>
          <Link href="/finance/vat/codes/new" className="btn-primary">
            <Plus size={16} className="mr-2" />
            New VAT Code
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 animate-pulse space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 w-12 rounded bg-gray-200" />
                  <div className="h-4 w-32 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-12 rounded bg-gray-200" />
                  <div className="h-4 w-12 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-20 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : codes.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Code</th>
                  <th className="table-header">Name</th>
                  <th className="table-header text-right">Rate (%)</th>
                  <th className="table-header">HMRC Box</th>
                  <th className="table-header text-center">Default</th>
                  <th className="table-header text-center">Active</th>
                  <th className="table-header text-right">Usage Count</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {codes.map((code) => (
                  <tr
                    key={code.id}
                    className={cn(
                      'hover:bg-gray-50 transition-colors',
                      !code.isActive && 'opacity-60'
                    )}
                  >
                    <td className="table-cell">
                      <Link
                        href={`/finance/vat/codes/${code.id}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {code.code}
                      </Link>
                    </td>
                    <td className="table-cell">{code.name}</td>
                    <td className="table-cell text-right font-mono">{code.rate}%</td>
                    <td className="table-cell">
                      {code.hmrcBox ? (
                        <span className="badge-info">{code.hmrcBox}</span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="table-cell text-center">
                      {code.isDefault ? (
                        <span className="badge-success">Default</span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="table-cell text-center">
                      <button
                        onClick={() => handleToggleActive(code)}
                        disabled={togglingId === code.id}
                        className={cn(
                          'inline-flex items-center transition-colors',
                          code.isActive ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-500'
                        )}
                        title={code.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {togglingId === code.id ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : code.isActive ? (
                          <ToggleRight size={24} />
                        ) : (
                          <ToggleLeft size={24} />
                        )}
                      </button>
                    </td>
                    <td className="table-cell text-right font-mono text-gray-500">
                      {code.usageCount !== undefined ? code.usageCount : '--'}
                    </td>
                    <td className="table-cell">
                      <Link
                        href={`/finance/vat/codes/${code.id}`}
                        className="text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center">
              <Tag size={40} className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No VAT codes configured</p>
              <Link href="/finance/vat/codes/new" className="btn-primary mt-4 inline-flex">
                <Plus size={16} className="mr-2" />
                Create First VAT Code
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
