'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency, formatDate, formatDateISO } from '@/lib/utils'
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Send,
  X,
  Search,
  ChevronDown,
  User,
} from 'lucide-react'

interface Customer {
  id: string
  code: string
  name: string
  paymentTermsDays: number
  contactName: string | null
  email: string | null
}

interface VatCode {
  id: string
  code: string
  name: string
  rate: number
}

interface Account {
  id: string
  code: string
  name: string
}

interface InvoiceLine {
  description: string
  accountId: string
  quantity: number
  unitPrice: number
  net: number
  vatCodeId: string
  vatRate: number
  vatAmount: number
  gross: number
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export default function NewInvoicePage() {
  const router = useRouter()

  // Reference data
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vatCodes, setVatCodes] = useState<VatCode[]>([])
  const [revenueAccounts, setRevenueAccounts] = useState<Account[]>([])
  const [loadingRef, setLoadingRef] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [issueDate, setIssueDate] = useState(formatDateISO(new Date()))
  const [dueDate, setDueDate] = useState(formatDateISO(addDays(new Date(), 30)))
  const [projectId, setProjectId] = useState('')
  const [notes, setNotes] = useState('')

  // Invoice lines
  const [lines, setLines] = useState<InvoiceLine[]>([
    {
      description: '',
      accountId: '',
      quantity: 1,
      unitPrice: 0,
      net: 0,
      vatCodeId: '',
      vatRate: 0,
      vatAmount: 0,
      gross: 0,
    },
  ])

  // Fetch reference data
  useEffect(() => {
    async function fetchRefData() {
      try {
        setLoadingRef(true)

        const [custRes, vatRes, accRes] = await Promise.all([
          fetch('/api/finance/customers?active=true'),
          fetch('/api/finance/vat-codes'),
          fetch('/api/finance/accounts?type=REVENUE'),
        ])

        if (!custRes.ok) throw new Error('Failed to load customers')
        if (!vatRes.ok) throw new Error('Failed to load VAT codes')
        if (!accRes.ok) throw new Error('Failed to load revenue accounts')

        const custData = await custRes.json()
        const vatData = await vatRes.json()
        const accData = await accRes.json()

        setCustomers(Array.isArray(custData) ? custData : custData.customers || [])
        setVatCodes(Array.isArray(vatData) ? vatData : vatData.vatCodes || [])
        setRevenueAccounts(Array.isArray(accData) ? accData : accData.accounts || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoadingRef(false)
      }
    }

    fetchRefData()
  }, [])

  // Filter customers for dropdown
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(customerSearch.toLowerCase())
  )

  // Select customer
  function selectCustomer(cust: Customer) {
    setSelectedCustomer(cust)
    setCustomerSearch(cust.name)
    setShowCustomerDropdown(false)
    // Auto-calc due date from payment terms
    const issue = new Date(issueDate)
    const due = addDays(issue, cust.paymentTermsDays)
    setDueDate(formatDateISO(due))
  }

  // Recalculate line totals
  const recalcLine = useCallback(
    (line: InvoiceLine): InvoiceLine => {
      const net = Math.round(line.quantity * line.unitPrice * 100) / 100
      const vatCode = vatCodes.find((v) => v.id === line.vatCodeId)
      const vatRate = vatCode?.rate ?? line.vatRate
      const vatAmount = Math.round(net * (vatRate / 100) * 100) / 100
      const gross = Math.round((net + vatAmount) * 100) / 100
      return { ...line, net, vatRate, vatAmount, gross }
    },
    [vatCodes]
  )

  function updateLine(index: number, field: keyof InvoiceLine, value: string | number) {
    setLines((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      updated[index] = recalcLine(updated[index])
      return updated
    })
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        description: '',
        accountId: revenueAccounts[0]?.id || '',
        quantity: 1,
        unitPrice: 0,
        net: 0,
        vatCodeId: vatCodes[0]?.id || '',
        vatRate: vatCodes[0]?.rate || 0,
        vatAmount: 0,
        gross: 0,
      },
    ])
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  // Totals
  const totalNet = lines.reduce((sum, l) => sum + l.net, 0)
  const totalVat = lines.reduce((sum, l) => sum + l.vatAmount, 0)
  const totalGross = lines.reduce((sum, l) => sum + l.gross, 0)

  async function handleSubmit(asDraft: boolean) {
    if (!selectedCustomer) {
      setError('Please select a customer')
      return
    }

    const validLines = lines.filter((l) => l.description.trim() && l.net !== 0)
    if (validLines.length === 0) {
      setError('Please add at least one invoice line')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const body = {
        customerId: selectedCustomer.id,
        issueDate,
        dueDate,
        projectId: projectId.trim() || null,
        notes: notes.trim() || null,
        status: asDraft ? 'ACC_DRAFT' : 'ACC_APPROVED',
        lines: validLines.map((l) => ({
          description: l.description.trim(),
          accountId: l.accountId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          vatCodeId: l.vatCodeId,
        })),
      }

      const res = await fetch('/api/finance/sales-ledger/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to create invoice')
      }

      const invoice = await res.json()
      router.push(`/finance/sales/${invoice.id}`)
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
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded" />
                ))}
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
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
        <Link href="/finance/sales" className="hover:text-gray-700">Sales Ledger</Link>
        <span>/</span>
        <span className="text-gray-900">New Invoice</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <FileText size={20} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">New Sales Invoice</h1>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Invoice Header Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Customer Select */}
          <div className="sm:col-span-2 relative">
            <label className="label">
              Customer <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="input pl-9 w-full"
                placeholder="Search customers..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  setShowCustomerDropdown(true)
                  if (!e.target.value) setSelectedCustomer(null)
                }}
                onFocus={() => setShowCustomerDropdown(true)}
              />
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            {showCustomerDropdown && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No customers found</div>
                ) : (
                  filteredCustomers.map((cust) => (
                    <button
                      key={cust.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex items-center gap-2 border-b border-gray-100 last:border-0"
                      onClick={() => selectCustomer(cust)}
                    >
                      <User size={14} className="text-gray-400 shrink-0" />
                      <div>
                        <span className="font-medium">{cust.name}</span>
                        <span className="text-gray-400 ml-2 font-mono text-xs">{cust.code}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Issue Date */}
          <div>
            <label className="label">Issue Date</label>
            <input
              type="date"
              className="input w-full"
              value={issueDate}
              onChange={(e) => {
                setIssueDate(e.target.value)
                if (selectedCustomer) {
                  const due = addDays(new Date(e.target.value), selectedCustomer.paymentTermsDays)
                  setDueDate(formatDateISO(due))
                }
              }}
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="label">Due Date</label>
            <input
              type="date"
              className="input w-full"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Project ID */}
          <div>
            <label className="label">Project ID</label>
            <input
              type="text"
              className="input w-full"
              placeholder="Optional"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="label">Notes</label>
            <textarea
              className="input w-full"
              placeholder="Optional notes to appear on the invoice"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Selected Customer Info */}
        {selectedCustomer && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-blue-600 font-medium">{selectedCustomer.name}</span>
                <span className="text-blue-400 ml-2 font-mono text-xs">{selectedCustomer.code}</span>
              </div>
              {selectedCustomer.contactName && (
                <span className="text-blue-500">Contact: {selectedCustomer.contactName}</span>
              )}
              <span className="text-blue-500">
                Payment Terms: {selectedCustomer.paymentTermsDays} days
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Lines */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Invoice Lines</h2>
          <button
            type="button"
            onClick={addLine}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <Plus size={14} />
            Add Line
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header w-10">#</th>
                <th className="table-header">Description</th>
                <th className="table-header">Revenue Account</th>
                <th className="table-header w-20 text-right">Qty</th>
                <th className="table-header w-28 text-right">Unit Price</th>
                <th className="table-header w-28 text-right">Net</th>
                <th className="table-header">VAT Code</th>
                <th className="table-header w-28 text-right">VAT</th>
                <th className="table-header w-28 text-right">Gross</th>
                <th className="table-header w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lines.map((line, index) => (
                <tr key={index} className="group">
                  <td className="table-cell text-center text-gray-400">{index + 1}</td>
                  <td className="table-cell">
                    <input
                      type="text"
                      className="input w-full min-w-[200px]"
                      placeholder="Line description"
                      value={line.description}
                      onChange={(e) => updateLine(index, 'description', e.target.value)}
                    />
                  </td>
                  <td className="table-cell">
                    <select
                      className="input w-full min-w-[160px]"
                      value={line.accountId}
                      onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                    >
                      <option value="">Select account</option>
                      {revenueAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="table-cell">
                    <input
                      type="number"
                      className="input w-full text-right"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="table-cell">
                    <input
                      type="number"
                      className="input w-full text-right"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(index, 'unitPrice', Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="table-cell text-right font-medium">
                    {formatCurrency(line.net)}
                  </td>
                  <td className="table-cell">
                    <select
                      className="input w-full min-w-[140px]"
                      value={line.vatCodeId}
                      onChange={(e) => updateLine(index, 'vatCodeId', e.target.value)}
                    >
                      <option value="">No VAT</option>
                      {vatCodes.map((vc) => (
                        <option key={vc.id} value={vc.id}>
                          {vc.code} ({vc.rate}%)
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="table-cell text-right">{formatCurrency(line.vatAmount)}</td>
                  <td className="table-cell text-right font-medium">
                    {formatCurrency(line.gross)}
                  </td>
                  <td className="table-cell text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={lines.length <= 1}
                      className={cn(
                        'p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors',
                        lines.length <= 1 && 'opacity-30 cursor-not-allowed'
                      )}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-300 bg-gray-50">
              <tr>
                <td colSpan={5} className="table-cell text-right font-semibold text-gray-700">
                  Totals
                </td>
                <td className="table-cell text-right font-semibold">
                  {formatCurrency(totalNet)}
                </td>
                <td className="table-cell" />
                <td className="table-cell text-right font-semibold">
                  {formatCurrency(totalVat)}
                </td>
                <td className="table-cell text-right font-semibold">
                  {formatCurrency(totalGross)}
                </td>
                <td className="table-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Totals Panel */}
      <div className="flex justify-end">
        <div className="card p-6 w-full max-w-sm">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(totalNet)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">VAT</span>
              <span className="font-medium">{formatCurrency(totalVat)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="text-base font-semibold text-gray-900">Total</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(totalGross)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pb-8">
        <Link href="/finance/sales" className="btn-ghost inline-flex items-center gap-2">
          <X size={16} />
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={saving}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={saving}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Send size={16} />
          {saving ? 'Saving...' : 'Submit Invoice'}
        </button>
      </div>
    </div>
  )
}
