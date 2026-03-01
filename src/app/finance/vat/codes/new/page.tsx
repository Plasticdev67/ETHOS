'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Save } from 'lucide-react'

const HMRC_BOXES = [
  { value: '', label: 'None' },
  { value: '1', label: 'Box 1 - VAT due on sales' },
  { value: '2', label: 'Box 2 - VAT due on EU acquisitions' },
  { value: '3', label: 'Box 3 - Total VAT due' },
  { value: '4', label: 'Box 4 - VAT reclaimed on purchases' },
  { value: '5', label: 'Box 5 - Net VAT to pay/reclaim' },
  { value: '6', label: 'Box 6 - Total sales ex VAT' },
  { value: '7', label: 'Box 7 - Total purchases ex VAT' },
  { value: '8', label: 'Box 8 - EU supplies' },
  { value: '9', label: 'Box 9 - EU acquisitions' },
]

export default function NewVATCodePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    code: '',
    name: '',
    rate: '',
    hmrcBox: '',
    isDefault: false,
  })

  function handleChange(field: string, value: string | boolean) {
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
        rate: parseFloat(form.rate),
        hmrcBox: form.hmrcBox || null,
        isDefault: form.isDefault,
      }

      if (!payload.code) throw new Error('VAT code is required')
      if (!payload.name) throw new Error('Name is required')
      if (isNaN(payload.rate) || payload.rate < 0) throw new Error('A valid rate is required')

      const res = await fetch('/api/finance/vat-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create VAT code')
      }

      router.push('/finance/vat/codes')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
          <Link href="/finance/vat" className="hover:text-gray-700">VAT & MTD</Link>
          <span>/</span>
          <Link href="/finance/vat/codes" className="hover:text-gray-700">VAT Codes</Link>
          <span>/</span>
          <span className="text-gray-900">New</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">New VAT Code</h1>
        <p className="mt-1 text-sm text-gray-500">Create a new VAT tax code for use in transactions</p>
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
              VAT Code <span className="text-red-500">*</span>
            </label>
            <input
              id="code"
              type="text"
              required
              value={form.code}
              onChange={(e) => handleChange('code', e.target.value)}
              placeholder="e.g. T10"
              className="input"
            />
            <p className="mt-1 text-xs text-gray-400">A short identifier like T0, T1, T10, T20</p>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="label">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Standard Rate"
              className="input"
            />
          </div>

          {/* Rate */}
          <div>
            <label htmlFor="rate" className="label">
              Rate (%) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={form.rate}
                onChange={(e) => handleChange('rate', e.target.value)}
                placeholder="e.g. 20"
                className="input pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>

          {/* HMRC Box */}
          <div>
            <label htmlFor="hmrcBox" className="label">
              HMRC Box
            </label>
            <select
              id="hmrcBox"
              value={form.hmrcBox}
              onChange={(e) => handleChange('hmrcBox', e.target.value)}
              className="input"
            >
              {HMRC_BOXES.map((box) => (
                <option key={box.value} value={box.value}>
                  {box.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Which VAT return box this code contributes to
            </p>
          </div>

          {/* Is Default */}
          <div className="sm:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => handleChange('isDefault', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Set as default VAT code</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  This code will be pre-selected when creating new journal lines
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
          <Link href="/finance/vat/codes" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn-primary">
            <Save size={16} className="mr-2" />
            {loading ? 'Creating...' : 'Create VAT Code'}
          </button>
        </div>
      </form>
    </div>
  )
}
