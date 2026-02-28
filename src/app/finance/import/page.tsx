'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn, formatDate } from '@/lib/utils'
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Play,
  Database,
  Clock,
} from 'lucide-react'

interface ValidationError {
  row: number
  field: string
  message: string
}

interface PreviewRow {
  [key: string]: string
}

interface PastImport {
  id: string
  type: string
  filename: string
  totalRows: number
  validRows: number
  errorRows: number
  importedRows: number
  status: string
  createdAt: string
  completedAt: string | null
}

const IMPORT_TYPES = [
  { key: 'customers', label: 'Customers', description: 'Import customer records', icon: '👥' },
  { key: 'suppliers', label: 'Suppliers', description: 'Import supplier records', icon: '🏭' },
  { key: 'chart_of_accounts', label: 'Chart of Accounts', description: 'Import account codes', icon: '📊' },
  { key: 'opening_balances', label: 'Opening Balances', description: 'Import opening balance journal', icon: '📋' },
  { key: 'fixed_assets', label: 'Fixed Assets', description: 'Import fixed asset register', icon: '🏗' },
]

const CSV_TEMPLATES: Record<string, string> = {
  customers: 'code,name,contact_name,email,phone,address_line_1,city,postcode,vat_number,payment_terms\nCUST001,Acme Ltd,John Smith,john@acme.co.uk,020 1234 5678,123 High Street,London,SW1A 1AA,,30',
  suppliers: 'code,name,contact_name,email,phone,address_line_1,city,postcode,vat_number,payment_terms\nSUPP001,Parts Co,Jane Doe,jane@parts.co.uk,020 9876 5432,456 Low Road,Manchester,M1 1AA,,30',
  chart_of_accounts: 'code,name,type,sub_type,description\n1000,Cash at Bank,ASSET,Current Asset,Main bank account\n2000,Trade Creditors,LIABILITY,Current Liability,Amounts owed to suppliers\n4000,Sales Revenue,REVENUE,,Sales income\n5000,Cost of Sales,EXPENSE,,Direct costs',
  opening_balances: 'account_code,description,debit,credit\n1000,Cash at Bank,10000.00,\n1100,Trade Debtors,5000.00,\n2000,Trade Creditors,,8000.00\n3000,Share Capital,,7000.00',
  fixed_assets: 'name,description,category_name,purchase_date,purchase_cost,residual_value,serial_number,location\nOffice Laptop,Dell Latitude,Computer Equipment,2024-01-15,1200.00,100.00,SN123456,Head Office',
}

const STATUS_BADGES: Record<string, string> = {
  PENDING: 'badge-gray',
  VALIDATING: 'badge-warning',
  VALIDATED: 'badge-info',
  IMPORTING: 'badge-warning',
  COMPLETED: 'badge-success',
  FAILED: 'badge-danger',
}

export default function ImportPage() {
  // Wizard state
  const [step, setStep] = useState(1)
  const [importType, setImportType] = useState('')
  const [csvData, setCsvData] = useState('')
  const [validating, setValidating] = useState(false)
  const [executing, setExecuting] = useState(false)

  // Validation results
  const [importId, setImportId] = useState<string | null>(null)
  const [totalRows, setTotalRows] = useState(0)
  const [validRows, setValidRows] = useState(0)
  const [errorRows, setErrorRows] = useState(0)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])

  // Execution results
  const [executionResult, setExecutionResult] = useState<{
    importedRows: number
    errors: { row: number; error: string }[]
  } | null>(null)

  // Past imports
  const [pastImports, setPastImports] = useState<PastImport[]>([])
  const [loadingPast, setLoadingPast] = useState(true)

  // Error
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPastImports()
  }, [])

  async function fetchPastImports() {
    try {
      setLoadingPast(true)
      const res = await fetch('/api/finance/import')
      if (res.ok) {
        const data = await res.json()
        setPastImports(data.data || [])
      }
    } catch {
      // Ignore
    } finally {
      setLoadingPast(false)
    }
  }

  async function handleValidate() {
    try {
      setValidating(true)
      setError(null)

      const res = await fetch('/api/finance/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: importType, data: csvData }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Validation failed')
        return
      }

      setImportId(data.importId)
      setTotalRows(data.totalRows)
      setValidRows(data.validRows)
      setErrorRows(data.errorRows)
      setErrors(data.errors || [])
      setPreview(data.preview || [])
      setHeaders(data.headers || [])
      setStep(3)
    } catch (err) {
      setError('Failed to validate CSV data')
    } finally {
      setValidating(false)
    }
  }

  async function handleExecute() {
    if (!importId) return
    try {
      setExecuting(true)
      setError(null)

      const res = await fetch(`/api/finance/import/${importId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: csvData }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Import execution failed')
        return
      }

      setExecutionResult({
        importedRows: data.importedRows,
        errors: data.errors || [],
      })
      setStep(5)
      fetchPastImports()
    } catch (err) {
      setError('Failed to execute import')
    } finally {
      setExecuting(false)
    }
  }

  function handleReset() {
    setStep(1)
    setImportType('')
    setCsvData('')
    setImportId(null)
    setTotalRows(0)
    setValidRows(0)
    setErrorRows(0)
    setErrors([])
    setPreview([])
    setHeaders([])
    setExecutionResult(null)
    setError(null)
  }

  function loadTemplate() {
    if (importType && CSV_TEMPLATES[importType]) {
      setCsvData(CSV_TEMPLATES[importType])
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Import</h1>
          <p className="text-sm text-gray-500">Import data from CSV files into the accounting system</p>
        </div>
        <Link href="/finance/export" className="btn-secondary flex items-center gap-2">
          <Database size={16} />
          Export Data
        </Link>
      </div>

      {/* Step indicator */}
      <div className="card">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Select Type' },
            { num: 2, label: 'Enter Data' },
            { num: 3, label: 'Validate' },
            { num: 4, label: 'Execute' },
            { num: 5, label: 'Complete' },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold',
                step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              )}>
                {step > s.num ? <CheckCircle size={16} /> : s.num}
              </div>
              <span className={cn(
                'ml-2 text-sm font-medium',
                step >= s.num ? 'text-blue-600' : 'text-gray-400'
              )}>
                {s.label}
              </span>
              {idx < 4 && (
                <ArrowRight size={16} className="mx-4 text-gray-300" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Step 1: Select Type */}
      {step === 1 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Import Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {IMPORT_TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => { setImportType(t.key); setStep(2) }}
                className={cn(
                  'rounded-lg border-2 p-6 text-left transition-colors hover:border-blue-300 hover:bg-blue-50',
                  importType === t.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                )}
              >
                <div className="text-2xl mb-2">{t.icon}</div>
                <div className="font-semibold text-gray-900">{t.label}</div>
                <div className="text-sm text-gray-500 mt-1">{t.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Enter CSV Data */}
      {step === 2 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Enter CSV Data ({IMPORT_TYPES.find(t => t.key === importType)?.label})
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={loadTemplate} className="btn-ghost text-sm">
                Load Template
              </button>
            </div>
          </div>

          <textarea
            className="input font-mono text-sm"
            rows={15}
            placeholder="Paste your CSV data here, or click 'Load Template' for an example..."
            value={csvData}
            onChange={e => setCsvData(e.target.value)}
          />

          <div className="flex items-center justify-between mt-4">
            <button onClick={() => setStep(1)} className="btn-secondary flex items-center gap-2">
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={handleValidate}
              disabled={!csvData.trim() || validating}
              className="btn-primary flex items-center gap-2"
            >
              {validating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Validate
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Validation Results */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Validation Results</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-md bg-gray-50 p-4 text-center">
                <p className="text-sm text-gray-500">Total Rows</p>
                <p className="text-2xl font-bold text-gray-900">{totalRows}</p>
              </div>
              <div className="rounded-md bg-green-50 p-4 text-center">
                <p className="text-sm text-green-600">Valid Rows</p>
                <p className="text-2xl font-bold text-green-600">{validRows}</p>
              </div>
              <div className={cn(
                'rounded-md p-4 text-center',
                errorRows > 0 ? 'bg-red-50' : 'bg-gray-50'
              )}>
                <p className={cn('text-sm', errorRows > 0 ? 'text-red-600' : 'text-gray-500')}>Error Rows</p>
                <p className={cn('text-2xl font-bold', errorRows > 0 ? 'text-red-600' : 'text-gray-900')}>{errorRows}</p>
              </div>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-red-700 mb-2">Validation Errors</h3>
                <div className="max-h-48 overflow-y-auto border border-red-200 rounded-md">
                  <table className="min-w-full text-sm">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-red-700">Row</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-red-700">Field</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-red-700">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {errors.map((err, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-1.5">{err.row}</td>
                          <td className="px-3 py-1.5 font-mono">{err.field}</td>
                          <td className="px-3 py-1.5">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Preview */}
            {preview.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Preview (first 10 valid rows)</h3>
                <div className="overflow-x-auto border rounded-md">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {headers.map(h => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-700 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {preview.map((row, idx) => (
                        <tr key={idx}>
                          {headers.map(h => (
                            <td key={h} className="px-3 py-1.5 whitespace-nowrap">
                              {row[h] || ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(2)} className="btn-secondary flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Edit
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={validRows === 0}
              className="btn-primary flex items-center gap-2"
            >
              Continue to Import
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Execute */}
      {step === 4 && (
        <div className="card text-center py-8">
          <Play size={48} className="mx-auto text-blue-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Ready to Import</h2>
          <p className="text-sm text-gray-500 mb-6">
            This will import <strong>{validRows}</strong> valid row(s) into the system as{' '}
            <strong>{IMPORT_TYPES.find(t => t.key === importType)?.label}</strong>.
            {errorRows > 0 && (
              <span className="text-amber-600"> {errorRows} row(s) with errors will be skipped.</span>
            )}
          </p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setStep(3)} className="btn-secondary flex items-center gap-2">
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={handleExecute}
              disabled={executing}
              className="btn-primary flex items-center gap-2 px-8"
            >
              {executing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Execute Import
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Complete */}
      {step === 5 && executionResult && (
        <div className="card text-center py-8">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Import Complete</h2>
          <p className="text-sm text-gray-500 mb-4">
            Successfully imported <strong>{executionResult.importedRows}</strong> record(s).
          </p>

          {executionResult.errors.length > 0 && (
            <div className="max-w-lg mx-auto mb-4">
              <h3 className="text-sm font-semibold text-amber-700 mb-2">Import Warnings</h3>
              <div className="max-h-32 overflow-y-auto border border-amber-200 rounded-md text-left text-sm">
                {executionResult.errors.map((err, idx) => (
                  <div key={idx} className="px-3 py-1.5 border-b border-amber-100 last:border-0">
                    Row {err.row}: {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleReset} className="btn-primary">
            Start New Import
          </button>
        </div>
      )}

      {/* Past Imports */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={20} />
          Past Imports
        </h2>
        {loadingPast ? (
          <div className="flex items-center justify-center py-6">
            <RefreshCw size={20} className="animate-spin text-gray-400" />
          </div>
        ) : pastImports.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No imports recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Type</th>
                  <th className="table-header text-right">Total</th>
                  <th className="table-header text-right">Valid</th>
                  <th className="table-header text-right">Imported</th>
                  <th className="table-header text-right">Errors</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pastImports.map(imp => (
                  <tr key={imp.id}>
                    <td className="table-cell text-sm">{formatDate(imp.createdAt)}</td>
                    <td className="table-cell capitalize">{imp.type.replace(/_/g, ' ')}</td>
                    <td className="table-cell text-right">{imp.totalRows}</td>
                    <td className="table-cell text-right">{imp.validRows}</td>
                    <td className="table-cell text-right">{imp.importedRows}</td>
                    <td className="table-cell text-right">{imp.errorRows}</td>
                    <td className="table-cell">
                      <span className={STATUS_BADGES[imp.status] || 'badge-gray'}>
                        {imp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
