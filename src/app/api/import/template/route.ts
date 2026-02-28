import { NextRequest, NextResponse } from "next/server"
import { generateCSV } from "@/lib/csv-parser"

/**
 * GET /api/import/template?type=customers
 *
 * Returns a downloadable CSV template with the correct headers
 * (and one example row) for the given import type.
 */

const TEMPLATES: Record<
  string,
  { filename: string; headers: string[]; exampleRow: string[] }
> = {
  customers: {
    filename: "ethos-customers-template.csv",
    headers: [
      "Name",
      "Customer Type",
      "Email",
      "Phone",
      "Address Line 1",
      "Address Line 2",
      "City",
      "County",
      "Postcode",
      "Payment Terms Days",
      "VAT Number",
      "Account Code",
      "Notes",
    ],
    exampleRow: [
      "Acme Construction Ltd",
      "MAIN_CONTRACTOR",
      "accounts@acme.co.uk",
      "020 1234 5678",
      "123 High Street",
      "Suite 4",
      "London",
      "Greater London",
      "SW1A 1AA",
      "30",
      "GB123456789",
      "CUST001",
      "Imported from Sage",
    ],
  },
  suppliers: {
    filename: "ethos-suppliers-template.csv",
    headers: [
      "Name",
      "Email",
      "Phone",
      "Address Line 1",
      "Address Line 2",
      "City",
      "County",
      "Postcode",
      "What They Supply",
      "Payment Terms Days",
      "VAT Number",
      "Account Code",
      "Notes",
    ],
    exampleRow: [
      "Steel Supplies Ltd",
      "orders@steelsupplies.co.uk",
      "020 9876 5432",
      "456 Industrial Estate",
      "Unit 12",
      "Manchester",
      "Greater Manchester",
      "M1 1AA",
      "Structural steel sections",
      "30",
      "GB987654321",
      "SUPP001",
      "Imported from Sage",
    ],
  },
  accounts: {
    filename: "ethos-chart-of-accounts-template.csv",
    headers: [
      "Code",
      "Name",
      "Type",
      "Balance Type",
      "Sub Type",
      "Description",
      "VAT Code",
    ],
    exampleRow: [
      "1000",
      "Cash at Bank",
      "ASSET",
      "DEBIT",
      "Current Asset",
      "Main trading bank account",
      "T0",
    ],
  },
  balances: {
    filename: "ethos-opening-balances-template.csv",
    headers: [
      "Account Code",
      "Description",
      "Debit",
      "Credit",
    ],
    exampleRow: [
      "1000",
      "Cash at Bank",
      "10000.00",
      "",
    ],
  },
  products: {
    filename: "ethos-products-template.csv",
    headers: [
      "Project Number",
      "Part Code",
      "Description",
      "Additional Details",
      "Quantity",
      "Job Number",
      "Drawing Number",
    ],
    exampleRow: [
      "100001",
      "FD-001",
      "Flood Door 1200x2100",
      "Single leaf, manual operation",
      "2",
      "JOB-001",
      "DWG-FD-001",
    ],
  },
  "purchase-orders": {
    filename: "ethos-purchase-orders-template.csv",
    headers: [
      "PO Number",
      "Supplier Name",
      "Project Number",
      "Description",
      "Quantity",
      "Unit Cost",
      "Date Raised",
      "Expected Delivery",
      "Notes",
    ],
    exampleRow: [
      "PO-SAGE-001",
      "Steel Supplies Ltd",
      "100001",
      "Mild Steel Plate 10mm",
      "5",
      "250.00",
      "2026-01-15",
      "2026-02-15",
      "Outstanding order from Sage",
    ],
  },
  "sales-invoices": {
    filename: "ethos-sales-invoices-template.csv",
    headers: [
      "Invoice Number",
      "Customer Name",
      "Project Number",
      "Description",
      "Quantity",
      "Unit Price",
      "Net Amount",
      "VAT Amount",
      "Invoice Date",
      "Due Date",
      "Notes",
    ],
    exampleRow: [
      "SI-SAGE-001",
      "Acme Construction Ltd",
      "100001",
      "Flood Door Supply & Fit",
      "2",
      "5000.00",
      "10000.00",
      "2000.00",
      "2026-01-20",
      "2026-02-20",
      "Outstanding invoice from Sage",
    ],
  },
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")

  if (!type) {
    return NextResponse.json(
      { error: "Query parameter 'type' is required" },
      { status: 400 }
    )
  }

  const template = TEMPLATES[type]
  if (!template) {
    return NextResponse.json(
      {
        error: `Unknown template type: "${type}". Valid types: ${Object.keys(TEMPLATES).join(", ")}`,
      },
      { status: 400 }
    )
  }

  const csvContent = generateCSV(template.headers, [template.exampleRow])

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${template.filename}"`,
    },
  })
}
