'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react'

export default function NewContractPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Form fields
  const [contractRef, setContractRef] = useState('')
  const [projectId, setProjectId] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [contractType, setContractType] = useState<'FINANCE_NEC' | 'FINANCE_JCT' | 'FINANCE_BESPOKE'>('FINANCE_NEC')
  const [originalValue, setOriginalValue] = useState('')
  const [description, setDescription] = useState('')

  // Retention
  const [retentionPercentage, setRetentionPercentage] = useState('5')
  const [retentionLimit, setRetentionLimit] = useState('')
  const [defectsLiabilityPeriod, setDefectsLiabilityPeriod] = useState('12')

  // CIS
  const [cisApplicable, setCisApplicable] = useState(false)
  const [cisRate, setCisRate] = useState('20')

  function validate(): boolean {
    const errors: Record<string, string> = {}

    if (!contractRef.trim()) {
      errors.contractRef = 'Contract reference is required'
    }
    if (!projectId.trim()) {
      errors.projectId = 'Project ID is required'
    }
    if (!clientId.trim()) {
      errors.clientId = 'Client ID is required'
    }
    if (!originalValue || parseFloat(originalValue) <= 0) {
      errors.originalValue = 'Original contract value must be greater than zero'
    }
    if (retentionPercentage && (parseFloat(retentionPercentage) < 0 || parseFloat(retentionPercentage) > 100)) {
      errors.retentionPercentage = 'Retention percentage must be between 0 and 100'
    }
    if (cisApplicable && !cisRate) {
      errors.cisRate = 'CIS rate is required when CIS is applicable'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!validate()) return

    setLoading(true)
    try {
      const payload = {
        contractRef: contractRef.trim(),
        projectId: projectId.trim(),
        clientId: clientId.trim(),
        clientName: clientName.trim() || undefined,
        contractType,
        originalValue: parseFloat(originalValue),
        description: description.trim() || undefined,
        retentionPercentage: parseFloat(retentionPercentage) || 5,
        retentionLimit: retentionLimit ? parseFloat(retentionLimit) : undefined,
        defectsLiabilityPeriod: parseInt(defectsLiabilityPeriod) || 12,
        cisApplicable,
        cisRate: cisApplicable ? parseFloat(cisRate) : undefined,
      }

      const res = await fetch('/api/finance/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create contract')
      }

      const contract = await res.json()
      router.push(`/finance/contracts/${contract.id}`)
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
          href="/finance/contracts"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Contracts
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Construction Contract</h1>
        <p className="mt-1 text-sm text-gray-500">Create a new construction contract for application-based billing</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Contract Details */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contract Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Contract Reference */}
            <div>
              <label htmlFor="contractRef" className="label">
                Contract Reference <span className="text-red-500">*</span>
              </label>
              <input
                id="contractRef"
                type="text"
                required
                value={contractRef}
                onChange={(e) => setContractRef(e.target.value)}
                placeholder="e.g. CON-001"
                className={cn('input', validationErrors.contractRef && 'border-red-500')}
              />
              {validationErrors.contractRef && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.contractRef}</p>
              )}
            </div>

            {/* Project ID */}
            <div>
              <label htmlFor="projectId" className="label">
                Project ID <span className="text-red-500">*</span>
              </label>
              <input
                id="projectId"
                type="text"
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="e.g. PRJ-001"
                className={cn('input', validationErrors.projectId && 'border-red-500')}
              />
              {validationErrors.projectId && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.projectId}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">Will link to ETHOS project module</p>
            </div>

            {/* Contract Type */}
            <div>
              <label htmlFor="contractType" className="label">
                Contract Type <span className="text-red-500">*</span>
              </label>
              <select
                id="contractType"
                value={contractType}
                onChange={(e) => setContractType(e.target.value as 'FINANCE_NEC' | 'FINANCE_JCT' | 'FINANCE_BESPOKE')}
                className="input"
              >
                <option value="FINANCE_NEC">NEC</option>
                <option value="FINANCE_JCT">JCT</option>
                <option value="FINANCE_BESPOKE">Bespoke</option>
              </select>
            </div>

            {/* Client ID */}
            <div>
              <label htmlFor="clientId" className="label">
                Client ID <span className="text-red-500">*</span>
              </label>
              <input
                id="clientId"
                type="text"
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g. CL-001"
                className={cn('input', validationErrors.clientId && 'border-red-500')}
              />
              {validationErrors.clientId && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.clientId}</p>
              )}
            </div>

            {/* Client Name */}
            <div>
              <label htmlFor="clientName" className="label">
                Client Name
              </label>
              <input
                id="clientName"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. ABC Construction Ltd"
                className="input"
              />
            </div>

            {/* Original Contract Value */}
            <div>
              <label htmlFor="originalValue" className="label">
                Original Contract Value <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                <input
                  id="originalValue"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={originalValue}
                  onChange={(e) => setOriginalValue(e.target.value)}
                  placeholder="0.00"
                  className={cn('input pl-7 font-mono', validationErrors.originalValue && 'border-red-500')}
                />
              </div>
              {validationErrors.originalValue && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.originalValue}</p>
              )}
            </div>

            {/* Description */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="description" className="label">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the contract scope of works..."
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Retention Section */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Retention</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Retention Percentage */}
            <div>
              <label htmlFor="retentionPercentage" className="label">
                Retention Percentage
              </label>
              <div className="relative">
                <input
                  id="retentionPercentage"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={retentionPercentage}
                  onChange={(e) => setRetentionPercentage(e.target.value)}
                  className={cn('input pr-8 font-mono', validationErrors.retentionPercentage && 'border-red-500')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
              {validationErrors.retentionPercentage && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.retentionPercentage}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">Typically 5% for construction contracts</p>
            </div>

            {/* Retention Limit */}
            <div>
              <label htmlFor="retentionLimit" className="label">
                Retention Limit (Cap)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                <input
                  id="retentionLimit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={retentionLimit}
                  onChange={(e) => setRetentionLimit(e.target.value)}
                  placeholder="No limit"
                  className="input pl-7 font-mono"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">Optional maximum retention amount</p>
            </div>

            {/* Defects Liability Period */}
            <div>
              <label htmlFor="defectsLiabilityPeriod" className="label">
                Defects Liability Period
              </label>
              <div className="relative">
                <input
                  id="defectsLiabilityPeriod"
                  type="number"
                  min="0"
                  value={defectsLiabilityPeriod}
                  onChange={(e) => setDefectsLiabilityPeriod(e.target.value)}
                  className="input pr-16 font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">months</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">Period after practical completion before final retention release</p>
            </div>
          </div>
        </div>

        {/* CIS Section */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">CIS (Construction Industry Scheme)</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* CIS Applicable */}
            <div className="flex items-start gap-3 sm:col-span-2 lg:col-span-3">
              <input
                id="cisApplicable"
                type="checkbox"
                checked={cisApplicable}
                onChange={(e) => setCisApplicable(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <label htmlFor="cisApplicable" className="text-sm font-medium text-gray-700 cursor-pointer">
                  CIS Applicable
                </label>
                <p className="text-xs text-gray-400">
                  Tick if CIS deductions apply to this contract. The client will deduct CIS from certified payments.
                </p>
              </div>
            </div>

            {/* CIS Rate */}
            {cisApplicable && (
              <div>
                <label htmlFor="cisRate" className="label">
                  CIS Deduction Rate <span className="text-red-500">*</span>
                </label>
                <select
                  id="cisRate"
                  value={cisRate}
                  onChange={(e) => setCisRate(e.target.value)}
                  className={cn('input', validationErrors.cisRate && 'border-red-500')}
                >
                  <option value="20">20% (Standard)</option>
                  <option value="30">30% (Higher Rate)</option>
                </select>
                {validationErrors.cisRate && (
                  <p className="mt-1 text-xs text-red-600">{validationErrors.cisRate}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  20% for registered subcontractors, 30% for unregistered
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between">
          <Link href="/finance/contracts" className="btn-ghost">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            <Save size={16} className="mr-2" />
            {loading ? 'Creating...' : 'Create Contract'}
          </button>
        </div>
      </form>
    </div>
  )
}
