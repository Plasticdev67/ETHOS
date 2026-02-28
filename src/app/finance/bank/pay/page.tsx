'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency, formatDate, formatDateISO } from '@/lib/utils'
import {
  ArrowUpRight,
  Search,
  ChevronDown,
  Truck,
  Loader2,
  X,
  CheckCircle2,
  FileText,
  Building2,
} from 'lucide-react'

interface BankAccount {
  id: string
  accountName: string
  accountNumber: string
  sortCode: string
  currentBalance: number
}

interface Supplier {
  id: string
  code: string
  name: string
  contactName: string | null
  email: string | null
}

interface OutstandingInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  total: number
  paidAmount: number
  outstandingAmount: number
  status: string
}

interface AllocationLine {
  invoiceId: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  total: number
  paidAmount: number
  outstandingAmount: number
  allocateAmount: number
}

export default function MakePaymentPage() {
  const router = useRouter()

  // Reference data
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingRef, setLoadingRef] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Supplier search
  const [supplierSearch, setSupplierSearch] = useState('')
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)

  // Form state
  const [bankAccountId, setBankAccountId] = useState('')
  const [paymentDate, setPaymentDate] = useState(formatDateISO(new Date()))
  const [reference, setReference] = useState('')
  const [totalAmount, setTotalAmount] = useState<number>(0)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  // Invoice allocation
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [allocations, setAllocations] = useState<AllocationLine[]>([])

  // Fetch reference data
  useEffect(() => {
    async function fetchRefData() {
      try {
        setLoadingRef(true)
        setError(null)

        const [bankRes, supRes] = await Promise.all([
          fetch('/api/finance/bank/accounts'),
          fetch('/api/finance/suppliers'),
        ])

        if (!bankRes.ok) throw new Error('Failed to load bank accounts')
        if (!supRes.ok) throw new Error('Failed to load suppliers')

        const bankData = await bankRes.json()
        const supData = await supRes.json()

        const bankList = Array.isArray(bankData) ? bankData : bankData.data || []
        const supList = Array.isArray(supData) ? supData : supData.data || []

        setBankAccounts(bankList)
        setSuppliers(supList)

        // Auto-select first bank account
        if (bankList.length > 0) {
          setBankAccountId(bankList[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoadingRef(false)
      }
    }

    fetchRefData()
  }, [])

  // Filter suppliers for dropdown
  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      s.code.toLowerCase().includes(supplierSearch.toLowerCase())
  )

  // Select supplier and fetch their outstanding invoices
  async function selectSupplier(sup: Supplier) {
    setSelectedSupplier(sup)
    setSupplierSearch(sup.name)
    setShowSupplierDropdown(false)
    setAllocations([])

    try {
      setLoadingInvoices(true)
      const res = await fetch(
        `/api/finance/purchase-invoices?supplierId=${sup.id}&status=ACC_POSTED&status=PARTIALLY_PAID&isCreditNote=false`
      )
      if (!res.ok) throw new Error('Failed to load outstanding invoices')

      const data = await res.json()
      const invoices: OutstandingInvoice[] = Array.isArray(data)
        ? data
        : data.data || []

      setAllocations(
        invoices.map((inv) => ({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          dueDate: inv.dueDate,
          total: inv.total,
          paidAmount: inv.paidAmount,
          outstandingAmount: inv.outstandingAmount,
          allocateAmount: 0,
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices')
    } finally {
      setLoadingInvoices(false)
    }
  }

  // Update allocation amount for a specific invoice
  function updateAllocation(index: number, amount: number) {
    setAllocations((prev) => {
      const updated = [...prev]
      const maxAmount = updated[index].outstandingAmount
      updated[index] = {
        ...updated[index],
        allocateAmount: Math.min(Math.max(0, amount), maxAmount),
      }
      return updated
    })
  }

  // Allocate All - fills oldest invoices first
  function allocateAll() {
    let remaining = totalAmount
    setAllocations((prev) => {
      // Sort by invoice date ascending (oldest first)
      const sorted = [...prev].sort(
        (a, b) =>
          new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
      )

      const updated = sorted.map((alloc) => {
        if (remaining <= 0) return { ...alloc, allocateAmount: 0 }
        const toAllocate = Math.min(remaining, alloc.outstandingAmount)
        remaining -= toAllocate
        return {
          ...alloc,
          allocateAmount: Math.round(toAllocate * 100) / 100,
        }
      })

      // Restore original order
      return prev.map((original) => {
        const match = updated.find((u) => u.invoiceId === original.invoiceId)
        return match || original
      })
    })
  }

  // Clear all allocations
  function clearAllocations() {
    setAllocations((prev) =>
      prev.map((a) => ({ ...a, allocateAmount: 0 }))
    )
  }

  // Totals
  const totalAllocated = useMemo(
    () =>
      Math.round(
        allocations.reduce((sum, a) => sum + a.allocateAmount, 0) * 100
      ) / 100,
    [allocations]
  )
  const unallocated = Math.round((totalAmount - totalAllocated) * 100) / 100

  // Selected bank account name
  const selectedBank = bankAccounts.find((b) => b.id === bankAccountId)

  // Submit payment
  async function handleSubmit() {
    if (!bankAccountId) {
      setError('Please select a bank account')
      return
    }
    if (!totalAmount || totalAmount <= 0) {
      setError('Please enter a valid payment amount')
      return
    }
    if (!selectedSupplier) {
      setError('Please select a supplier')
      return
    }

    const validAllocations = allocations.filter((a) => a.allocateAmount > 0)

    if (totalAllocated > totalAmount) {
      setError('Total allocated cannot exceed the payment amount')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const body = {
        bankAccountId,
        date: paymentDate,
        reference: reference.trim(),
        description: `Payment to ${selectedSupplier.name}`,
        totalAmount,
        allocations: validAllocations.map((a) => ({
          purchaseInvoiceId: a.invoiceId,
          amount: a.allocateAmount,
        })),
      }

      const res = await fetch('/api/finance/bank/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to record payment')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/finance/bank/accounts/${bankAccountId}`)
      }, 1000)
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
              {Array.from({ length: 4 }).map((_, i) => (
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
        <span className="text-gray-900">Make Payment</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
          <ArrowUpRight size={20} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Make Supplier Payment
        </h1>
      </div>

      {/* Success */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-600" />
          <p className="text-sm text-green-800 font-medium">
            Payment recorded successfully. Redirecting...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Section 1: Payment Details */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Payment Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Bank Account */}
          <div className="sm:col-span-2">
            <label className="label">
              Bank Account <span className="text-red-500">*</span>
            </label>
            <select
              className="input w-full"
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
            >
              <option value="">Select bank account</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountName} ({acc.sortCode} / {acc.accountNumber}) -{' '}
                  {formatCurrency(acc.currentBalance)}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="label">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="input w-full"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          {/* Reference */}
          <div>
            <label className="label">Reference</label>
            <input
              type="text"
              className="input w-full"
              placeholder="e.g. BACS-67890"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {/* Total Amount */}
          <div>
            <label className="label">
              Total Amount to Pay <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className="input w-full"
              placeholder="0.00"
              value={totalAmount || ''}
              onChange={(e) => setTotalAmount(Number(e.target.value))}
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Supplier Selection & Invoice Allocation */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Supplier & Invoice Allocation
        </h2>

        {/* Supplier Search */}
        <div className="relative mb-6">
          <label className="label">
            Supplier <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              className="input pl-9 w-full"
              placeholder="Search suppliers by name or code..."
              value={supplierSearch}
              onChange={(e) => {
                setSupplierSearch(e.target.value)
                setShowSupplierDropdown(true)
                if (!e.target.value) {
                  setSelectedSupplier(null)
                  setAllocations([])
                }
              }}
              onFocus={() => setShowSupplierDropdown(true)}
            />
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
          {showSupplierDropdown && !selectedSupplier && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredSuppliers.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">
                  No suppliers found
                </div>
              ) : (
                filteredSuppliers.map((sup) => (
                  <button
                    key={sup.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex items-center gap-2 border-b border-gray-100 last:border-0"
                    onClick={() => selectSupplier(sup)}
                  >
                    <Truck size={14} className="text-gray-400 shrink-0" />
                    <div>
                      <span className="font-medium">{sup.name}</span>
                      <span className="text-gray-400 ml-2 font-mono text-xs">
                        {sup.code}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected Supplier Info */}
        {selectedSupplier && (
          <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-100 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-orange-600 font-medium">
                {selectedSupplier.name}
              </span>
              <span className="text-orange-400 font-mono text-xs">
                {selectedSupplier.code}
              </span>
              {selectedSupplier.contactName && (
                <span className="text-orange-500">
                  Contact: {selectedSupplier.contactName}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedSupplier(null)
                setSupplierSearch('')
                setAllocations([])
              }}
              className="text-orange-400 hover:text-orange-600"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Outstanding Invoices Table */}
        {loadingInvoices && (
          <div className="flex items-center gap-2 py-8 justify-center text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading outstanding invoices...</span>
          </div>
        )}

        {selectedSupplier && !loadingInvoices && allocations.length === 0 && (
          <div className="py-8 text-center">
            <FileText size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">
              No outstanding invoices found for this supplier.
            </p>
          </div>
        )}

        {allocations.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">
                {allocations.length} outstanding invoice
                {allocations.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={allocateAll}
                  disabled={!totalAmount || totalAmount <= 0}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Allocate All
                </button>
                <button
                  type="button"
                  onClick={clearAllocations}
                  className="btn-ghost text-sm"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="table-header">Invoice #</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Due Date</th>
                    <th className="table-header text-right">Total</th>
                    <th className="table-header text-right">Paid</th>
                    <th className="table-header text-right">Outstanding</th>
                    <th className="table-header text-right">Allocate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allocations.map((alloc, index) => (
                    <tr
                      key={alloc.invoiceId}
                      className={cn(
                        'hover:bg-gray-50',
                        alloc.allocateAmount > 0 && 'bg-orange-50'
                      )}
                    >
                      <td className="table-cell">
                        <span className="text-blue-600 font-medium">
                          {alloc.invoiceNumber}
                        </span>
                      </td>
                      <td className="table-cell">
                        {formatDate(alloc.invoiceDate)}
                      </td>
                      <td className="table-cell">
                        {formatDate(alloc.dueDate)}
                      </td>
                      <td className="table-cell text-right">
                        {formatCurrency(alloc.total)}
                      </td>
                      <td className="table-cell text-right">
                        {formatCurrency(alloc.paidAmount)}
                      </td>
                      <td className="table-cell text-right font-medium">
                        {formatCurrency(alloc.outstandingAmount)}
                      </td>
                      <td className="table-cell">
                        <input
                          type="number"
                          className="input w-28 text-right ml-auto block"
                          value={alloc.allocateAmount || ''}
                          onChange={(e) =>
                            updateAllocation(index, Number(e.target.value))
                          }
                          min="0"
                          max={alloc.outstandingAmount}
                          step="0.01"
                          placeholder="0.00"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                  <tr>
                    <td
                      colSpan={6}
                      className="table-cell text-right font-semibold text-gray-700"
                    >
                      Total Allocated
                    </td>
                    <td className="table-cell text-right font-semibold">
                      {formatCurrency(totalAllocated)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Running Totals */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Total Amount</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total Allocated</p>
                  <p className="text-lg font-bold text-orange-600">
                    {formatCurrency(totalAllocated)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Unallocated</p>
                  <p
                    className={cn(
                      'text-lg font-bold',
                      unallocated > 0
                        ? 'text-yellow-600'
                        : unallocated < 0
                          ? 'text-red-600'
                          : 'text-gray-400'
                    )}
                  >
                    {formatCurrency(unallocated)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Section 3: Journal Preview */}
      {totalAmount > 0 && selectedSupplier && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Journal Preview
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            The following journal entry will be created:
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header">Account</th>
                  <th className="table-header text-right">Debit</th>
                  <th className="table-header text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {totalAllocated > 0 && (
                  <tr>
                    <td className="table-cell font-medium">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-gray-400" />
                        Trade Creditors
                      </div>
                    </td>
                    <td className="table-cell text-right font-medium text-green-600">
                      {formatCurrency(totalAllocated)}
                    </td>
                    <td className="table-cell text-right">-</td>
                  </tr>
                )}
                {unallocated > 0 && (
                  <tr className="bg-yellow-50">
                    <td className="table-cell font-medium text-yellow-700">
                      Unallocated / On Account
                    </td>
                    <td className="table-cell text-right font-medium text-yellow-700">
                      {formatCurrency(unallocated)}
                    </td>
                    <td className="table-cell text-right">-</td>
                  </tr>
                )}
                <tr>
                  <td className="table-cell font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-gray-400" />
                      Bank Account
                      {selectedBank && (
                        <span className="text-gray-400 text-xs">
                          ({selectedBank.accountName})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell text-right">-</td>
                  <td className="table-cell text-right font-medium text-red-600">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                <tr>
                  <td className="table-cell font-semibold">Totals</td>
                  <td className="table-cell text-right font-semibold">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td className="table-cell text-right font-semibold">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {unallocated > 0 && (
            <p className="text-xs text-yellow-600 mt-2">
              Note: {formatCurrency(unallocated)} will remain unallocated and
              held on the supplier account.
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pb-8">
        <Link
          href="/finance/bank"
          className="btn-ghost inline-flex items-center gap-2"
        >
          <X size={16} />
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || success || !totalAmount || !selectedSupplier}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ArrowUpRight size={16} />
          )}
          {saving ? 'Recording...' : 'Record Payment'}
        </button>
      </div>
    </div>
  )
}
