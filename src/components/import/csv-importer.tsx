"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, ClipboardPaste, Check, AlertTriangle, ArrowRight } from "lucide-react"

export type FieldMapping = {
  key: string
  label: string
  required: boolean
  description?: string
}

type ImporterProps = {
  title: string
  description: string
  fields: FieldMapping[]
  onImport: (rows: Record<string, string>[]) => Promise<{ success: number; errors: string[] }>
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }

  // Detect delimiter: tab (from Excel paste) or comma
  const firstLine = lines[0]
  const delimiter = firstLine.includes("\t") ? "\t" : ","

  const headers = firstLine.split(delimiter).map((h) => h.replace(/^"|"$/g, "").trim())
  const rows = lines.slice(1).map((line) =>
    line.split(delimiter).map((cell) => cell.replace(/^"|"$/g, "").trim())
  ).filter((row) => row.some((cell) => cell.length > 0))

  return { headers, rows }
}

export function CSVImporter({ title, description, fields, onImport }: ImporterProps) {
  const [step, setStep] = useState<"input" | "map" | "preview" | "result">("input")
  const [rawData, setRawData] = useState("")
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null)

  // Step 1: Parse input
  function handleParse() {
    const parsed = parseCSV(rawData)
    if (parsed.headers.length === 0) return
    setHeaders(parsed.headers)
    setRows(parsed.rows)

    // Auto-map by fuzzy matching header names to field labels
    const autoMap: Record<string, string> = {}
    fields.forEach((field) => {
      const match = parsed.headers.find((h) => {
        const hLower = h.toLowerCase().replace(/[_\s-]/g, "")
        const fLower = field.label.toLowerCase().replace(/[_\s-]/g, "")
        const kLower = field.key.toLowerCase().replace(/[_\s-]/g, "")
        return hLower === fLower || hLower === kLower || hLower.includes(fLower) || fLower.includes(hLower)
      })
      if (match) autoMap[field.key] = match
    })
    setMapping(autoMap)
    setStep("map")
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setRawData(ev.target?.result as string || "")
    }
    reader.readAsText(file)
  }

  // Step 2: Build mapped rows for preview
  function getMappedRows(): Record<string, string>[] {
    return rows.map((row) => {
      const mapped: Record<string, string> = {}
      fields.forEach((field) => {
        const sourceCol = mapping[field.key]
        if (sourceCol) {
          const colIdx = headers.indexOf(sourceCol)
          if (colIdx >= 0) mapped[field.key] = row[colIdx] || ""
        }
      })
      return mapped
    })
  }

  // Check required fields are mapped
  const requiredMapped = fields.filter((f) => f.required).every((f) => mapping[f.key])

  // Step 3: Import
  async function handleImport() {
    setImporting(true)
    try {
      const mappedRows = getMappedRows()
      const res = await onImport(mappedRows)
      setResult(res)
      setStep("result")
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setStep("input")
    setRawData("")
    setHeaders([])
    setRows([])
    setMapping({})
    setResult(null)
  }

  const selectClass = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-2 text-sm">
        {["input", "map", "preview", "result"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="h-3 w-3 text-gray-300" />}
            <Badge variant={step === s ? "default" : "outline"} className={step === s ? "" : "text-gray-400"}>
              {i + 1}. {s === "input" ? "Paste / Upload" : s === "map" ? "Map Columns" : s === "preview" ? "Preview" : "Done"}
            </Badge>
          </div>
        ))}
      </div>

      {/* Step 1: Input */}
      {step === "input" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-sm text-gray-500">{description}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ClipboardPaste className="h-4 w-4 text-gray-400" /> Paste from Excel
                </label>
                <p className="text-xs text-gray-400">Select rows in Excel (including header row), copy, and paste below</p>
                <textarea
                  value={rawData}
                  onChange={(e) => setRawData(e.target.value)}
                  className="w-full h-48 rounded-lg border border-border p-3 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Paste your data here... (tab-separated from Excel or comma-separated CSV)"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4 text-gray-400" /> Or upload CSV file
                </label>
                <p className="text-xs text-gray-400">Export from Sage or your system as CSV, then upload here</p>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="w-full rounded-lg border border-border p-3 text-sm"
                />
                {rawData && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-2 text-xs text-green-700">
                    Data loaded — {rawData.split("\n").length - 1} rows detected
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-gray-400">
                Fields: {fields.map((f) => f.label).join(", ")}
              </div>
              <Button onClick={handleParse} disabled={!rawData.trim()}>
                Next: Map Columns <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === "map" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Map Your Columns</CardTitle>
            <p className="text-sm text-gray-500">
              We found {headers.length} columns and {rows.length} rows. Map your columns to the system fields below.
              Auto-mapped fields are pre-selected.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              {fields.map((field) => (
                <div key={field.key} className="flex items-center gap-3 py-1">
                  <div className="w-48 shrink-0">
                    <span className="text-sm font-medium">{field.label}</span>
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                    {field.description && <p className="text-xs text-gray-400">{field.description}</p>}
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
                  <select
                    value={mapping[field.key] || ""}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                    className={`${selectClass} ${mapping[field.key] ? "border-green-300 bg-green-50" : ""}`}
                  >
                    <option value="">— Skip this field —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  {mapping[field.key] && (
                    <span className="text-xs text-gray-400 truncate max-w-[200px]">
                      e.g. &ldquo;{rows[0]?.[headers.indexOf(mapping[field.key])] || ""}&rdquo;
                    </span>
                  )}
                </div>
              ))}
            </div>

            {!requiredMapped && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 flex items-center gap-2 text-xs text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                Map all required fields (*) before continuing.
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("input")}>Back</Button>
              <Button onClick={() => setStep("preview")} disabled={!requiredMapped}>
                Next: Preview <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview Import — {rows.length} rows</CardTitle>
            <p className="text-sm text-gray-500">Check the mapped data looks correct before importing.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="border-b border-border bg-gray-50">
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">#</th>
                    {fields.filter((f) => mapping[f.key]).map((f) => (
                      <th key={f.key} className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {getMappedRows().slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5 text-xs text-gray-400">{i + 1}</td>
                      {fields.filter((f) => mapping[f.key]).map((f) => (
                        <td key={f.key} className="px-3 py-1.5 text-xs">{row[f.key] || <span className="text-gray-300">—</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 50 && (
              <div className="px-3 py-2 text-xs text-gray-400 border-t border-border">Showing first 50 of {rows.length} rows</div>
            )}
          </CardContent>
          <CardContent className="border-t border-border">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep("map")}>Back</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importing..." : `Import ${rows.length} rows`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Result */}
      {step === "result" && result && (
        <Card>
          <CardContent className="py-8 text-center space-y-4">
            {result.success > 0 && (
              <div className="flex items-center justify-center gap-2 text-green-700">
                <Check className="h-6 w-6" />
                <span className="text-lg font-semibold">{result.success} records imported successfully</span>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">{result.errors.length} rows had issues:</span>
                </div>
                <div className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-700 max-h-40 overflow-y-auto">
                  {result.errors.map((err, i) => <div key={i}>{err}</div>)}
                </div>
              </div>
            )}
            <Button onClick={reset} variant="outline">Import More</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
