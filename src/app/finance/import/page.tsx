'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Download,
  Users,
  Building2,
  BookOpen,
  Scale,
  Package,
  ShoppingCart,
  Receipt,
  X,
  FileDown,
  Eye,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────

interface ValidationRow {
  rowIndex: number
  status: 'valid' | 'error' | 'warning'
  messages: string[]
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

// ── Import type definitions ──────────────────────────────

const IMPORT_TYPES = [
  {
    key: 'customers',
    label: 'Customers',
    description: 'Import customer records from Sage/Sicon',
    icon: Users,
    colour: 'blue',
  },
  {
    key: 'suppliers',
    label: 'Suppliers',
    description: 'Import supplier records from Sage/Sicon',
    icon: Building2,
    colour: 'violet',
  },
  {
    key: 'accounts',
    label: 'Chart of Accounts',
    description: 'Import nominal / account codes',
    icon: BookOpen,
    colour: 'emerald',
  },
  {
    key: 'balances',
    label: 'Opening Balances',
    description: 'Import opening balance journal entry',
    icon: Scale,
    colour: 'amber',
  },
  {
    key: 'products',
    label: 'Products & BOMs',
    description: 'Import product records linked to projects',
    icon: Package,
    colour: 'cyan',
  },
  {
    key: 'purchase-orders',
    label: 'Outstanding Purchase Orders',
    description: 'Import outstanding POs from Sage',
    icon: ShoppingCart,
    colour: 'orange',
  },
  {
    key: 'sales-invoices',
    label: 'Outstanding Sales Invoices',
    description: 'Import outstanding sales invoices from Sage',
    icon: Receipt,
    colour: 'rose',
  },
] as const

// ETHOS target fields per import type (for column mapping dropdowns)
const ETHOS_FIELDS: Record<string, { value: string; label: string; required?: boolean }[]> = {
  customers: [
    { value: 'name', label: 'Name', required: true },
    { value: 'customerType', label: 'Customer Type' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'addressLine1', label: 'Address Line 1' },
    { value: 'addressLine2', label: 'Address Line 2' },
    { value: 'city', label: 'City' },
    { value: 'county', label: 'County' },
    { value: 'postcode', label: 'Postcode' },
    { value: 'paymentTermsDays', label: 'Payment Terms (Days)' },
    { value: 'vatNumber', label: 'VAT Number' },
    { value: 'accountCode', label: 'Account Code' },
    { value: 'paymentTerms', label: 'Payment Terms Text' },
    { value: 'notes', label: 'Notes' },
  ],
  suppliers: [
    { value: 'name', label: 'Name', required: true },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'addressLine1', label: 'Address Line 1' },
    { value: 'addressLine2', label: 'Address Line 2' },
    { value: 'city', label: 'City' },
    { value: 'county', label: 'County' },
    { value: 'postcode', label: 'Postcode' },
    { value: 'whatTheySupply', label: 'What They Supply' },
    { value: 'paymentTermsDays', label: 'Payment Terms (Days)' },
    { value: 'vatNumber', label: 'VAT Number' },
    { value: 'accountCode', label: 'Account Code' },
    { value: 'paymentTerms', label: 'Payment Terms Text' },
    { value: 'notes', label: 'Notes' },
  ],
  accounts: [
    { value: 'code', label: 'Account Code', required: true },
    { value: 'name', label: 'Account Name', required: true },
    { value: 'type', label: 'Type (ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE)', required: true },
    { value: 'balanceType', label: 'Balance Type (DEBIT/CREDIT)' },
    { value: 'subType', label: 'Sub Type' },
    { value: 'description', label: 'Description' },
    { value: 'vatCode', label: 'VAT Code' },
  ],
  balances: [
    { value: 'accountCode', label: 'Account Code', required: true },
    { value: 'description', label: 'Description' },
    { value: 'debit', label: 'Debit Amount' },
    { value: 'credit', label: 'Credit Amount' },
  ],
  products: [
    { value: 'projectNumber', label: 'Project Number', required: true },
    { value: 'partCode', label: 'Part Code' },
    { value: 'description', label: 'Description', required: true },
    { value: 'additionalDetails', label: 'Additional Details' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'jobNumber', label: 'Job Number' },
    { value: 'drawingNumber', label: 'Drawing Number' },
  ],
  'purchase-orders': [
    { value: 'poNumber', label: 'PO Number' },
    { value: 'supplierName', label: 'Supplier Name', required: true },
    { value: 'projectNumber', label: 'Project Number', required: true },
    { value: 'description', label: 'Line Description', required: true },
    { value: 'quantity', label: 'Quantity' },
    { value: 'unitCost', label: 'Unit Cost' },
    { value: 'dateRaised', label: 'Date Raised' },
    { value: 'expectedDelivery', label: 'Expected Delivery' },
    { value: 'notes', label: 'Notes' },
  ],
  'sales-invoices': [
    { value: 'invoiceNumber', label: 'Invoice Number', required: true },
    { value: 'customerName', label: 'Customer Name', required: true },
    { value: 'projectNumber', label: 'Project Number' },
    { value: 'description', label: 'Line Description', required: true },
    { value: 'quantity', label: 'Quantity' },
    { value: 'unitPrice', label: 'Unit Price' },
    { value: 'netAmount', label: 'Net Amount' },
    { value: 'vatAmount', label: 'VAT Amount' },
    { value: 'invoiceDate', label: 'Invoice Date' },
    { value: 'dueDate', label: 'Due Date' },
    { value: 'notes', label: 'Notes' },
  ],
}

// Colour lookup for import type cards
const COLOUR_MAP: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', icon: 'text-blue-500' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-700', icon: 'text-violet-500' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', icon: 'text-emerald-500' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', icon: 'text-amber-500' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700', icon: 'text-cyan-500' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', icon: 'text-orange-500' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', icon: 'text-rose-500' },
}

const STATUS_BADGES: Record<string, string> = {
  IMPORT_PENDING: 'bg-gray-100 text-gray-700',
  IMPORT_VALIDATING: 'bg-amber-100 text-amber-700',
  IMPORT_VALIDATED: 'bg-blue-100 text-blue-700',
  IMPORT_IMPORTING: 'bg-amber-100 text-amber-700',
  IMPORT_COMPLETED: 'bg-green-100 text-green-700',
  IMPORT_FAILED: 'bg-red-100 text-red-700',
}

// ── Component ─────────────────────────────────────────────

export default function ImportWizardPage() {
  // Wizard step: 1=select type, 2=upload, 3=map columns, 4=validate, 5=preview/dry-run, 6=execute, 7=done
  const [step, setStep] = useState(1)
  const [importType, setImportType] = useState('')

  // CSV data
  const [fileName, setFileName] = useState('')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([]) // First 10 for display
  const [csvAllRows, setCsvAllRows] = useState<string[][]>([])         // All rows for validate/execute
  const [totalRowCount, setTotalRowCount] = useState(0)

  // Field mapping: { csvColumnIndex: ethosField }
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})

  // Validation
  const [validationRows, setValidationRows] = useState<ValidationRow[]>([])
  const [validCount, setValidCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [warningCount, setWarningCount] = useState(0)

  // Dry run / execution
  const [dryRunResult, setDryRunResult] = useState<{
    created: number
    skipped: number
    errors: { row: number; message: string }[]
  } | null>(null)
  const [executeResult, setExecuteResult] = useState<{
    created: number
    skipped: number
    errors: { row: number; message: string }[]
  } | null>(null)

  // Loading states
  const [uploading, setUploading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [dryRunning, setDryRunning] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0)

  // Past imports
  const [pastImports, setPastImports] = useState<PastImport[]>([])
  const [loadingPast, setLoadingPast] = useState(true)

  // Drag-and-drop state
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Error
  const [error, setError] = useState<string | null>(null)

  // ── Fetch past imports ────────────────────────────────

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

  // ── File upload handler ───────────────────────────────

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.csv')) {
        setError('Please upload a CSV file (.csv)')
        return
      }

      setUploading(true)
      setError(null)
      setFileName(file.name)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('importType', importType)

        const res = await fetch('/api/import/preview', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to parse CSV')
          return
        }

        setCsvHeaders(data.headers)
        setCsvPreviewRows(data.previewRows || data.rows || [])
        setCsvAllRows(data.allRows || data.rows || [])
        setTotalRowCount(data.rowCount)

        // Auto-map columns by fuzzy matching header names to ETHOS fields
        const autoMapping: Record<string, string> = {}
        const fields = ETHOS_FIELDS[importType] || []
        data.headers.forEach((header: string, idx: number) => {
          const normalised = header.toLowerCase().replace(/[\s_-]/g, '')
          for (const field of fields) {
            const fieldNorm = field.value.toLowerCase().replace(/[\s_-]/g, '')
            const labelNorm = field.label.toLowerCase().replace(/[\s_-]/g, '')
            if (normalised === fieldNorm || normalised === labelNorm || normalised.includes(fieldNorm) || fieldNorm.includes(normalised)) {
              autoMapping[String(idx)] = field.value
              break
            }
          }
        })
        setFieldMapping(autoMapping)
        setStep(3)
      } catch {
        setError('Failed to upload file')
      } finally {
        setUploading(false)
      }
    },
    [importType]
  )

  // ── Drag-and-drop handlers ────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileUpload(file)
    },
    [handleFileUpload]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileUpload(file)
    },
    [handleFileUpload]
  )

  // ── Validation ────────────────────────────────────────

  async function handleValidate() {
    setValidating(true)
    setError(null)
    setProgressPercent(0)

    try {
      // Re-parse the full CSV data for validation (we only have first 10 preview rows)
      // Use the field mapping + all rows
      const res = await fetch('/api/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importType,
          fieldMapping,
          data: csvAllRows,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Validation failed')
        return
      }

      setValidationRows(data.rows || [])
      setValidCount(data.valid || 0)
      setErrorCount(data.errors || 0)
      setWarningCount(data.warnings || 0)
      setProgressPercent(100)
      setStep(4)
    } catch {
      setError('Validation request failed')
    } finally {
      setValidating(false)
    }
  }

  // ── Dry Run ───────────────────────────────────────────

  async function handleDryRun() {
    setDryRunning(true)
    setError(null)

    try {
      const res = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importType,
          fieldMapping,
          data: csvAllRows,
          dryRun: true,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Dry run failed')
        return
      }

      setDryRunResult(data)
      setStep(5)
    } catch {
      setError('Dry run request failed')
    } finally {
      setDryRunning(false)
    }
  }

  // ── Execute ───────────────────────────────────────────

  async function handleExecute() {
    setExecuting(true)
    setError(null)
    setProgressPercent(0)

    // Simulate progress
    const interval = setInterval(() => {
      setProgressPercent((p) => Math.min(p + 5, 90))
    }, 200)

    try {
      const res = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importType,
          fieldMapping,
          data: csvAllRows,
          dryRun: false,
        }),
      })

      clearInterval(interval)
      setProgressPercent(100)

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Import execution failed')
        return
      }

      setExecuteResult(data)
      setStep(7)
      fetchPastImports()
    } catch {
      clearInterval(interval)
      setError('Import execution failed')
    } finally {
      setExecuting(false)
    }
  }

  // ── Reset ─────────────────────────────────────────────

  function handleReset() {
    setStep(1)
    setImportType('')
    setFileName('')
    setCsvHeaders([])
    setCsvPreviewRows([])
    setCsvAllRows([])
    setTotalRowCount(0)
    setFieldMapping({})
    setValidationRows([])
    setValidCount(0)
    setErrorCount(0)
    setWarningCount(0)
    setDryRunResult(null)
    setExecuteResult(null)
    setProgressPercent(0)
    setError(null)
  }

  // ── Helpers ───────────────────────────────────────────

  const currentImportType = IMPORT_TYPES.find((t) => t.key === importType)
  const currentFields = ETHOS_FIELDS[importType] || []

  function getMappedFieldsCount(): number {
    return Object.values(fieldMapping).filter((v) => v && v !== 'skip').length
  }

  function getRequiredFieldsMapped(): boolean {
    const required = currentFields.filter((f) => f.required).map((f) => f.value)
    const mapped = new Set(Object.values(fieldMapping))
    return required.every((r) => mapped.has(r))
  }

  // ── Step labels ───────────────────────────────────────

  const STEPS = [
    { num: 1, label: 'Select Type' },
    { num: 2, label: 'Upload CSV' },
    { num: 3, label: 'Map Fields' },
    { num: 4, label: 'Validate' },
    { num: 5, label: 'Preview' },
    { num: 6, label: 'Import' },
    { num: 7, label: 'Complete' },
  ]

  // ── Render ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Import Wizard</h1>
          <p className="text-sm text-gray-500">
            Migrate data from Sage / Sicon into ETHOS step by step
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/finance/export" className="btn-secondary flex items-center gap-2">
            <Database size={16} />
            Export Data
          </Link>
          {step > 1 && (
            <button onClick={handleReset} className="btn-ghost flex items-center gap-2 text-sm">
              <X size={16} />
              Start Over
            </button>
          )}
        </div>
      </div>

      {/* Step indicator */}
      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px]">
          {STEPS.map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors',
                  step > s.num
                    ? 'bg-green-500 text-white'
                    : step === s.num
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                )}
              >
                {step > s.num ? <CheckCircle size={16} /> : s.num}
              </div>
              <span
                className={cn(
                  'ml-2 text-sm font-medium whitespace-nowrap',
                  step > s.num
                    ? 'text-green-600'
                    : step === s.num
                      ? 'text-blue-600'
                      : 'text-gray-400'
                )}
              >
                {s.label}
              </span>
              {idx < STEPS.length - 1 && (
                <ArrowRight size={16} className="mx-3 text-gray-300 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-start gap-3">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          STEP 1: Select Import Type
         ═══════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Select Import Type</h2>
          <p className="text-sm text-gray-500 mb-6">
            Choose what type of data you want to import from Sage or Sicon.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {IMPORT_TYPES.map((t) => {
              const Icon = t.icon
              const colours = COLOUR_MAP[t.colour]
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    setImportType(t.key)
                    setStep(2)
                  }}
                  className={cn(
                    'rounded-lg border-2 p-5 text-left transition-all hover:shadow-md',
                    `hover:${colours.border} hover:${colours.bg}`,
                    'border-gray-200 bg-white'
                  )}
                >
                  <Icon size={28} className={colours.icon} />
                  <div className="font-semibold text-gray-900 mt-3">{t.label}</div>
                  <div className="text-sm text-gray-500 mt-1">{t.description}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          STEP 2: Upload CSV
         ═══════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Upload CSV — {currentImportType?.label}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload a CSV file exported from Sage or Sicon, or download our template first.
              </p>
            </div>
            <a
              href={`/api/import/template?type=${importType}`}
              download
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <FileDown size={16} />
              Download Template
            </a>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
              isDragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <RefreshCw size={40} className="text-blue-500 animate-spin" />
                <p className="text-sm text-gray-500">Parsing CSV file...</p>
              </div>
            ) : fileName ? (
              <div className="flex flex-col items-center gap-3">
                <FileText size={40} className="text-green-500" />
                <p className="text-sm font-medium text-gray-700">{fileName}</p>
                <p className="text-xs text-gray-400">Click or drop a new file to replace</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload size={40} className="text-gray-400" />
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600">Click to browse</span> or drag and drop
                  a CSV file here
                </p>
                <p className="text-xs text-gray-400">Only .csv files are accepted</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setStep(1)}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          STEP 3: Map CSV Columns to ETHOS Fields
         ═══════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Map Fields — {currentImportType?.label}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Map each CSV column to the corresponding ETHOS field.{' '}
                  <span className="text-red-600 font-medium">* = required</span>.
                  {' '}{getMappedFieldsCount()} of {csvHeaders.length} columns mapped.
                </p>
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-medium">{totalRowCount}</span> data rows in file
              </div>
            </div>

            {/* Required fields warning */}
            {!getRequiredFieldsMapped() && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700 mb-4 flex items-center gap-2">
                <AlertTriangle size={16} />
                Some required fields are not mapped. Please map all required fields before proceeding.
              </div>
            )}

            {/* Column mapping table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      CSV Column
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      Sample Data
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 w-72">
                      ETHOS Field
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {csvHeaders.map((header, idx) => {
                    const sampleValues = csvPreviewRows
                      .slice(0, 3)
                      .map((row) => row[idx] || '')
                      .filter(Boolean)
                      .join(' | ')

                    const mappedField = fieldMapping[String(idx)] || ''
                    const isRequired = currentFields.some(
                      (f) => f.value === mappedField && f.required
                    )

                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-medium text-gray-900">
                            {header}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500 truncate block max-w-xs">
                            {sampleValues || '(empty)'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={mappedField}
                            onChange={(e) => {
                              setFieldMapping((prev) => ({
                                ...prev,
                                [String(idx)]: e.target.value,
                              }))
                            }}
                            className={cn(
                              'input text-sm py-1.5',
                              mappedField
                                ? isRequired
                                  ? 'border-green-300 bg-green-50'
                                  : 'border-blue-300 bg-blue-50'
                                : 'border-gray-300'
                            )}
                          >
                            <option value="">-- Skip this column --</option>
                            {currentFields.map((field) => (
                              <option key={field.value} value={field.value}>
                                {field.label}
                                {field.required ? ' *' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview table */}
          {csvPreviewRows.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Eye size={16} />
                Preview (first {Math.min(csvPreviewRows.length, 10)} of {totalRowCount} rows)
              </h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-12">
                        #
                      </th>
                      {csvHeaders.map((h, idx) => {
                        const mapped = fieldMapping[String(idx)]
                        return (
                          <th
                            key={idx}
                            className={cn(
                              'px-3 py-2 text-left text-xs font-medium whitespace-nowrap',
                              mapped ? 'text-blue-700 bg-blue-50' : 'text-gray-500'
                            )}
                          >
                            {h}
                            {mapped && (
                              <div className="text-[10px] font-normal text-blue-500">
                                → {currentFields.find((f) => f.value === mapped)?.label || mapped}
                              </div>
                            )}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {csvPreviewRows.slice(0, 10).map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 text-gray-400 font-mono text-xs">
                          {rowIdx + 1}
                        </td>
                        {row.map((cell, cellIdx) => {
                          const mapped = fieldMapping[String(cellIdx)]
                          return (
                            <td
                              key={cellIdx}
                              className={cn(
                                'px-3 py-1.5 whitespace-nowrap',
                                mapped ? 'bg-blue-50/50' : ''
                              )}
                            >
                              {cell || <span className="text-gray-300">--</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={handleValidate}
              disabled={!getRequiredFieldsMapped() || validating}
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
                  Validate Data
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          STEP 4: Validation Results
         ═══════════════════════════════════════════════════ */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Validation Results</h2>

            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="rounded-lg bg-gray-50 border p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Rows</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalRowCount}</p>
              </div>
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                <p className="text-xs text-green-600 uppercase tracking-wide">Valid</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{validCount}</p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
                <p className="text-xs text-amber-600 uppercase tracking-wide">Warnings</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{warningCount}</p>
              </div>
              <div
                className={cn(
                  'rounded-lg border p-4 text-center',
                  errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50'
                )}
              >
                <p
                  className={cn(
                    'text-xs uppercase tracking-wide',
                    errorCount > 0 ? 'text-red-600' : 'text-gray-500'
                  )}
                >
                  Errors
                </p>
                <p
                  className={cn(
                    'text-2xl font-bold mt-1',
                    errorCount > 0 ? 'text-red-700' : 'text-gray-900'
                  )}
                >
                  {errorCount}
                </p>
              </div>
            </div>

            {/* Validation detail table */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-16">
                      Row
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-24">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                      Messages
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {validationRows.map((vr) => (
                    <tr
                      key={vr.rowIndex}
                      className={cn(
                        vr.status === 'error'
                          ? 'bg-red-50'
                          : vr.status === 'warning'
                            ? 'bg-amber-50'
                            : 'bg-green-50/30'
                      )}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{vr.rowIndex + 1}</td>
                      <td className="px-3 py-2">
                        {vr.status === 'valid' && (
                          <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
                            <CheckCircle size={14} /> Valid
                          </span>
                        )}
                        {vr.status === 'warning' && (
                          <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-medium">
                            <AlertTriangle size={14} /> Warning
                          </span>
                        )}
                        {vr.status === 'error' && (
                          <span className="inline-flex items-center gap-1 text-red-700 text-xs font-medium">
                            <XCircle size={14} /> Error
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {vr.messages.join(' | ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(3)}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to Mapping
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDryRun}
                disabled={validCount === 0 || dryRunning}
                className="btn-secondary flex items-center gap-2"
              >
                {dryRunning ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Eye size={16} />
                    Preview Import (Dry Run)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          STEP 5: Dry Run Results / Confirm
         ═══════════════════════════════════════════════════ */}
      {step === 5 && dryRunResult && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Import Preview (Dry Run)
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              This is a preview of what will happen when you run the import. No records have been
              created yet.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center">
                <p className="text-xs text-green-600 uppercase tracking-wide">Will be created</p>
                <p className="text-3xl font-bold text-green-700 mt-2">{dryRunResult.created}</p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-6 text-center">
                <p className="text-xs text-amber-600 uppercase tracking-wide">Will be skipped</p>
                <p className="text-3xl font-bold text-amber-700 mt-2">{dryRunResult.skipped}</p>
              </div>
              <div
                className={cn(
                  'rounded-lg border p-6 text-center',
                  dryRunResult.errors.length > 0
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50'
                )}
              >
                <p
                  className={cn(
                    'text-xs uppercase tracking-wide',
                    dryRunResult.errors.length > 0 ? 'text-red-600' : 'text-gray-500'
                  )}
                >
                  Errors
                </p>
                <p
                  className={cn(
                    'text-3xl font-bold mt-2',
                    dryRunResult.errors.length > 0 ? 'text-red-700' : 'text-gray-900'
                  )}
                >
                  {dryRunResult.errors.length}
                </p>
              </div>
            </div>

            {/* Dry run errors */}
            {dryRunResult.errors.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-red-700 mb-2">Issues found:</h3>
                <div className="max-h-48 overflow-y-auto border border-red-200 rounded-lg">
                  {dryRunResult.errors.map((err, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 text-sm border-b border-red-100 last:border-0 text-red-700"
                    >
                      <span className="font-medium">Row {err.row}:</span> {err.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(4)}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to Validation
            </button>
            <button
              onClick={() => setStep(6)}
              disabled={dryRunResult.created === 0}
              className="btn-primary flex items-center gap-2 px-6"
            >
              Continue to Import
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          STEP 6: Confirm & Execute
         ═══════════════════════════════════════════════════ */}
      {step === 6 && (
        <div className="card text-center py-10">
          <Play size={48} className="mx-auto text-blue-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to Import</h2>
          <p className="text-sm text-gray-500 mb-2 max-w-lg mx-auto">
            This will create <span className="font-bold text-blue-600">{dryRunResult?.created || validCount}</span>{' '}
            record(s) in ETHOS as{' '}
            <span className="font-bold">{currentImportType?.label}</span>.
          </p>
          {(dryRunResult?.skipped || 0) > 0 && (
            <p className="text-sm text-amber-600 mb-4">
              {dryRunResult?.skipped} row(s) will be skipped due to errors.
            </p>
          )}
          <p className="text-xs text-gray-400 mb-8">
            This action cannot be undone. All records will be created in a single transaction.
          </p>

          {/* Progress bar */}
          {executing && (
            <div className="max-w-md mx-auto mb-6">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Importing... {progressPercent}%
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setStep(5)}
              disabled={executing}
              className="btn-secondary flex items-center gap-2"
            >
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
                  Confirm Import
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          STEP 7: Complete
         ═══════════════════════════════════════════════════ */}
      {step === 7 && executeResult && (
        <div className="card text-center py-10">
          <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Import Complete</h2>
          <p className="text-gray-500 mb-6">
            Successfully created{' '}
            <span className="font-bold text-green-600">{executeResult.created}</span> record(s)
            as <span className="font-bold">{currentImportType?.label}</span>.
          </p>

          {/* Results summary */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
              <p className="text-xs text-green-600">Created</p>
              <p className="text-xl font-bold text-green-700">{executeResult.created}</p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
              <p className="text-xs text-amber-600">Skipped</p>
              <p className="text-xl font-bold text-amber-700">{executeResult.skipped}</p>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center">
              <p className="text-xs text-red-600">Errors</p>
              <p className="text-xl font-bold text-red-700">{executeResult.errors.length}</p>
            </div>
          </div>

          {/* Error details */}
          {executeResult.errors.length > 0 && (
            <div className="max-w-lg mx-auto mb-6">
              <h3 className="text-sm font-semibold text-amber-700 mb-2">Import Errors</h3>
              <div className="max-h-40 overflow-y-auto border border-amber-200 rounded-lg text-left text-sm">
                {executeResult.errors.map((err, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 border-b border-amber-100 last:border-0 text-amber-800"
                  >
                    <span className="font-medium">Row {err.row}:</span> {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleReset} className="btn-primary px-8">
            Start New Import
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          Past Imports
         ═══════════════════════════════════════════════════ */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={20} />
          Import History
        </h2>
        {loadingPast ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw size={20} className="animate-spin text-gray-400" />
          </div>
        ) : pastImports.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No imports recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valid
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Imported
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Errors
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pastImports.map((imp) => (
                  <tr key={imp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(imp.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">
                      {imp.type.replace(/[-_]/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{imp.totalRows}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{imp.validRows}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {imp.importedRows}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{imp.errorRows}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          STATUS_BADGES[imp.status] || 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {imp.status.replace('IMPORT_', '')}
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
