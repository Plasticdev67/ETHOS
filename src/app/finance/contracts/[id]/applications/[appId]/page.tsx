'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  Edit,
  Send,
  Trash2,
  CheckCircle,
  CreditCard,
  AlertTriangle,
  FileText,
  X,
  ExternalLink,
} from 'lucide-react'

// --- Types ---

interface ApplicationLineDetail {
  id: string
  description: string
  contractLineRef: string | null
  previousValue: number
  cumulativeValue: number
  thisPeriod: number
  percentComplete: number | null
}

interface JournalLink {
  id: string
  entryNumber: string
  description: string
}

interface ApplicationDetail {
  id: string
  applicationNumber: number
  periodStart: string
  periodEnd: string
  grossCumulative: number
  previousGrossCumulative: number
  thisApplication: number
  retentionCumulative: number
  retentionPrevious: number
  retentionThisPeriod: number
  cisDeduction: number
  contraCharges: number
  contraDescription: string | null
  materialsOnSite: number
  variationsIncluded: number
  appliedAmount: number
  certifiedAmount: number | null
  certificateReference: string | null
  certificateDate: string | null
  paymentDueDate: string | null
  paymentAmount: number | null
  paymentDate: string | null
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'
  status: 'DRAFT' | 'SUBMITTED' | 'CERTIFIED' | 'PAID'
  lines: ApplicationLineDetail[]
  journalEntry: JournalLink | null
  cisJournalEntry: JournalLink | null
  contractRef: string
  clientName: string
  contractId: string
  contractType: string
  cisApplicable: boolean
  cisRate: number | null
  retentionPercentage: number
}

const statusBadgeMap: Record<string, string> = {
  DRAFT: 'badge-gray',
  SUBMITTED: 'badge-info',
  CERTIFIED: 'badge-success',
  PAID: 'badge-success',
}

const paymentStatusBadge: Record<string, string> = {
  UNPAID: 'badge-danger',
  PARTIALLY_PAID: 'badge-warning',
  PAID: 'badge-success',
}

export default function ApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contractId = params.id as string
  const appId = params.appId as string

  const [app, setApp] = useState<ApplicationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Certification modal
  const [showCertifyModal, setShowCertifyModal] = useState(false)
  const [certifiedAmount, setCertifiedAmount] = useState('')
  const [certificateReference, setCertificateReference] = useState('')
  const [certificateDate, setCertificateDate] = useState('')
  const [paymentDueDate, setPaymentDueDate] = useState('')

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')

  useEffect(() => {
    fetchApplication()
  }, [contractId, appId])

  async function fetchApplication() {
    try {
      setLoading(true)
      const res = await fetch(`/api/finance/contracts/${contractId}/applications/${appId}`)
      if (!res.ok) throw new Error('Failed to load application')
      const data = await res.json()
      setApp(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!confirm('Submit this application for certification? It will no longer be editable.')) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/finance/contracts/${contractId}/applications/${appId}/submit`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to submit application')
      await fetchApplication()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this draft application? This cannot be undone.')) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/finance/contracts/${contractId}/applications/${appId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete application')
      router.push(`/finance/contracts/${contractId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
      setActionLoading(false)
    }
  }

  async function handleCertify() {
    if (!certifiedAmount || !certificateDate) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/finance/contracts/${contractId}/applications/${appId}/certify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certifiedAmount: parseFloat(certifiedAmount),
          certificateReference: certificateReference.trim() || undefined,
          certificateDate,
          paymentDueDate: paymentDueDate || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to certify application')
      }
      setShowCertifyModal(false)
      await fetchApplication()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to certify')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRecordPayment() {
    if (!paymentAmount || !paymentDate) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/finance/contracts/${contractId}/applications/${appId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentAmount: parseFloat(paymentAmount),
          paymentDate,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to record payment')
      }
      setShowPaymentModal(false)
      await fetchApplication()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setActionLoading(false)
    }
  }

  // Loading
  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="h-4 w-32 rounded bg-gray-200 animate-pulse mb-4" />
          <div className="h-8 w-64 rounded bg-gray-200 animate-pulse mb-2" />
          <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="card p-6 animate-pulse space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 flex-1 rounded bg-gray-200" />
              <div className="h-4 w-28 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error
  if (error && !app) {
    return (
      <div>
        <Link
          href={`/finance/contracts/${contractId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Contract
        </Link>
        <div className="card p-12 text-center">
          <AlertTriangle size={40} className="mx-auto text-red-400 mb-3" />
          <p className="text-lg font-medium text-gray-900">Error Loading Application</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!app) return null

  const cisAmount = app.cisApplicable && app.cisRate && app.certifiedAmount
    ? (app.certifiedAmount * app.cisRate) / 100
    : 0
  const expectedPayment = app.certifiedAmount ? app.certifiedAmount - cisAmount : null

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/finance/contracts/${contractId}`}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={16} className="mr-1" />
        Back to {app.contractRef}
      </Link>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">
              Application #{app.applicationNumber}
            </h1>
            <span className={cn('text-sm px-3 py-1', statusBadgeMap[app.status])}>
              {app.status}
            </span>
            <span className={cn('text-sm px-3 py-1', paymentStatusBadge[app.paymentStatus])}>
              {app.paymentStatus}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {app.contractRef} — {app.clientName}
          </p>
          <p className="mt-0.5 text-sm text-gray-400">
            Period: {formatDate(app.periodStart)} to {formatDate(app.periodEnd)}
          </p>
        </div>

        {/* Status-based actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {app.status === 'DRAFT' && (
            <>
              <Link
                href={`/finance/contracts/${contractId}/applications/new`}
                className="btn-secondary"
              >
                <Edit size={16} className="mr-2" />
                Edit
              </Link>
              <button
                onClick={handleSubmit}
                disabled={actionLoading}
                className="btn-primary"
              >
                <Send size={16} className="mr-2" />
                Submit
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="btn-danger"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </button>
            </>
          )}
          {app.status === 'SUBMITTED' && (
            <button
              onClick={() => {
                setShowCertifyModal(true)
                setCertifiedAmount(String(app.appliedAmount))
                setCertificateDate('')
                setPaymentDueDate('')
                setCertificateReference('')
              }}
              disabled={actionLoading}
              className="btn-primary"
            >
              <CheckCircle size={16} className="mr-2" />
              Record Certificate
            </button>
          )}
          {app.status === 'CERTIFIED' && (
            <button
              onClick={() => {
                setShowPaymentModal(true)
                setPaymentAmount(String(expectedPayment || app.certifiedAmount || 0))
                setPaymentDate('')
              }}
              disabled={actionLoading}
              className="btn-primary"
            >
              <CreditCard size={16} className="mr-2" />
              Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Application Lines */}
      <div className="card overflow-hidden mb-6">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Application Lines</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header w-8">#</th>
                <th className="table-header">Description</th>
                <th className="table-header">Contract Ref</th>
                <th className="table-header text-right">Previous Value</th>
                <th className="table-header text-right">Cumulative Value</th>
                <th className="table-header text-right">This Period</th>
                <th className="table-header text-right">% Complete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {app.lines.map((line, idx) => (
                <tr key={line.id} className="hover:bg-gray-50">
                  <td className="table-cell text-gray-400 text-center">{idx + 1}</td>
                  <td className="table-cell">{line.description}</td>
                  <td className="table-cell text-gray-500">{line.contractLineRef || '—'}</td>
                  <td className="table-cell text-right font-mono text-gray-500">{formatCurrency(line.previousValue)}</td>
                  <td className="table-cell text-right font-mono">{formatCurrency(line.cumulativeValue)}</td>
                  <td className={cn('table-cell text-right font-mono font-semibold', line.thisPeriod < 0 && 'text-red-600')}>
                    {formatCurrency(line.thisPeriod)}
                  </td>
                  <td className="table-cell text-right font-mono text-gray-500">
                    {line.percentComplete != null ? `${line.percentComplete}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                <td className="table-cell" colSpan={3}>Totals</td>
                <td className="table-cell text-right font-mono text-gray-500">
                  {formatCurrency(app.lines.reduce((s, l) => s + l.previousValue, 0))}
                </td>
                <td className="table-cell text-right font-mono">
                  {formatCurrency(app.grossCumulative)}
                </td>
                <td className="table-cell text-right font-mono">
                  {formatCurrency(app.thisApplication)}
                </td>
                <td className="table-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Summary Box */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Summary</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Gross Cumulative Value</span>
            <span className="text-sm font-mono font-semibold">{formatCurrency(app.grossCumulative)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Previous Gross Cumulative</span>
            <span className="text-sm font-mono text-gray-500">{formatCurrency(app.previousGrossCumulative)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-200 bg-blue-50 -mx-6 px-6">
            <span className="text-sm font-semibold text-blue-900">This Application Gross</span>
            <span className="text-sm font-mono font-bold text-blue-900">{formatCurrency(app.thisApplication)}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Retention This Period ({app.retentionPercentage}%)</span>
            <span className="text-sm font-mono font-semibold text-yellow-700">({formatCurrency(app.retentionThisPeriod)})</span>
          </div>

          {app.contraCharges > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">
                Contra Charges{app.contraDescription ? `: ${app.contraDescription}` : ''}
              </span>
              <span className="text-sm font-mono font-semibold text-orange-700">({formatCurrency(app.contraCharges)})</span>
            </div>
          )}

          <div className="flex items-center justify-between py-3 border-t-2 border-gray-300 bg-green-50 -mx-6 px-6">
            <span className="text-base font-bold text-green-900">Applied Amount</span>
            <span className="text-lg font-mono font-bold text-green-900">{formatCurrency(app.appliedAmount)}</span>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 border-t border-gray-200 pt-4">
          <div>
            <p className="text-xs text-gray-500">Materials on Site (cumulative)</p>
            <p className="text-sm font-mono font-medium">{formatCurrency(app.materialsOnSite)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Variations Included (cumulative)</p>
            <p className="text-sm font-mono font-medium">{formatCurrency(app.variationsIncluded)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Cumulative Retention</p>
            <p className="text-sm font-mono font-medium">{formatCurrency(app.retentionCumulative)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Previous Retention</p>
            <p className="text-sm font-mono font-medium text-gray-500">{formatCurrency(app.retentionPrevious)}</p>
          </div>
        </div>
      </div>

      {/* Certification Details (if certified or paid) */}
      {(app.status === 'CERTIFIED' || app.status === 'PAID') && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <CheckCircle size={18} className="inline mr-2 text-green-600" />
            Certification Details
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">Certified Amount</p>
              <p className="text-lg font-mono font-bold text-green-700">
                {app.certifiedAmount != null ? formatCurrency(app.certifiedAmount) : '—'}
              </p>
              {app.certifiedAmount != null && app.certifiedAmount !== app.appliedAmount && (
                <p className="text-xs text-orange-600 mt-0.5">
                  Differs from applied ({formatCurrency(app.appliedAmount)})
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">Certificate Reference</p>
              <p className="text-sm font-medium">{app.certificateReference || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Certificate Date</p>
              <p className="text-sm font-medium">{app.certificateDate ? formatDate(app.certificateDate) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Due Date</p>
              <p className="text-sm font-medium">{app.paymentDueDate ? formatDate(app.paymentDueDate) : '—'}</p>
            </div>
          </div>

          {/* CIS details */}
          {app.cisApplicable && app.certifiedAmount != null && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">CIS Deduction</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-500">CIS Rate</p>
                  <p className="text-sm font-medium">{app.cisRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">CIS Deduction Amount</p>
                  <p className="text-sm font-mono font-semibold text-orange-700">{formatCurrency(cisAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Net Payment Expected</p>
                  <p className="text-sm font-mono font-bold">{formatCurrency(expectedPayment || 0)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Journal link */}
          {app.journalEntry && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 mb-1">Journal Entry</p>
              <Link
                href={`/finance/journals/${app.journalEntry.id}`}
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <FileText size={14} className="mr-1" />
                {app.journalEntry.entryNumber} — {app.journalEntry.description}
                <ExternalLink size={12} className="ml-1" />
              </Link>
            </div>
          )}

          {/* CIS journal link */}
          {app.cisJournalEntry && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">CIS Journal Entry</p>
              <Link
                href={`/finance/journals/${app.cisJournalEntry.id}`}
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <FileText size={14} className="mr-1" />
                {app.cisJournalEntry.entryNumber} — {app.cisJournalEntry.description}
                <ExternalLink size={12} className="ml-1" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Payment Details (if paid) */}
      {app.status === 'PAID' && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <CreditCard size={18} className="inline mr-2 text-green-600" />
            Payment Details
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">Payment Amount</p>
              <p className="text-lg font-mono font-bold text-green-700">
                {app.paymentAmount != null ? formatCurrency(app.paymentAmount) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Date</p>
              <p className="text-sm font-medium">{app.paymentDate ? formatDate(app.paymentDate) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Status</p>
              <span className={paymentStatusBadge[app.paymentStatus]}>{app.paymentStatus}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Record Certificate */}
      {showCertifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Record Certificate</h3>
              <button
                onClick={() => setShowCertifyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-sm text-blue-800">
                Applied amount: <strong>{formatCurrency(app.appliedAmount)}</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                The client&apos;s QS may certify a different amount based on their assessment of works completed.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Certified Amount <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={certifiedAmount}
                    onChange={(e) => setCertifiedAmount(e.target.value)}
                    className="input pl-7 font-mono"
                  />
                </div>
                {certifiedAmount && parseFloat(certifiedAmount) !== app.appliedAmount && (
                  <p className="mt-1 text-xs text-orange-600">
                    This differs from the applied amount by {formatCurrency(Math.abs(parseFloat(certifiedAmount) - app.appliedAmount))}
                  </p>
                )}
              </div>
              <div>
                <label className="label">Certificate Reference</label>
                <input
                  type="text"
                  value={certificateReference}
                  onChange={(e) => setCertificateReference(e.target.value)}
                  placeholder="e.g. CERT-001"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Certificate Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={certificateDate}
                  onChange={(e) => setCertificateDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Payment Due Date</label>
                <input
                  type="date"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            {app.cisApplicable && certifiedAmount && (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-md p-3">
                <p className="text-sm text-orange-800">
                  CIS Deduction ({app.cisRate}%): <strong>{formatCurrency((parseFloat(certifiedAmount) * (app.cisRate || 0)) / 100)}</strong>
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Expected net payment: {formatCurrency(parseFloat(certifiedAmount) - (parseFloat(certifiedAmount) * (app.cisRate || 0)) / 100)}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCertifyModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleCertify}
                disabled={actionLoading || !certifiedAmount || !certificateDate}
                className="btn-primary"
              >
                <CheckCircle size={16} className="mr-2" />
                {actionLoading ? 'Certifying...' : 'Certify & Post Journal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Record Payment */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
              <p className="text-sm text-green-800">
                Certified amount: <strong>{app.certifiedAmount != null ? formatCurrency(app.certifiedAmount) : '—'}</strong>
              </p>
              {app.cisApplicable && (
                <p className="text-xs text-green-600 mt-1">
                  Less CIS ({app.cisRate}%): {formatCurrency(cisAmount)} = Net: {formatCurrency(expectedPayment || 0)}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Payment Amount <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="input pl-7 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="label">Payment Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowPaymentModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={actionLoading || !paymentAmount || !paymentDate}
                className="btn-primary"
              >
                <CreditCard size={16} className="mr-2" />
                {actionLoading ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
