'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  FileText,
  ArrowLeft,
  Send,
  Trash2,
  Edit3,
  CreditCard,
  Receipt,
  X,
  Check,
  Minus,
  Download,
  Mail,
} from 'lucide-react'

interface InvoiceLine {
  id: string
  description: string
  account: { id: string; code: string; name: string } | null
  quantity: number
  unitPrice: number
  netAmount: number
  vatCode: { id: string; code: string; rate: number } | null
  vatAmount: number
  grossAmount: number
}

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  isCreditNote: boolean
  relatedInvoiceId: string | null
  relatedInvoice?: { id: string; invoiceNumber: string } | null
  customer: {
    id: string
    name: string
    code: string
    contactName: string | null
    email: string | null
    addressLine1: string | null
    addressLine2: string | null
    city: string | null
    postcode: string | null
    country: string | null
  }
  issueDate: string
  dueDate: string
  projectId: string | null
  notes: string | null
  subtotal: number
  vatAmount: number
  total: number
  paidAmount: number
  outstandingAmount: number
  lines: InvoiceLine[]
  journalEntryId: string | null
  payments?: { id: string; date: string; amount: number; reference: string }[]
}

const STATUS_BADGES: Record<string, string> = {
  ACC_DRAFT: 'badge-gray',
  ACC_APPROVED: 'badge-info',
  ACC_POSTED: 'badge-success',
  ACC_PARTIALLY_PAID: 'badge-warning',
  ACC_PAID: 'badge-success',
  ACC_CANCELLED: 'badge-danger',
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)

  // Credit note modal
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false)
  const [creditNoteLines, setCreditNoteLines] = useState<
    { description: string; quantity: number; unitPrice: number; vatCodeId: string }[]
  >([])
  const [creditNoteReason, setCreditNoteReason] = useState('')

  useEffect(() => {
    async function fetchInvoice() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/finance/sales-ledger/invoices/${invoiceId}`)
        if (!res.ok) throw new Error('Failed to load invoice')

        const data = await res.json()
        setInvoice(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchInvoice()
  }, [invoiceId])

  async function handlePost() {
    if (!confirm('Are you sure you want to post this invoice? This will create a journal entry and cannot be undone.')) return

    try {
      setActionLoading(true)
      setError(null)

      const res = await fetch(`/api/finance/sales-ledger/invoices/${invoiceId}/post`, {
        method: 'POST',
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to post invoice')
      }

      const updated = await res.json()
      setInvoice(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this draft invoice? This action cannot be undone.')) return

    try {
      setActionLoading(true)
      setError(null)

      const res = await fetch(`/api/finance/sales-ledger/invoices/${invoiceId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to delete invoice')
      }

      router.push('/finance/sales')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  function openCreditNoteModal() {
    if (!invoice) return
    setCreditNoteLines(
      invoice.lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        vatCodeId: line.vatCode?.id || '',
      }))
    )
    setCreditNoteReason('')
    setShowCreditNoteModal(true)
  }

  async function handleCreateCreditNote() {
    try {
      setActionLoading(true)
      setError(null)

      const body = {
        reason: creditNoteReason.trim(),
        lines: creditNoteLines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          vatCodeId: l.vatCodeId,
        })),
      }

      const res = await fetch(`/api/finance/sales-ledger/invoices/${invoiceId}/credit-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to create credit note')
      }

      const creditNote = await res.json()
      setShowCreditNoteModal(false)
      router.push(`/finance/sales/${creditNote.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleEmailToCustomer() {
    if (!confirm('Send this document via email?')) return

    try {
      setEmailSending(true)
      setError(null)
      setEmailSuccess(null)

      const res = await fetch(`/api/finance/documents/sales-invoice/${invoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to send email')
      }

      const result = await res.json()
      setEmailSuccess(`${invoice?.isCreditNote ? 'Credit note' : 'Invoice'} emailed to ${result.sentTo}`)
      setTimeout(() => setEmailSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setEmailSending(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded w-1/2" />
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-6"><div className="h-24 bg-gray-200 rounded" /></div>
            <div className="card p-6"><div className="h-24 bg-gray-200 rounded" /></div>
          </div>
          <div className="card p-6">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
        <Link href="/finance/sales" className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to Sales Ledger
        </Link>
      </div>
    )
  }

  if (!invoice) return null

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/finance/sales" className="hover:text-gray-700">Sales Ledger</Link>
        <span>/</span>
        <span className="text-gray-900">{invoice.invoiceNumber}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg',
            invoice.isCreditNote ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
          )}>
            {invoice.isCreditNote ? <Receipt size={24} /> : <FileText size={24} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
              <span className={STATUS_BADGES[invoice.status] || 'badge-gray'}>
                {invoice.status.replace('ACC_', '').replace('_', ' ')}
              </span>
              {invoice.isCreditNote && <span className="badge-warning">Credit Note</span>}
            </div>
            <p className="text-sm text-gray-500">
              {invoice.customer?.name}
              {invoice.isCreditNote && invoice.relatedInvoice && (
                <> &mdash; Credit for{' '}
                  <Link
                    href={`/finance/sales/${invoice.relatedInvoice.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {invoice.relatedInvoice.invoiceNumber}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => window.open('/api/finance/documents/sales-invoice/' + invoiceId)}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Download size={16} />
            Download PDF
          </button>
          {invoice.status !== 'ACC_DRAFT' && (
            <button
              onClick={handleEmailToCustomer}
              disabled={emailSending}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Mail size={16} />
              {emailSending ? 'Sending...' : 'Email to Customer'}
            </button>
          )}
          {invoice.status === 'ACC_DRAFT' && (
            <>
              <Link
                href={`/finance/sales/${invoice.id}/edit`}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Edit3 size={16} />
                Edit
              </Link>
              <button
                onClick={handlePost}
                disabled={actionLoading}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Send size={16} />
                {actionLoading ? 'Posting...' : 'Post Invoice'}
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="btn-danger inline-flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </>
          )}
          {(invoice.status === 'ACC_POSTED' || invoice.status === 'ACC_PARTIALLY_PAID') && (
            <>
              <button
                onClick={openCreditNoteModal}
                disabled={actionLoading}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Minus size={16} />
                Create Credit Note
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {emailSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">{emailSuccess}</p>
        </div>
      )}

      {/* Invoice Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium text-gray-900">{invoice.customer?.name}</p>
            {invoice.customer?.contactName && <p>{invoice.customer.contactName}</p>}
            {invoice.customer?.email && <p>{invoice.customer.email}</p>}
            {invoice.customer?.addressLine1 && (
              <>
                <p>{invoice.customer.addressLine1}</p>
                {invoice.customer.addressLine2 && <p>{invoice.customer.addressLine2}</p>}
                <p>
                  {[invoice.customer.city, invoice.customer.postcode].filter(Boolean).join(', ')}
                </p>
                {invoice.customer.country && <p>{invoice.customer.country}</p>}
              </>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Details</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Issue Date</span>
              <span className="font-medium">{formatDate(invoice.issueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Due Date</span>
              <span className="font-medium">{formatDate(invoice.dueDate)}</span>
            </div>
            {invoice.projectId && (
              <div className="flex justify-between">
                <span className="text-gray-500">Project ID</span>
                <span className="font-medium">{invoice.projectId}</span>
              </div>
            )}
            {invoice.journalEntryId && (
              <div className="flex justify-between">
                <span className="text-gray-500">Journal Entry</span>
                <Link
                  href={`/finance/journals/${invoice.journalEntryId}`}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View Journal
                </Link>
              </div>
            )}
          </div>
          {invoice.notes && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Lines Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            {invoice.isCreditNote ? 'Credit Note Lines' : 'Invoice Lines'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header">Description</th>
                <th className="table-header">Account</th>
                <th className="table-header text-right">Qty</th>
                <th className="table-header text-right">Unit Price</th>
                <th className="table-header text-right">Net</th>
                <th className="table-header">VAT Code</th>
                <th className="table-header text-right">VAT</th>
                <th className="table-header text-right">Gross</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.lines.map((line) => (
                <tr key={line.id}>
                  <td className="table-cell">{line.description}</td>
                  <td className="table-cell">
                    {line.account ? `${line.account.code} - ${line.account.name}` : '-'}
                  </td>
                  <td className="table-cell text-right">{line.quantity}</td>
                  <td className="table-cell text-right">{formatCurrency(line.unitPrice)}</td>
                  <td className="table-cell text-right font-medium">{formatCurrency(line.netAmount)}</td>
                  <td className="table-cell">
                    {line.vatCode ? `${line.vatCode.code} (${line.vatCode.rate}%)` : '-'}
                  </td>
                  <td className="table-cell text-right">{formatCurrency(line.vatAmount)}</td>
                  <td className="table-cell text-right font-medium">{formatCurrency(line.grossAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="card p-6 w-full max-w-sm">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">VAT</span>
              <span className="font-medium">{formatCurrency(invoice.vatAmount)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="text-base font-semibold text-gray-900">Total</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(invoice.total)}</span>
            </div>
            {(invoice.paidAmount > 0 || invoice.outstandingAmount !== invoice.total) && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Paid</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(invoice.paidAmount)}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="text-sm font-semibold text-gray-900">Outstanding</span>
                  <span className={cn(
                    'text-base font-bold',
                    invoice.outstandingAmount > 0 ? 'text-red-600' : 'text-green-600'
                  )}>
                    {formatCurrency(invoice.outstandingAmount)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payment History */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard size={16} className="text-gray-400" />
              Payment History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Reference</th>
                  <th className="table-header text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.payments.map((pmt) => (
                  <tr key={pmt.id}>
                    <td className="table-cell">{formatDate(pmt.date)}</td>
                    <td className="table-cell">{pmt.reference}</td>
                    <td className="table-cell text-right font-medium text-green-600">
                      {formatCurrency(pmt.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Credit Note Modal */}
      {showCreditNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreditNoteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Create Credit Note</h2>
                <button
                  onClick={() => setShowCreditNoteModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Creating credit note against {invoice.invoiceNumber}. Adjust quantities or amounts for partial credits.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Reason */}
              <div>
                <label className="label">Reason for Credit Note</label>
                <textarea
                  className="input w-full"
                  value={creditNoteReason}
                  onChange={(e) => setCreditNoteReason(e.target.value)}
                  placeholder="Reason for issuing this credit note..."
                  rows={2}
                />
              </div>

              {/* Lines */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="table-header">Description</th>
                      <th className="table-header w-24 text-right">Qty</th>
                      <th className="table-header w-32 text-right">Unit Price</th>
                      <th className="table-header w-32 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {creditNoteLines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="table-cell text-sm">{line.description}</td>
                        <td className="table-cell">
                          <input
                            type="number"
                            className="input w-full text-right"
                            value={line.quantity}
                            onChange={(e) => {
                              const updated = [...creditNoteLines]
                              updated[idx] = { ...updated[idx], quantity: Number(e.target.value) }
                              setCreditNoteLines(updated)
                            }}
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="table-cell">
                          <input
                            type="number"
                            className="input w-full text-right"
                            value={line.unitPrice}
                            onChange={(e) => {
                              const updated = [...creditNoteLines]
                              updated[idx] = { ...updated[idx], unitPrice: Number(e.target.value) }
                              setCreditNoteLines(updated)
                            }}
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="table-cell text-right font-medium">
                          {formatCurrency(line.quantity * line.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreditNoteModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCreditNote}
                disabled={actionLoading}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Check size={16} />
                {actionLoading ? 'Creating...' : 'Create Credit Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
