import { NextRequest, NextResponse } from "next/server"
import { parseCSV } from "@/lib/csv-parser"

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""

    let csvText = ""
    let importType = ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("file") as File | null
      importType = (formData.get("importType") as string) || ""

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        )
      }

      csvText = await file.text()
    } else {
      // Accept JSON body with csvText field as fallback
      const body = await request.json()
      csvText = body.csvText || ""
      importType = body.importType || ""
    }

    if (!csvText.trim()) {
      return NextResponse.json(
        { error: "CSV file is empty" },
        { status: 400 }
      )
    }

    if (!importType) {
      return NextResponse.json(
        { error: "importType is required" },
        { status: 400 }
      )
    }

    const { headers, rows } = parseCSV(csvText)

    if (headers.length === 0) {
      return NextResponse.json(
        { error: "CSV file has no headers" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      headers,
      previewRows: rows.slice(0, 10), // First 10 rows for UI preview
      allRows: rows,                  // All rows for validation & execution
      rowCount: rows.length,
      importType,
    })
  } catch (error) {
    console.error("Preview parse error:", error)
    return NextResponse.json(
      { error: "Failed to parse CSV file" },
      { status: 500 }
    )
  }
}
