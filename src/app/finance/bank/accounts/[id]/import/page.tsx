'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  FileUp,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Building2,
} from 'lucide-react'

interface BankAccount {
  id: string
  accountName: string
  accountNumber: string
  sortCode: string
}

interface ParsedRow {
  date: string
  description: string
  reference: string
  amount: number | null
  debit: number | null
  credit: number | null
  selected: boolean
  error: string | null
}

interface ImportResult {
  imported: number
  skipped: number
  errors: string[] | number
  newBalance?: string
  details?: string[]
}

const COLUMN_OPTIONS = [
  { value: '', label: '-- Skip --' },
  { value: 'date', label: 'Date' },
  { value: 'description', label: 'Description' },
  { value: 'reference', label: 'Reference' },
  { value: 'amount', label: 'Amount (+/-)' },
  { value: 'debit', label: 'Debit (out)' },
  { value: 'credit', label: 'Credit (in)' },
]

export default function ImportStatementPage() {
  const params = useParams()
  const router = useRouter()
  const accountId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [account, setAccount] = useState<BankAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // CSV state
  const [file, setFile] = useState<File | null>(null)
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({})
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [hasHeaders, setHasHeaders] = useState(true)

  // Fetch account details
  useEffect(() => {
    async function fetchAccount() {
      try {
        setLoading(true)
        const res = await fetch(`/api/finance/bank/accounts/${accountId}`)
        if (!res.ok) throw new Error('Failed to load bank account')
        const data = await res.json()
        setAccount(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchAccount()
  }, [accountId])

  // Parse CSV file
  function parseCSV(text: string): string[][] {
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    return lines.map((line) => {
      const result: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    })
  }

  // Auto-detect column mappings
  function autoDetectColumns(headers: string[]) {
    const mapping: Record<number, string> = {}

    headers.forEach((header, index) => {
      const h = header.toLowerCase().trim()
      if (h.includes('date') || h === 'txn date' || h === 'transaction date') {
        mapping[index] = 'date'
      } else if (
        h.includes('description') ||
        h.includes('narrative') ||
        h.includes('details') ||
        h.includes('memo')
      ) {
        mapping[index] = 'description'
      } else if (h.includes('reference') || h.includes('ref') || h.includes('cheque')) {
        mapping[index] = 'reference'
      } else if (h === 'amount' || h === 'value' || h === 'transaction amount') {
        mapping[index] = 'amount'
      } else if (
        h.includes('debit') ||
        h === 'money out' ||
        h === 'paid out' ||
        h === 'withdrawal'
      ) {
        mapping[index] = 'debit'
      } else if (
        h.includes('credit') ||
        h === 'money in' ||
        h === 'paid in' ||
        h === 'deposit'
      ) {
        mapping[index] = 'credit'
      }
    })

    return mapping
  }

  // Handle file upload
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setImportResult(null)
    setError(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const rows = parseCSV(text)

      if (rows.length < 2) {
        setError('CSV file must have at least a header row and one data row')
        return
      }

      const headers = rows[0]
      const dataRows = rows.slice(1)

      setRawHeaders(headers)
      setRawRows(dataRows)

      // Auto-detect column mapping
      const mapping = autoDetectColumns(headers)
      setColumnMapping(mapping)
    }

    reader.readAsText(selectedFile)
  }

  // Handle drag & drop
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.type === 'text/csv')) {
      const fakeEvent = {
        target: { files: [droppedFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>
      handleFileSelect(fakeEvent)
    } else {
      setError('Please upload a CSV file')
    }
  }

  // Parse rows with current mapping
  useEffect(() => {
    if (rawRows.length === 0 || Object.keys(columnMapping).length === 0) {
      setParsedRows([])
      return
    }

    const dateCol = Object.entries(columnMapping).find(
      ([, v]) => v === 'date'
    )?.[0]
    const descCol = Object.entries(columnMapping).find(
      ([, v]) => v === 'description'
    )?.[0]
    const refCol = Object.entries(columnMapping).find(
      ([, v]) => v === 'reference'
    )?.[0]
    const amountCol = Object.entries(columnMapping).find(
      ([, v]) => v === 'amount'
    )?.[0]
    const debitCol = Object.entries(columnMapping).find(
      ([, v]) => v === 'debit'
    )?.[0]
    const creditCol = Object.entries(columnMapping).find(
      ([, v]) => v === 'credit'
    )?.[0]

    const parsed = rawRows.map((row): ParsedRow => {
      let rowError: string | null = null

      // Date
      const dateStr = dateCol !== undefined ? row[Number(dateCol)]?.trim() : ''
      if (!dateStr) rowError = 'Missing date'

      // Description
      const description =
        descCol !== undefined ? row[Number(descCol)]?.trim() || '' : ''

      // Reference
      const reference =
        refCol !== undefined ? row[Number(refCol)]?.trim() || '' : ''

      // Amount
      let amount: number | null = null
      let debit: number | null = null
      let credit: number | null = null

      if (amountCol !== undefined) {
        const rawAmount = row[Number(amountCol)]
          ?.trim()
          .replace(/[^0-9.\-]/g, '')
        amount = rawAmount ? parseFloat(rawAmount) : null
        if (amount !== null && isNaN(amount)) {
          amount = null
          rowError = rowError || 'Invalid amount'
        }
      } else {
        if (debitCol !== undefined) {
          const rawDebit = row[Number(debitCol)]
            ?.trim()
            .replace(/[^0-9.]/g, '')
          debit = rawDebit ? parseFloat(rawDebit) : null
          if (debit !== null && isNaN(debit)) debit = null
        }
        if (creditCol !== undefined) {
          const rawCredit = row[Number(creditCol)]
            ?.trim()
            .replace(/[^0-9.]/g, '')
          credit = rawCredit ? parseFloat(rawCredit) : null
          if (credit !== null && isNaN(credit)) credit = null
        }

        // Calculate net amount
        if (debit !== null || credit !== null) {
          amount = (credit || 0) - (debit || 0)
        }
      }

      if (amount === null && debit === null && credit === null) {
        rowError = rowError || 'No amount found'
      }

      return {
        date: dateStr,
        description,
        reference,
        amount,
        debit,
        credit,
        selected: !rowError,
        error: rowError,
      }
    })

    setParsedRows(parsed)
  }, [rawRows, columnMapping])

  // Toggle row selection
  function toggleRow(index: number) {
    setParsedRows((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], selected: !updated[index].selected }
      return updated
    })
  }

  // Stats
  const validRows = parsedRows.filter((r) => r.selected && !r.error)
  const errorRows = parsedRows.filter((r) => r.error)

  // Clear file
  function clearFile() {
    setFile(null)
    setRawHeaders([])
    setRawRows([])
    setColumnMapping({})
    setParsedRows([])
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Submit import
  async function handleImport() {
    if (validRows.length === 0) {
      setError('No valid rows to import')
      return
    }

    try {
      setImporting(true)
      setError(null)

      const formData = new FormData()
      if (file) {
        formData.append('file', file)
      }
      formData.append('hasHeaders', String(hasHeaders))
      formData.append('columnMapping', JSON.stringify(columnMapping))

      // Also send parsed data as a fallback
      const rows = validRows.map((r) => ({
        date: r.date,
        description: r.description,
        reference: r.reference,
        amount: r.amount,
      }))
      formData.append('parsedRows', JSON.stringify(rows))

      const res = await fetch(
        `/api/finance/bank/accounts/${accountId}/statement-import`,
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to import statement')
      }

      const result = await res.json()
      setImportResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="card p-12">
            <div className="h-32 bg-gray-200 rounded" />
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
        <Link
          href={`/finance/bank/accounts/${accountId}`}
          className="hover:text-gray-700"
        >
          {account?.accountName}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Import Statement</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <FileUp size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Import Bank Statement
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {account?.accountName} ({account?.sortCode} / {account?.accountNumber})
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 size={24} className="text-green-600" />
            <h3 className="text-lg font-semibold text-green-800">
              Import Complete
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-green-600">Imported</p>
              <p className="text-2xl font-bold text-green-700">
                {importResult.imported}
              </p>
            </div>
            <div>
              <p className="text-sm text-yellow-600">Skipped</p>
              <p className="text-2xl font-bold text-yellow-700">
                {importResult.skipped}
              </p>
            </div>
            <div>
              <p className="text-sm text-red-600">Errors</p>
              <p className="text-2xl font-bold text-red-700">
                {Array.isArray(importResult.errors)
                  ? importResult.errors.length
                  : importResult.errors}
              </p>
            </div>
          </div>
          {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
            <div className="text-sm text-red-700 space-y-1 mt-2">
              {importResult.errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}
          {importResult.newBalance && (
            <p className="text-sm text-green-700 mt-2">
              New account balance: {formatCurrency(parseFloat(importResult.newBalance))}
            </p>
          )}
          <div className="mt-4">
            <Link
              href={`/finance/bank/accounts/${accountId}`}
              className="btn-primary inline-flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700"
            >
              View Account
            </Link>
          </div>
        </div>
      )}

      {/* File Upload Zone */}
      {!file && !importResult && (
        <div
          className="card border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="p-12 text-center">
            <Upload size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload CSV File
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Drag and drop your bank statement CSV file here, or click to
              browse
            </p>
            <p className="text-xs text-gray-400">Accepts .csv files only</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* File Selected - Column Mapping */}
      {file && !importResult && (
        <>
          {/* File Info */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {rawRows.length} data rows found
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="btn-ghost text-sm inline-flex items-center gap-1"
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          </div>

          {/* Column Mapping */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Column Mapping
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Map each CSV column to the correct field. Columns are
              auto-detected where possible.
            </p>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="hasHeaders"
                checked={hasHeaders}
                onChange={(e) => setHasHeaders(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="hasHeaders" className="text-sm text-gray-700">
                First row contains headers
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {rawHeaders.map((header, index) => (
                <div key={index}>
                  <label className="label text-xs truncate" title={header}>
                    Col {index + 1}: {header}
                  </label>
                  <select
                    className="input w-full text-sm"
                    value={columnMapping[index] || ''}
                    onChange={(e) => {
                      setColumnMapping((prev) => ({
                        ...prev,
                        [index]: e.target.value,
                      }))
                    }}
                  >
                    {COLUMN_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Preview ({parsedRows.length} rows)
                </h2>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600">
                    {validRows.length} valid
                  </span>
                  {errorRows.length > 0 && (
                    <span className="text-red-600">
                      {errorRows.length} with errors
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="sticky top-0 bg-white">
                    <tr>
                      <th className="table-header w-12">Include</th>
                      <th className="table-header">Date</th>
                      <th className="table-header">Description</th>
                      <th className="table-header">Reference</th>
                      <th className="table-header text-right">Amount</th>
                      <th className="table-header">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {parsedRows.map((row, index) => (
                      <tr
                        key={index}
                        className={cn(
                          'hover:bg-gray-50',
                          row.error && 'bg-red-50',
                          !row.selected && !row.error && 'opacity-50'
                        )}
                      >
                        <td className="table-cell">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => toggleRow(index)}
                            disabled={!!row.error}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="table-cell">{row.date || '-'}</td>
                        <td className="table-cell">
                          {row.description || '-'}
                        </td>
                        <td className="table-cell text-gray-500">
                          {row.reference || '-'}
                        </td>
                        <td
                          className={cn(
                            'table-cell text-right font-medium',
                            row.amount !== null && row.amount >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          )}
                        >
                          {row.amount !== null
                            ? formatCurrency(row.amount)
                            : '-'}
                        </td>
                        <td className="table-cell">
                          {row.error ? (
                            <span className="badge-danger text-xs">
                              {row.error}
                            </span>
                          ) : (
                            <span className="badge-success text-xs">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pb-8">
            <Link
              href={`/finance/bank/accounts/${accountId}`}
              className="btn-ghost inline-flex items-center gap-2"
            >
              <X size={16} />
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              {importing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileUp size={16} />
              )}
              {importing
                ? 'Importing...'
                : `Import ${validRows.length} Transaction${validRows.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
