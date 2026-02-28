/**
 * Pure TypeScript CSV parser — no external dependencies.
 * Handles:
 *  - Quoted fields (double-quote delimited)
 *  - Commas inside quoted fields
 *  - Newlines inside quoted fields
 *  - Escaped quotes ("" inside a quoted field)
 *  - Windows (\r\n) and Unix (\n) line endings
 *  - Trailing newlines / whitespace
 */

export interface ParsedCSV {
  headers: string[]
  rows: string[][]
}

enum State {
  FieldStart,
  UnquotedField,
  QuotedField,
  QuoteInQuotedField,
}

export function parseCSV(text: string): ParsedCSV {
  const headers: string[] = []
  const rows: string[][] = []

  if (!text || !text.trim()) {
    return { headers, rows }
  }

  // Normalise line endings
  const input = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

  let state = State.FieldStart
  let currentField = ""
  let currentRow: string[] = []
  let isHeaderRow = true

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]

    switch (state) {
      case State.FieldStart:
        if (ch === '"') {
          state = State.QuotedField
          currentField = ""
        } else if (ch === ",") {
          // Empty field
          currentRow.push(currentField.trim())
          currentField = ""
          // stay in FieldStart
        } else if (ch === "\n") {
          // End of row (possibly trailing empty field)
          currentRow.push(currentField.trim())
          if (isHeaderRow) {
            headers.push(...currentRow)
            isHeaderRow = false
          } else {
            // Only push non-empty rows
            if (currentRow.some((cell) => cell !== "")) {
              rows.push(currentRow)
            }
          }
          currentRow = []
          currentField = ""
        } else {
          state = State.UnquotedField
          currentField = ch
        }
        break

      case State.UnquotedField:
        if (ch === ",") {
          currentRow.push(currentField.trim())
          currentField = ""
          state = State.FieldStart
        } else if (ch === "\n") {
          currentRow.push(currentField.trim())
          if (isHeaderRow) {
            headers.push(...currentRow)
            isHeaderRow = false
          } else {
            if (currentRow.some((cell) => cell !== "")) {
              rows.push(currentRow)
            }
          }
          currentRow = []
          currentField = ""
          state = State.FieldStart
        } else {
          currentField += ch
        }
        break

      case State.QuotedField:
        if (ch === '"') {
          state = State.QuoteInQuotedField
        } else {
          currentField += ch
        }
        break

      case State.QuoteInQuotedField:
        if (ch === '"') {
          // Escaped quote ""
          currentField += '"'
          state = State.QuotedField
        } else if (ch === ",") {
          currentRow.push(currentField.trim())
          currentField = ""
          state = State.FieldStart
        } else if (ch === "\n") {
          currentRow.push(currentField.trim())
          if (isHeaderRow) {
            headers.push(...currentRow)
            isHeaderRow = false
          } else {
            if (currentRow.some((cell) => cell !== "")) {
              rows.push(currentRow)
            }
          }
          currentRow = []
          currentField = ""
          state = State.FieldStart
        } else {
          // Char after closing quote that isn't comma or newline — treat as part of field
          currentField += ch
          state = State.UnquotedField
        }
        break
    }
  }

  // Handle last field / row if file doesn't end with newline
  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (isHeaderRow) {
      headers.push(...currentRow)
    } else {
      if (currentRow.some((cell) => cell !== "")) {
        rows.push(currentRow)
      }
    }
  }

  // Ensure all rows have the same number of columns as headers
  for (let r = 0; r < rows.length; r++) {
    while (rows[r].length < headers.length) {
      rows[r].push("")
    }
    // Trim extra columns if row has more than headers
    if (rows[r].length > headers.length) {
      rows[r] = rows[r].slice(0, headers.length)
    }
  }

  return { headers, rows }
}

/**
 * Convert parsed CSV rows back into an array of objects keyed by header.
 */
export function csvRowsToObjects(
  headers: string[],
  rows: string[][]
): Record<string, string>[] {
  return rows.map((row) => {
    const obj: Record<string, string> = {}
    headers.forEach((header, i) => {
      obj[header] = row[i] || ""
    })
    return obj
  })
}

/**
 * Generate a CSV string from headers and rows.
 */
export function generateCSV(headers: string[], rows?: string[][]): string {
  const escapeField = (field: string): string => {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
      return '"' + field.replace(/"/g, '""') + '"'
    }
    return field
  }

  let csv = headers.map(escapeField).join(",") + "\n"

  if (rows) {
    for (const row of rows) {
      csv += row.map(escapeField).join(",") + "\n"
    }
  }

  return csv
}
