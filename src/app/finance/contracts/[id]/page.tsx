'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  Plus,
  FileText,
  CheckCircle,
  ShieldCheck,
  AlertTriangle,
  X,
  TrendingUp,
  Building2,
  BarChart3,
  ClipboardCheck,
  Clock,
  Eye,
} from 'lucide-react'

// --- Type definitions ---

interface ApplicationLine {
  id: string
  description: string
  cumulativeValue: number
  previousValue: number
  thisPeriod: number
}

interface Application {
  id: string
  applicationNumber: number
  periodStart: string
  periodEnd: string
  grossCumulative: number
  thisApplication: number
  retentionHeld: number
  cisDeduction: number
  appliedAmount: number
  certifiedAmount: number | null
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'
  status: 'CONTRACT_DRAFT' | 'SUBMITTED' | 'CERTIFIED' | 'PAID'
}

interface Variation {
  id: string
  reference: string
  description: string
  submittedValue: number
  approvedValue: number | null
  approvedDate: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
}

interface RetentionLine {
  applicationNumber: number
  grossValue: number
  retentionPercent: number
  retentionAmount: number
  released: number
  netHeld: number
}

interface ContractDetail {
  id: string
  contractRef: string
  projectId: string
  clientId: string
  clientName: string
  contractType: 'FINANCE_NEC' | 'FINANCE_JCT' | 'FINANCE_BESPOKE'
  originalValue: number
  currentValue: number
  certifiedToDate: number
  balanceRemaining: number
  retentionHeld: number
  retentionReleased: number
  cisDeductedToDate: number
  totalPaid: number
  outstandingAmount: number
  retentionPercentage: number
  retentionLimit: number | null
  defectsLiabilityPeriod: number
  cisApplicable: boolean
  cisRate: number | null
  description: string | null
  status: 'CONTRACT_DRAFT' | 'CONTRACT_ACTIVE' | 'PRACTICAL_COMPLETION' | 'DEFECTS_LIABILITY' | 'FINAL_ACCOUNT' | 'CLOSED'
  practicalCompletionDate: string | null
  defectsEndDate: string | null
  applications: Application[]
  variations: Variation[]
  retentionLines: RetentionLine[]
}

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

const appStatusBadge: Record<string, string> = {
  CONTRACT_DRAFT: 'badge-gray',
  SUBMITTED: 'badge-info',
  CERTIFIED: 'badge-success',
  PAID: 'badge-success',
}

const paymentStatusBadge: Record<string, string> = {
  UNPAID: 'badge-danger',
  PARTIALLY_PAID: 'badge-warning',
  PAID: 'badge-success',
}

const variationStatusBadge: Record<string, string> = {
  PENDING: 'badge-warning',
  APPROVED: 'badge-success',
  REJECTED: 'badge-danger',
  WITHDRAWN: 'badge-gray',
}

const typeBadgeMap: Record<string, string> = {
  FINANCE_NEC: 'badge-info',
  FINANCE_JCT: 'badge-success',
  FINANCE_BESPOKE: 'badge-warning',
}

type TabId = 'applications' | 'variations' | 'retention' | 'financial'

export default function ContractDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('applications')
  const [actionLoading, setActionLoading] = useState(false)

  // Variation modal state
  const [showVariationModal, setShowVariationModal] = useState(false)
  const [variationForm, setVariationForm] = useState({
    reference: '',
    description: '',
    submittedValue: '',
  })

  // Variation approval modal
  const [approvalModal, setApprovalModal] = useState<{ variationId: string; action: 'approve' | 'reject' } | null>(null)
  const [approvedValue, setApprovedValue] = useState('')

  // Retention release modal
  const [showRetentionModal, setShowRetentionModal] = useState(false)
  const [retentionReleaseAmount, setRetentionReleaseAmount] = useState('')
  const [retentionReleaseNote, setRetentionReleaseNote] = useState('')

  useEffect(() => {
    fetchContract()
  }, [id])

  async function fetchContract() {
    try {
      setLoading(true)
      const res = await fetch(`/api/finance/contracts/${id}`)
      if (!res.ok) throw new Error('Failed to load contract')
      const data = await res.json()
      setContract(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    const confirmMessages: Record<string, string> = {
      PRACTICAL_COMPLETION: 'Mark this contract as having reached Practical Completion? Half of retention will typically become due for release.',
      FINAL_ACCOUNT: 'Proceed to Final Account? This indicates the defects liability period has ended.',
    }
    const msg = confirmMessages[newStatus] || `Change contract status to ${newStatus}?`
    if (!confirm(msg)) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/finance/contracts/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update contract status')
      await fetchContract()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleAddVariation() {
    if (!variationForm.reference.trim() || !variationForm.submittedValue) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/finance/contracts/${id}/variations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: variationForm.reference.trim(),
          description: variationForm.description.trim(),
          submittedValue: parseFloat(variationForm.submittedValue),
        }),
      })
      if (!res.ok) throw new Error('Failed to add variation')
      setShowVariationModal(false)
      setVariationForm({ reference: '', description: '', submittedValue: '' })
      await fetchContract()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add variation')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleVariationAction() {
    if (!approvalModal) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/finance/contracts/${id}/variations/${approvalModal.variationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: approvalModal.action,
          approvedValue: approvalModal.action === 'approve' ? parseFloat(approvedValue) : undefined,
        }),
      })
      if (!res.ok) throw new Error(`Failed to ${approvalModal.action} variation`)
      setApprovalModal(null)
      setApprovedValue('')
      await fetchContract()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update variation')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRetentionRelease() {
    if (!retentionReleaseAmount || parseFloat(retentionReleaseAmount) <= 0) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/finance/contracts/${id}/retention/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(retentionReleaseAmount),
          note: retentionReleaseNote.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to release retention')
      setShowRetentionModal(false)
      setRetentionReleaseAmount('')
      setRetentionReleaseNote('')
      await fetchContract()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to release retention')
    } finally {
      setActionLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="h-4 w-32 rounded bg-gray-200 animate-pulse mb-4" />
          <div className="h-8 w-64 rounded bg-gray-200 animate-pulse mb-2" />
          <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-3 w-20 rounded bg-gray-200 mb-2" />
              <div className="h-6 w-28 rounded bg-gray-200" />
            </div>
          ))}
        </div>
        <div className="card p-6 animate-pulse space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-28 rounded bg-gray-200" />
              <div className="h-4 flex-1 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error && !contract) {
    return (
      <div>
        <Link
          href="/finance/contracts"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Contracts
        </Link>
        <div className="card p-12 text-center">
          <AlertTriangle size={40} className="mx-auto text-red-400 mb-3" />
          <p className="text-lg font-medium text-gray-900">Error Loading Contract</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!contract) return null

  const certifiedPercent = contract.currentValue > 0
    ? Math.round((contract.certifiedToDate / contract.currentValue) * 100)
    : 0

  const variationTotal = contract.currentValue - contract.originalValue

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'applications', label: 'Applications', icon: <FileText size={16} /> },
    { id: 'variations', label: 'Variations', icon: <TrendingUp size={16} /> },
    { id: 'retention', label: 'Retention', icon: <ShieldCheck size={16} /> },
    { id: 'financial', label: 'Financial Summary', icon: <BarChart3 size={16} /> },
  ]

  return (
    <div>
      {/* Back link */}
      <Link
        href="/finance/contracts"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={16} className="mr-1" />
        Back to Contracts
      </Link>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{contract.contractRef}</h1>
            <span className={typeBadgeMap[contract.contractType] || 'badge-gray'}>
              {contract.contractType}
            </span>
            <span className={cn('text-sm px-3 py-1', statusBadgeMap[contract.status])}>
              {statusLabel[contract.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{contract.clientName}</p>
          {contract.description && (
            <p className="mt-1 text-sm text-gray-400">{contract.description}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {contract.status === 'CONTRACT_ACTIVE' && (
            <>
              <Link
                href={`/finance/contracts/${id}/applications/new`}
                className="btn-primary"
              >
                <Plus size={16} className="mr-2" />
                New Application
              </Link>
              <button
                onClick={() => handleStatusChange('PRACTICAL_COMPLETION')}
                disabled={actionLoading}
                className="btn-secondary"
              >
                <CheckCircle size={16} className="mr-2" />
                Mark Practical Completion
              </button>
            </>
          )}
          {(contract.status === 'PRACTICAL_COMPLETION' || contract.status === 'DEFECTS_LIABILITY') && (
            <button
              onClick={() => setShowRetentionModal(true)}
              disabled={actionLoading}
              className="btn-secondary"
            >
              <ShieldCheck size={16} className="mr-2" />
              Release Retention
            </button>
          )}
          {contract.status === 'DEFECTS_LIABILITY' && (
            <button
              onClick={() => handleStatusChange('FINAL_ACCOUNT')}
              disabled={actionLoading}
              className="btn-secondary"
            >
              <ClipboardCheck size={16} className="mr-2" />
              Final Account
            </button>
          )}
        </div>
      </div>

      {/* Key Figures - Row 1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500">Original Value</p>
          <p className="mt-1 text-xl font-bold text-gray-900 font-mono">{formatCurrency(contract.originalValue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500">Current Value (inc. variations)</p>
          <p className={cn('mt-1 text-xl font-bold font-mono', variationTotal !== 0 ? 'text-blue-700' : 'text-gray-900')}>
            {formatCurrency(contract.currentValue)}
          </p>
          {variationTotal !== 0 && (
            <p className="text-xs text-blue-500 mt-0.5">
              {variationTotal > 0 ? '+' : ''}{formatCurrency(variationTotal)} in variations
            </p>
          )}
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500">Certified to Date</p>
          <p className="mt-1 text-xl font-bold text-gray-900 font-mono">{formatCurrency(contract.certifiedToDate)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{certifiedPercent}% of current value</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500">Balance Remaining</p>
          <p className="mt-1 text-xl font-bold text-gray-900 font-mono">{formatCurrency(contract.balanceRemaining)}</p>
        </div>
      </div>

      {/* Key Figures - Row 2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500">Retention Held</p>
          <p className="mt-1 text-lg font-bold text-yellow-700 font-mono">{formatCurrency(contract.retentionHeld)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500">CIS Deducted to Date</p>
          <p className="mt-1 text-lg font-bold text-gray-900 font-mono">{formatCurrency(contract.cisDeductedToDate)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500">Total Paid</p>
          <p className="mt-1 text-lg font-bold text-green-700 font-mono">{formatCurrency(contract.totalPaid)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500">Outstanding Amount</p>
          <p className={cn('mt-1 text-lg font-bold font-mono', contract.outstandingAmount > 0 ? 'text-red-700' : 'text-gray-900')}>
            {formatCurrency(contract.outstandingAmount)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content: Applications */}
      {activeTab === 'applications' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Applications for Payment</h2>
            {contract.status === 'CONTRACT_ACTIVE' && (
              <Link
                href={`/finance/contracts/${id}/applications/new`}
                className="btn-primary"
              >
                <Plus size={16} className="mr-2" />
                New Application
              </Link>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              {contract.applications.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">App #</th>
                      <th className="table-header">Period</th>
                      <th className="table-header text-right">Gross Cumulative</th>
                      <th className="table-header text-right">This Application</th>
                      <th className="table-header text-right">Retention Held</th>
                      <th className="table-header text-right">CIS</th>
                      <th className="table-header text-right">Applied Amount</th>
                      <th className="table-header text-right">Certified Amount</th>
                      <th className="table-header">Payment</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {contract.applications.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-cell">
                          <Link
                            href={`/finance/contracts/${id}/applications/${app.id}`}
                            className="font-medium text-blue-600 hover:text-blue-700"
                          >
                            #{app.applicationNumber}
                          </Link>
                        </td>
                        <td className="table-cell text-sm">
                          {formatDate(app.periodStart)} - {formatDate(app.periodEnd)}
                        </td>
                        <td className="table-cell text-right font-mono">{formatCurrency(app.grossCumulative)}</td>
                        <td className="table-cell text-right font-mono">{formatCurrency(app.thisApplication)}</td>
                        <td className="table-cell text-right font-mono">{formatCurrency(app.retentionHeld)}</td>
                        <td className="table-cell text-right font-mono">{formatCurrency(app.cisDeduction)}</td>
                        <td className="table-cell text-right font-mono font-semibold">{formatCurrency(app.appliedAmount)}</td>
                        <td className="table-cell text-right font-mono">
                          {app.certifiedAmount != null ? formatCurrency(app.certifiedAmount) : '—'}
                        </td>
                        <td className="table-cell">
                          <span className={paymentStatusBadge[app.paymentStatus] || 'badge-gray'}>
                            {app.paymentStatus}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className={appStatusBadge[app.status] || 'badge-gray'}>
                            {app.status}
                          </span>
                        </td>
                        <td className="table-cell">
                          <Link
                            href={`/finance/contracts/${id}/applications/${app.id}`}
                            className="text-gray-400 hover:text-gray-600"
                            title="View"
                          >
                            <Eye size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center">
                  <FileText size={40} className="mx-auto text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No applications yet</p>
                  {contract.status === 'CONTRACT_ACTIVE' && (
                    <Link
                      href={`/finance/contracts/${id}/applications/new`}
                      className="btn-primary mt-4 inline-flex"
                    >
                      <Plus size={16} className="mr-2" />
                      Create First Application
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Variations */}
      {activeTab === 'variations' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Variations</h2>
            <button onClick={() => setShowVariationModal(true)} className="btn-primary">
              <Plus size={16} className="mr-2" />
              Add Variation
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              {contract.variations.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">Ref</th>
                      <th className="table-header">Description</th>
                      <th className="table-header text-right">Submitted Value</th>
                      <th className="table-header">Status</th>
                      <th className="table-header text-right">Approved Value</th>
                      <th className="table-header">Approved Date</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {contract.variations.map((variation) => (
                      <tr key={variation.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-cell font-medium">{variation.reference}</td>
                        <td className="table-cell max-w-xs truncate">{variation.description}</td>
                        <td className="table-cell text-right font-mono">{formatCurrency(variation.submittedValue)}</td>
                        <td className="table-cell">
                          <span className={variationStatusBadge[variation.status] || 'badge-gray'}>
                            {variation.status}
                          </span>
                        </td>
                        <td className="table-cell text-right font-mono">
                          {variation.approvedValue != null ? formatCurrency(variation.approvedValue) : '—'}
                        </td>
                        <td className="table-cell">
                          {variation.approvedDate ? formatDate(variation.approvedDate) : '—'}
                        </td>
                        <td className="table-cell">
                          {variation.status === 'PENDING' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setApprovalModal({ variationId: variation.id, action: 'approve' })
                                  setApprovedValue(String(variation.submittedValue))
                                }}
                                className="text-green-500 hover:text-green-700 text-xs font-medium"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setApprovalModal({ variationId: variation.id, action: 'reject' })}
                                className="text-red-500 hover:text-red-700 text-xs font-medium"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                      <td className="table-cell" colSpan={2}>Total Approved Variations</td>
                      <td className="table-cell text-right font-mono">
                        {formatCurrency(
                          contract.variations
                            .filter((v) => v.status !== 'REJECTED' && v.status !== 'WITHDRAWN')
                            .reduce((sum, v) => sum + v.submittedValue, 0)
                        )}
                      </td>
                      <td className="table-cell" />
                      <td className="table-cell text-right font-mono">
                        {formatCurrency(
                          contract.variations
                            .filter((v) => v.status === 'APPROVED' && v.approvedValue != null)
                            .reduce((sum, v) => sum + (v.approvedValue || 0), 0)
                        )}
                      </td>
                      <td className="table-cell" colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div className="py-12 text-center">
                  <TrendingUp size={40} className="mx-auto text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No variations recorded</p>
                  <button onClick={() => setShowVariationModal(true)} className="btn-primary mt-4 inline-flex">
                    <Plus size={16} className="mr-2" />
                    Add First Variation
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Retention */}
      {activeTab === 'retention' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Retention Tracker</h2>
            {(contract.status === 'PRACTICAL_COMPLETION' || contract.status === 'DEFECTS_LIABILITY') && (
              <button onClick={() => setShowRetentionModal(true)} className="btn-primary">
                <ShieldCheck size={16} className="mr-2" />
                Release Retention
              </button>
            )}
          </div>

          {/* Retention summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
            <div className="card p-4">
              <p className="text-xs font-medium text-gray-500">Total Retention Held</p>
              <p className="mt-1 text-xl font-bold text-yellow-700 font-mono">
                {formatCurrency(contract.retentionHeld + contract.retentionReleased)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-gray-500">Total Released</p>
              <p className="mt-1 text-xl font-bold text-green-700 font-mono">
                {formatCurrency(contract.retentionReleased)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-gray-500">Balance Held</p>
              <p className="mt-1 text-xl font-bold text-gray-900 font-mono">
                {formatCurrency(contract.retentionHeld)}
              </p>
            </div>
          </div>

          {/* Retention per application */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              {contract.retentionLines.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">App #</th>
                      <th className="table-header text-right">Gross Value</th>
                      <th className="table-header text-right">Retention %</th>
                      <th className="table-header text-right">Retention Amount</th>
                      <th className="table-header text-right">Released</th>
                      <th className="table-header text-right">Net Held</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {contract.retentionLines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="table-cell font-medium">#{line.applicationNumber}</td>
                        <td className="table-cell text-right font-mono">{formatCurrency(line.grossValue)}</td>
                        <td className="table-cell text-right font-mono">{line.retentionPercent}%</td>
                        <td className="table-cell text-right font-mono">{formatCurrency(line.retentionAmount)}</td>
                        <td className="table-cell text-right font-mono text-green-600">{formatCurrency(line.released)}</td>
                        <td className="table-cell text-right font-mono font-semibold">{formatCurrency(line.netHeld)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                      <td className="table-cell" colSpan={3}>Totals</td>
                      <td className="table-cell text-right font-mono">
                        {formatCurrency(contract.retentionLines.reduce((s, l) => s + l.retentionAmount, 0))}
                      </td>
                      <td className="table-cell text-right font-mono text-green-600">
                        {formatCurrency(contract.retentionLines.reduce((s, l) => s + l.released, 0))}
                      </td>
                      <td className="table-cell text-right font-mono">
                        {formatCurrency(contract.retentionLines.reduce((s, l) => s + l.netHeld, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div className="py-12 text-center">
                  <ShieldCheck size={40} className="mx-auto text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No retention data yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Key dates */}
          {(contract.practicalCompletionDate || contract.defectsEndDate) && (
            <div className="card p-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Key Dates</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {contract.practicalCompletionDate && (
                  <div>
                    <p className="text-xs text-gray-500">Practical Completion Date</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(contract.practicalCompletionDate)}</p>
                  </div>
                )}
                {contract.defectsEndDate && (
                  <div>
                    <p className="text-xs text-gray-500">Defects Liability Ends</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(contract.defectsEndDate)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Financial Summary */}
      {activeTab === 'financial' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>

          {/* Contract value breakdown */}
          <div className="card p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Contract Value Breakdown</h3>
            <div className="space-y-3">
              {/* Original Value */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Original Contract Value</span>
                <span className="text-sm font-mono font-semibold text-gray-900">{formatCurrency(contract.originalValue)}</span>
              </div>
              {/* Variations */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Approved Variations</span>
                <span className={cn('text-sm font-mono font-semibold', variationTotal >= 0 ? 'text-green-700' : 'text-red-700')}>
                  {variationTotal >= 0 ? '+' : ''}{formatCurrency(variationTotal)}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Current Contract Value</span>
                <span className="text-lg font-mono font-bold text-gray-900">{formatCurrency(contract.currentValue)}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Certified Progress</span>
                <span>{certifiedPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(certifiedPercent, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                <span>{formatCurrency(contract.certifiedToDate)} certified</span>
                <span>{formatCurrency(contract.balanceRemaining)} remaining</span>
              </div>
            </div>
          </div>

          {/* Cumulative position */}
          <div className="card p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Cumulative Contract Position</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Gross Certified to Date</span>
                <span className="text-sm font-mono font-semibold">{formatCurrency(contract.certifiedToDate)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Less: Retention Held</span>
                <span className="text-sm font-mono font-semibold text-yellow-700">({formatCurrency(contract.retentionHeld)})</span>
              </div>
              {contract.cisApplicable && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Less: CIS Deducted ({contract.cisRate}%)</span>
                  <span className="text-sm font-mono font-semibold text-orange-700">({formatCurrency(contract.cisDeductedToDate)})</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Net Amount Due</span>
                <span className="text-sm font-mono font-bold">{formatCurrency(contract.certifiedToDate - contract.retentionHeld - contract.cisDeductedToDate)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Less: Total Paid</span>
                <span className="text-sm font-mono font-semibold text-green-700">({formatCurrency(contract.totalPaid)})</span>
              </div>
              <div className="border-t-2 border-gray-300 pt-2 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Outstanding Balance</span>
                <span className={cn('text-lg font-mono font-bold', contract.outstandingAmount > 0 ? 'text-red-700' : 'text-green-700')}>
                  {formatCurrency(contract.outstandingAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Contract info */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Contract Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Contract Type</p>
                <p className="text-sm font-medium text-gray-900">{contract.contractType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Retention Rate</p>
                <p className="text-sm font-medium text-gray-900">{contract.retentionPercentage}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Retention Limit</p>
                <p className="text-sm font-medium text-gray-900">
                  {contract.retentionLimit ? formatCurrency(contract.retentionLimit) : 'No limit'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">CIS Applicable</p>
                <p className="text-sm font-medium text-gray-900">{contract.cisApplicable ? `Yes (${contract.cisRate}%)` : 'No'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Defects Liability Period</p>
                <p className="text-sm font-medium text-gray-900">{contract.defectsLiabilityPeriod} months</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Project ID</p>
                <p className="text-sm font-medium text-gray-900">{contract.projectId}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Variation */}
      {showVariationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Variation</h3>
              <button
                onClick={() => setShowVariationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Reference <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={variationForm.reference}
                  onChange={(e) => setVariationForm({ ...variationForm, reference: e.target.value })}
                  placeholder="e.g. VO-001"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  rows={3}
                  value={variationForm.description}
                  onChange={(e) => setVariationForm({ ...variationForm, description: e.target.value })}
                  placeholder="Description of the variation..."
                  className="input"
                />
              </div>
              <div>
                <label className="label">Submitted Value <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                  <input
                    type="number"
                    step="0.01"
                    value={variationForm.submittedValue}
                    onChange={(e) => setVariationForm({ ...variationForm, submittedValue: e.target.value })}
                    placeholder="0.00"
                    className="input pl-7 font-mono"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">Use negative value for omissions</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowVariationModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleAddVariation}
                disabled={actionLoading || !variationForm.reference.trim() || !variationForm.submittedValue}
                className="btn-primary"
              >
                {actionLoading ? 'Adding...' : 'Add Variation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Approve/Reject Variation */}
      {approvalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {approvalModal.action === 'approve' ? 'Approve Variation' : 'Reject Variation'}
              </h3>
              <button
                onClick={() => { setApprovalModal(null); setApprovedValue('') }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            {approvalModal.action === 'approve' ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Enter the approved value for this variation. This may differ from the submitted value.
                </p>
                <div>
                  <label className="label">Approved Value <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                    <input
                      type="number"
                      step="0.01"
                      value={approvedValue}
                      onChange={(e) => setApprovedValue(e.target.value)}
                      className="input pl-7 font-mono"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to reject this variation? This action can be reversed later.
              </p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setApprovalModal(null); setApprovedValue('') }} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleVariationAction}
                disabled={actionLoading || (approvalModal.action === 'approve' && !approvedValue)}
                className={approvalModal.action === 'approve' ? 'btn-primary' : 'btn-danger'}
              >
                {actionLoading
                  ? (approvalModal.action === 'approve' ? 'Approving...' : 'Rejecting...')
                  : (approvalModal.action === 'approve' ? 'Approve' : 'Reject')
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Release Retention */}
      {showRetentionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Release Retention</h3>
              <button
                onClick={() => setShowRetentionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <p className="text-sm text-yellow-800">
                Current retention balance: <strong>{formatCurrency(contract.retentionHeld)}</strong>
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Release Amount <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={contract.retentionHeld}
                    value={retentionReleaseAmount}
                    onChange={(e) => setRetentionReleaseAmount(e.target.value)}
                    placeholder="0.00"
                    className="input pl-7 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="label">Note</label>
                <textarea
                  rows={2}
                  value={retentionReleaseNote}
                  onChange={(e) => setRetentionReleaseNote(e.target.value)}
                  placeholder="e.g. 50% release at practical completion"
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowRetentionModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleRetentionRelease}
                disabled={actionLoading || !retentionReleaseAmount || parseFloat(retentionReleaseAmount) <= 0}
                className="btn-primary"
              >
                <ShieldCheck size={16} className="mr-2" />
                {actionLoading ? 'Releasing...' : 'Release Retention'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
