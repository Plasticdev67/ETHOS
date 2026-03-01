'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  Plus,
  Send,
  User,
  Calendar,
  PoundSterling,
  MessageSquare,
} from 'lucide-react'

interface Customer {
  id: string
  code: string
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  county: string | null
  postcode: string | null
  paymentTermsDays: number
}

interface CreditLimit {
  limit: string
  exposure: string
  available: string
  utilisationPercent: number
  isOverLimit: boolean
}

interface OverdueInvoice {
  id: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  total: string
  paidAmount: string
  outstanding: string
  daysOverdue: number
  status: string
}

interface ChasingLog {
  id: string
  action: string
  notes: string | null
  contactedName: string | null
  promisedDate: string | null
  promisedAmount: string | null
  nextFollowUp: string | null
  letterSent: boolean
  emailSent: boolean
  salesInvoiceId: string | null
  createdBy: string
  createdAt: string
}

const ACTION_LABELS: Record<string, string> = {
  REMINDER_1: 'Reminder 1',
  REMINDER_2: 'Reminder 2',
  REMINDER_3: 'Reminder 3',
  FINAL_DEMAND: 'Final Demand',
  PHONE_CALL: 'Phone Call',
  ACCOUNT_ON_HOLD: 'Account on Hold',
  LEGAL_ACTION: 'Legal Action',
  WRITE_OFF: 'Write Off',
}

const ACTION_COLOURS: Record<string, string> = {
  REMINDER_1: 'badge-info',
  REMINDER_2: 'badge-warning',
  REMINDER_3: 'text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700',
  FINAL_DEMAND: 'badge-danger',
  PHONE_CALL: 'badge-info',
  ACCOUNT_ON_HOLD: 'badge-danger',
  LEGAL_ACTION: 'badge-danger',
  WRITE_OFF: 'badge-gray',
}

function getDaysOverdueBadge(days: number): string {
  if (days >= 90) return 'badge-danger'
  if (days >= 60) return 'text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700'
  if (days >= 30) return 'text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700'
  return 'badge-warning'
}

interface PageProps {
  params: Promise<{ customerId: string }>
}

export default function CustomerCreditDetailPage({ params }: PageProps) {
  const { customerId } = use(params)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [creditLimit, setCreditLimit] = useState<CreditLimit | null>(null)
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([])
  const [chasingHistory, setChasingHistory] = useState<ChasingLog[]>([])
  const [totalOutstanding, setTotalOutstanding] = useState('0.00')
  const [totalExposure, setTotalExposure] = useState('0.00')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [showActionForm, setShowActionForm] = useState(false)
  const [actionType, setActionType] = useState('REMINDER_1')
  const [actionNotes, setActionNotes] = useState('')
  const [contactedName, setContactedName] = useState('')
  const [promisedDate, setPromisedDate] = useState('')
  const [promisedAmount, setPromisedAmount] = useState('')
  const [nextFollowUp, setNextFollowUp] = useState('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Letter state
  const [generatingLetter, setGeneratingLetter] = useState(false)
  const [letterContent, setLetterContent] = useState<string | null>(null)
  const [showLetter, setShowLetter] = useState(false)

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/finance/credit-control/${customerId}`)
      if (!res.ok) throw new Error('Failed to load customer credit data')

      const data = await res.json()
      setCustomer(data.customer)
      setCreditLimit(data.creditLimit)
      setOverdueInvoices(data.overdueInvoices || [])
      setChasingHistory(data.chasingHistory || [])
      setTotalOutstanding(data.totalOutstanding || '0.00')
      setTotalExposure(data.totalExposure || '0.00')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleRecordAction(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSubmitting(true)

      const body: Record<string, unknown> = {
        action: actionType,
        notes: actionNotes || undefined,
        contactedName: contactedName || undefined,
        promisedDate: promisedDate || undefined,
        promisedAmount: promisedAmount ? parseFloat(promisedAmount) : undefined,
        nextFollowUp: nextFollowUp || undefined,
        salesInvoiceId: selectedInvoiceId || undefined,
      }

      const res = await fetch(`/api/finance/credit-control/${customerId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to record action')
      }

      // Reset form and refresh
      setShowActionForm(false)
      setActionType('REMINDER_1')
      setActionNotes('')
      setContactedName('')
      setPromisedDate('')
      setPromisedAmount('')
      setNextFollowUp('')
      setSelectedInvoiceId('')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGenerateLetter(action: string) {
    try {
      setGeneratingLetter(true)

      const res = await fetch(`/api/finance/credit-control/${customerId}/letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate letter')
      }

      const data = await res.json()
      setLetterContent(data.letterContent)
      setShowLetter(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setGeneratingLetter(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-7 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <div className="card p-12 text-center">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Customer not found</h3>
          <Link href="/finance/credit-control" className="btn-primary mt-4 inline-block">
            Back to Credit Control
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/finance/credit-control"
            className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={14} /> Back to Credit Control
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {customer.code} | Payment terms: {customer.paymentTermsDays} days
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowActionForm(!showActionForm)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Record Action
          </button>
          <div className="relative group">
            <button
              className="btn-secondary inline-flex items-center gap-2"
              disabled={generatingLetter}
            >
              <Send size={16} />
              {generatingLetter ? 'Generating...' : 'Generate Letter'}
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden group-hover:block">
              {['REMINDER_1', 'REMINDER_2', 'REMINDER_3', 'FINAL_DEMAND'].map((action) => (
                <button
                  key={action}
                  onClick={() => handleGenerateLetter(action)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                >
                  {ACTION_LABELS[action]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="text-sm text-red-600 underline mt-1">
            Dismiss
          </button>
        </div>
      )}

      {/* Customer Info & Credit Limit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Contact Info */}
        <div className="card p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Contact Information</h3>
          <div className="space-y-2">
            {customer.contactName && (
              <div className="flex items-center gap-2 text-sm">
                <User size={14} className="text-gray-400" />
                <span>{customer.contactName}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-gray-400" />
                <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                  {customer.phone}
                </a>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail size={14} className="text-gray-400" />
                <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                  {customer.email}
                </a>
              </div>
            )}
            {customer.addressLine1 && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin size={14} className="text-gray-400 mt-0.5" />
                <span>
                  {[customer.addressLine1, customer.addressLine2, customer.city, customer.county, customer.postcode]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Outstanding Summary */}
        <div className="card p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Outstanding Summary</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400">Total Overdue</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Exposure (all outstanding)</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalExposure)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Overdue Invoices</p>
              <p className="text-lg font-semibold text-gray-900">{overdueInvoices.length}</p>
            </div>
          </div>
        </div>

        {/* Credit Limit */}
        <div className="card p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Credit Limit</h3>
          {creditLimit ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400">Credit Limit</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(creditLimit.limit)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Available</p>
                <p
                  className={cn(
                    'text-lg font-semibold',
                    creditLimit.isOverLimit ? 'text-red-600' : 'text-green-600'
                  )}
                >
                  {formatCurrency(creditLimit.available)}
                </p>
              </div>
              {/* Utilisation bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Utilisation</span>
                  <span>{creditLimit.utilisationPercent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all',
                      creditLimit.utilisationPercent >= 100
                        ? 'bg-red-500'
                        : creditLimit.utilisationPercent >= 80
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                    )}
                    style={{ width: `${Math.min(creditLimit.utilisationPercent, 100)}%` }}
                  />
                </div>
                {creditLimit.isOverLimit && (
                  <p className="text-xs text-red-600 font-medium mt-1">
                    Over credit limit
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              No credit limit set for this customer
            </div>
          )}
        </div>
      </div>

      {/* Record Action Form */}
      {showActionForm && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Record Chasing Action</h3>
          <form onSubmit={handleRecordAction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Action Type *</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="input w-full"
                  required
                >
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Contacted Name</label>
                <input
                  type="text"
                  value={contactedName}
                  onChange={(e) => setContactedName(e.target.value)}
                  className="input w-full"
                  placeholder="Person spoken to"
                />
              </div>

              <div>
                <label className="label">Related Invoice</label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">All invoices</option>
                  {overdueInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} ({formatCurrency(inv.outstanding)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Promised Payment Date</label>
                <input
                  type="date"
                  value={promisedDate}
                  onChange={(e) => setPromisedDate(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="label">Promised Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={promisedAmount}
                  onChange={(e) => setPromisedAmount(e.target.value)}
                  className="input w-full"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="label">Next Follow-up Date</label>
                <input
                  type="date"
                  value={nextFollowUp}
                  onChange={(e) => setNextFollowUp(e.target.value)}
                  className="input w-full"
                />
              </div>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="input w-full"
                rows={3}
                placeholder="Details of the chasing action..."
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving...' : 'Record Action'}
              </button>
              <button
                type="button"
                onClick={() => setShowActionForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Letter Preview Modal */}
      {showLetter && letterContent && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Generated Letter</h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(letterContent)
                }}
                className="btn-secondary text-sm"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => {
                  setShowLetter(false)
                  setLetterContent(null)
                }}
                className="btn-ghost text-sm"
              >
                Close
              </button>
            </div>
          </div>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-sm font-mono whitespace-pre-wrap overflow-x-auto">
            {letterContent}
          </pre>
        </div>
      )}

      {/* Outstanding Invoices */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Overdue Invoices</h3>
        </div>
        {overdueInvoices.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle size={32} className="mx-auto text-green-400 mb-3" />
            <p className="text-sm text-gray-500">No overdue invoices</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header">Invoice #</th>
                  <th className="table-header">Issue Date</th>
                  <th className="table-header">Due Date</th>
                  <th className="table-header text-right">Total</th>
                  <th className="table-header text-right">Paid</th>
                  <th className="table-header text-right">Outstanding</th>
                  <th className="table-header text-center">Days Overdue</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {overdueInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <Link
                        href={`/finance/sales/${invoice.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="table-cell">{formatDate(invoice.issueDate)}</td>
                    <td className="table-cell">{formatDate(invoice.dueDate)}</td>
                    <td className="table-cell text-right">{formatCurrency(invoice.total)}</td>
                    <td className="table-cell text-right">{formatCurrency(invoice.paidAmount)}</td>
                    <td className="table-cell text-right font-semibold">
                      {formatCurrency(invoice.outstanding)}
                    </td>
                    <td className="table-cell text-center">
                      <span className={getDaysOverdueBadge(invoice.daysOverdue)}>
                        {invoice.daysOverdue} days
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="badge-warning">
                        {invoice.status.replace('ACC_', '').replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chasing History Timeline */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Chasing History</h3>
        </div>
        {chasingHistory.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No chasing history recorded</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

              <div className="space-y-6">
                {chasingHistory.map((log, index) => (
                  <div key={log.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        'absolute left-2.5 w-3 h-3 rounded-full border-2 border-white',
                        index === 0 ? 'bg-blue-500' : 'bg-gray-400'
                      )}
                    />

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={ACTION_COLOURS[log.action] || 'badge-gray'}>
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                          {log.letterSent && (
                            <span className="badge-info">Letter Sent</span>
                          )}
                          {log.emailSent && (
                            <span className="badge-info">Email Sent</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>

                      {log.notes && (
                        <p className="text-sm text-gray-700 mb-2">{log.notes}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        {log.contactedName && (
                          <span className="flex items-center gap-1">
                            <User size={12} /> {log.contactedName}
                          </span>
                        )}
                        {log.promisedDate && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} /> Promised: {formatDate(log.promisedDate)}
                          </span>
                        )}
                        {log.promisedAmount && (
                          <span className="flex items-center gap-1">
                            <PoundSterling size={12} /> {formatCurrency(log.promisedAmount)}
                          </span>
                        )}
                        {log.nextFollowUp && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> Follow-up: {formatDate(log.nextFollowUp)}
                          </span>
                        )}
                        <span className="text-gray-400">by {log.createdBy}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
