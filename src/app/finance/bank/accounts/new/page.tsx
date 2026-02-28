'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency } from '@/lib/utils'
import {
  Building2,
  Save,
  X,
  Loader2,
} from 'lucide-react'

interface GLAccount {
  id: string
  code: string
  name: string
  type: string
}

export default function NewBankAccountPage() {
  const router = useRouter()

  const [glAccounts, setGlAccounts] = useState<GLAccount[]>([])
  const [loadingRef, setLoadingRef] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [sortCode, setSortCode] = useState('')
  const [glAccountId, setGlAccountId] = useState('')
  const [currency, setCurrency] = useState('GBP')
  const [openingBalance, setOpeningBalance] = useState<number>(0)

  // Fetch GL accounts (ASSET type for bank accounts)
  useEffect(() => {
    async function fetchRefData() {
      try {
        setLoadingRef(true)
        const res = await fetch('/api/finance/accounts?type=ASSET')
        if (!res.ok) throw new Error('Failed to load GL accounts')
        const data = await res.json()
        const accountsList = Array.isArray(data) ? data : data.accounts || data.data || []
        setGlAccounts(accountsList)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoadingRef(false)
      }
    }

    fetchRefData()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!accountName.trim()) {
      setError('Account name is required')
      return
    }
    if (!accountNumber.trim()) {
      setError('Account number is required')
      return
    }
    if (!sortCode.trim()) {
      setError('Sort code is required')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const body = {
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        sortCode: sortCode.trim(),
        glAccountId: glAccountId || null,
        currency,
        openingBalance,
      }

      const res = await fetch('/api/finance/bank/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to create bank account')
      }

      const account = await res.json()
      router.push(`/finance/bank/accounts/${account.id}`)
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
              {Array.from({ length: 5 }).map((_, i) => (
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
        <span className="text-gray-900">New Account</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
          <Building2 size={20} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">New Bank Account</h1>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Account Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Account Name */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">
                Account Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. Business Current Account"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="label">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. 12345678"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
              />
            </div>

            {/* Sort Code */}
            <div>
              <label className="label">
                Sort Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. 12-34-56"
                value={sortCode}
                onChange={(e) => setSortCode(e.target.value)}
                required
              />
            </div>

            {/* Currency */}
            <div>
              <label className="label">Currency</label>
              <input
                type="text"
                className="input w-full bg-gray-50"
                value={currency}
                disabled
              />
              <p className="text-xs text-gray-400 mt-1">
                Multi-currency support coming soon
              </p>
            </div>

            {/* GL Account */}
            <div className="sm:col-span-2">
              <label className="label">Linked GL Account</label>
              <select
                className="input w-full"
                value={glAccountId}
                onChange={(e) => setGlAccountId(e.target.value)}
              >
                <option value="">Select GL account (optional)</option>
                {glAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                The asset account this bank account maps to in the chart of
                accounts
              </p>
            </div>

            {/* Opening Balance */}
            <div>
              <label className="label">Opening Balance</label>
              <input
                type="number"
                className="input w-full"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
                step="0.01"
                min="0"
              />
              <p className="text-xs text-gray-400 mt-1">
                Balance as of the date you start using this account
              </p>
            </div>
          </div>
        </div>

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
            disabled={saving}
            className="btn-primary inline-flex items-center gap-2"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  )
}
