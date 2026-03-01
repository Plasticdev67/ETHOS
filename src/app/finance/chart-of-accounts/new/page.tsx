'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

interface ParentAccount {
  id: string
  code: string
  name: string
  type: string
}

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const
const NORMAL_BALANCES = ['DEBIT', 'CREDIT'] as const

const typeToNormalBalance: Record<string, 'DEBIT' | 'CREDIT'> = {
  ASSET: 'DEBIT',
  LIABILITY: 'CREDIT',
  EQUITY: 'CREDIT',
  REVENUE: 'CREDIT',
  EXPENSE: 'DEBIT',
}

export default function NewAccountPage() {
  const router = useRouter()
  const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    code: '',
    name: '',
    type: '' as string,
    subType: '',
    normalBalance: '' as string,
    parentId: '',
    description: '',
    vatCode: '',
  })

  useEffect(() => {
    async function fetchParentAccounts() {
      try {
        const res = await fetch('/api/finance/accounts')
        if (!res.ok) throw new Error('Failed to load accounts')
        const json = await res.json()
        setParentAccounts(json)
      } catch {
        // Parent accounts are optional, don't block the form
      }
    }
    fetchParentAccounts()
  }, [])

  function handleTypeChange(type: string) {
    setForm((prev) => ({
      ...prev,
      type,
      normalBalance: typeToNormalBalance[type] || prev.normalBalance,
    }))
  }

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        type: form.type,
        subType: form.subType.trim() || null,
        normalBalance: form.normalBalance,
        parentId: form.parentId || null,
        description: form.description.trim() || null,
        vatCode: form.vatCode.trim() || null,
      }

      const res = await fetch('/api/finance/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create account')
      }

      router.push('/finance/chart-of-accounts')
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
          href="/finance/chart-of-accounts"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Chart of Accounts
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Account</h1>
        <p className="mt-1 text-sm text-gray-500">Add a new account to the chart of accounts</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Code */}
          <div>
            <label htmlFor="code" className="label">
              Account Code <span className="text-red-500">*</span>
            </label>
            <input
              id="code"
              type="text"
              required
              value={form.code}
              onChange={(e) => handleChange('code', e.target.value)}
              placeholder="e.g. 1001"
              className="input"
            />
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="label">
              Account Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Cash at Bank"
              className="input"
            />
          </div>

          {/* Type */}
          <div>
            <label htmlFor="type" className="label">
              Account Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              required
              value={form.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="input"
            >
              <option value="">Select type...</option>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Sub-Type */}
          <div>
            <label htmlFor="subType" className="label">
              Sub-Type
            </label>
            <input
              id="subType"
              type="text"
              value={form.subType}
              onChange={(e) => handleChange('subType', e.target.value)}
              placeholder="e.g. Current Asset, Fixed Asset"
              className="input"
            />
          </div>

          {/* Normal Balance */}
          <div>
            <label htmlFor="normalBalance" className="label">
              Normal Balance <span className="text-red-500">*</span>
            </label>
            <select
              id="normalBalance"
              required
              value={form.normalBalance}
              onChange={(e) => handleChange('normalBalance', e.target.value)}
              className="input"
            >
              <option value="">Select...</option>
              {NORMAL_BALANCES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {form.type && (
              <p className="mt-1 text-xs text-gray-400">
                Auto-set to {typeToNormalBalance[form.type]} for {form.type} accounts
              </p>
            )}
          </div>

          {/* Parent Account */}
          <div>
            <label htmlFor="parentId" className="label">
              Parent Account
            </label>
            <select
              id="parentId"
              value={form.parentId}
              onChange={(e) => handleChange('parentId', e.target.value)}
              className="input"
            >
              <option value="">None (top-level)</option>
              {parentAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* VAT Code */}
          <div>
            <label htmlFor="vatCode" className="label">
              VAT Code
            </label>
            <input
              id="vatCode"
              type="text"
              value={form.vatCode}
              onChange={(e) => handleChange('vatCode', e.target.value)}
              placeholder="e.g. S, Z, E"
              className="input"
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label htmlFor="description" className="label">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Optional description for this account"
              className="input"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
          <Link href="/finance/chart-of-accounts" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn-primary">
            <Save size={16} className="mr-2" />
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  )
}
