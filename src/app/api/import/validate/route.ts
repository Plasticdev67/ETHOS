import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

// Valid import types
const VALID_IMPORT_TYPES = [
  "customers",
  "suppliers",
  "accounts",
  "balances",
  "products",
  "purchase-orders",
  "sales-invoices",
] as const

type ImportType = (typeof VALID_IMPORT_TYPES)[number]

// Valid AccountType enum values
const VALID_ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]

// Valid BalanceType enum values
const VALID_BALANCE_TYPES = ["DEBIT", "CREDIT"]

interface RowValidation {
  rowIndex: number
  status: "valid" | "error" | "warning"
  messages: string[]
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("import:use")
  if (denied) return denied

  try {
    const body = await request.json()
    const { importType, fieldMapping, data } = body as {
      importType: string
      fieldMapping: Record<string, string>
      data: string[][]
    }

    if (!importType || !VALID_IMPORT_TYPES.includes(importType as ImportType)) {
      return NextResponse.json(
        { error: `Invalid importType. Must be one of: ${VALID_IMPORT_TYPES.join(", ")}` },
        { status: 400 }
      )
    }

    if (!fieldMapping || typeof fieldMapping !== "object") {
      return NextResponse.json(
        { error: "fieldMapping is required (Record<csvColumn, ethosField>)" },
        { status: 400 }
      )
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "data is required (string[][] of CSV rows)" },
        { status: 400 }
      )
    }

    // Map each row from array to object using fieldMapping
    const mappedRows = data.map((row) => {
      const obj: Record<string, string> = {}
      Object.entries(fieldMapping).forEach(([csvIndex, ethosField]) => {
        if (ethosField && ethosField !== "" && ethosField !== "skip") {
          const idx = parseInt(csvIndex, 10)
          obj[ethosField] = row[idx] || ""
        }
      })
      return obj
    })

    const rowResults: RowValidation[] = []

    switch (importType as ImportType) {
      case "customers":
        await validateCustomers(mappedRows, rowResults)
        break
      case "suppliers":
        await validateSuppliers(mappedRows, rowResults)
        break
      case "accounts":
        await validateAccounts(mappedRows, rowResults)
        break
      case "balances":
        await validateBalances(mappedRows, rowResults)
        break
      case "products":
        await validateProducts(mappedRows, rowResults)
        break
      case "purchase-orders":
        await validatePurchaseOrders(mappedRows, rowResults)
        break
      case "sales-invoices":
        await validateSalesInvoices(mappedRows, rowResults)
        break
    }

    const valid = rowResults.filter((r) => r.status === "valid").length
    const errors = rowResults.filter((r) => r.status === "error").length
    const warnings = rowResults.filter((r) => r.status === "warning").length

    return NextResponse.json({
      valid,
      errors,
      warnings,
      rows: rowResults,
    })
  } catch (error) {
    console.error("Validation error:", error)
    return NextResponse.json(
      { error: "Validation failed" },
      { status: 500 }
    )
  }
}

// ── Validators ──────────────────────────────────────────────

async function validateCustomers(
  rows: Record<string, string>[],
  results: RowValidation[]
) {
  // Pre-fetch existing customer names for duplicate check
  const existingCustomers = await prisma.customer.findMany({
    select: { name: true, email: true },
  })
  const existingNames = new Set(existingCustomers.map((c) => c.name.toLowerCase()))

  const seenNames = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const messages: string[] = []
    let status: "valid" | "error" | "warning" = "valid"

    // Name required
    if (!row.name?.trim()) {
      messages.push("Name is required")
      status = "error"
    } else {
      const nameLower = row.name.trim().toLowerCase()
      // Duplicate in CSV
      if (seenNames.has(nameLower)) {
        messages.push(`Duplicate name in CSV: "${row.name}"`)
        status = "warning"
      }
      // Duplicate in database
      if (existingNames.has(nameLower)) {
        messages.push(`Customer "${row.name}" already exists in ETHOS`)
        status = "warning"
      }
      seenNames.add(nameLower)
    }

    // Email format
    if (row.email?.trim() && !isValidEmail(row.email.trim())) {
      messages.push(`Invalid email format: "${row.email}"`)
      if (status !== "error") status = "warning"
    }

    // Payment terms days should be a number
    if (row.paymentTermsDays?.trim()) {
      const days = parseInt(row.paymentTermsDays.trim(), 10)
      if (isNaN(days) || days < 0) {
        messages.push(`Payment terms days must be a positive number`)
        if (status !== "error") status = "warning"
      }
    }

    if (messages.length === 0) messages.push("OK")
    results.push({ rowIndex: i, status, messages })
  }
}

async function validateSuppliers(
  rows: Record<string, string>[],
  results: RowValidation[]
) {
  const existingSuppliers = await prisma.supplier.findMany({
    select: { name: true },
  })
  const existingNames = new Set(existingSuppliers.map((s) => s.name.toLowerCase()))

  const seenNames = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const messages: string[] = []
    let status: "valid" | "error" | "warning" = "valid"

    if (!row.name?.trim()) {
      messages.push("Name is required")
      status = "error"
    } else {
      const nameLower = row.name.trim().toLowerCase()
      if (seenNames.has(nameLower)) {
        messages.push(`Duplicate name in CSV: "${row.name}"`)
        status = "warning"
      }
      if (existingNames.has(nameLower)) {
        messages.push(`Supplier "${row.name}" already exists in ETHOS`)
        status = "warning"
      }
      seenNames.add(nameLower)
    }

    if (row.email?.trim() && !isValidEmail(row.email.trim())) {
      messages.push(`Invalid email format: "${row.email}"`)
      if (status !== "error") status = "warning"
    }

    if (messages.length === 0) messages.push("OK")
    results.push({ rowIndex: i, status, messages })
  }
}

async function validateAccounts(
  rows: Record<string, string>[],
  results: RowValidation[]
) {
  const existingAccounts = await prisma.account.findMany({
    select: { code: true },
  })
  const existingCodes = new Set(existingAccounts.map((a) => a.code))

  const seenCodes = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const messages: string[] = []
    let status: "valid" | "error" | "warning" = "valid"

    // Code required + unique
    if (!row.code?.trim()) {
      messages.push("Account code is required")
      status = "error"
    } else {
      const code = row.code.trim()
      if (seenCodes.has(code)) {
        messages.push(`Duplicate account code in CSV: "${code}"`)
        status = "error"
      }
      if (existingCodes.has(code)) {
        messages.push(`Account code "${code}" already exists — will be updated`)
        if (status !== "error") status = "warning"
      }
      seenCodes.add(code)
    }

    // Name required
    if (!row.name?.trim()) {
      messages.push("Account name is required")
      status = "error"
    }

    // Type required and must be valid
    if (!row.type?.trim()) {
      messages.push("Account type is required (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)")
      status = "error"
    } else if (!VALID_ACCOUNT_TYPES.includes(row.type.trim().toUpperCase())) {
      messages.push(
        `Invalid account type "${row.type}". Must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}`
      )
      status = "error"
    }

    // Balance type if provided
    if (row.balanceType?.trim() && !VALID_BALANCE_TYPES.includes(row.balanceType.trim().toUpperCase())) {
      messages.push(
        `Invalid balance type "${row.balanceType}". Must be DEBIT or CREDIT`
      )
      if (status !== "error") status = "warning"
    }

    if (messages.length === 0) messages.push("OK")
    results.push({ rowIndex: i, status, messages })
  }
}

async function validateBalances(
  rows: Record<string, string>[],
  results: RowValidation[]
) {
  // Pre-fetch all account codes
  const existingAccounts = await prisma.account.findMany({
    select: { code: true, id: true },
  })
  const accountCodes = new Set(existingAccounts.map((a) => a.code))

  let totalDebit = 0
  let totalCredit = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const messages: string[] = []
    let status: "valid" | "error" | "warning" = "valid"

    // Account code required and must exist
    if (!row.accountCode?.trim()) {
      messages.push("Account code is required")
      status = "error"
    } else if (!accountCodes.has(row.accountCode.trim())) {
      messages.push(`Account code "${row.accountCode}" not found in ETHOS — import Chart of Accounts first`)
      status = "error"
    }

    // Parse amounts
    const debit = parseAmount(row.debit)
    const credit = parseAmount(row.credit)

    if (debit === null && row.debit?.trim()) {
      messages.push(`Invalid debit amount: "${row.debit}"`)
      status = "error"
    }
    if (credit === null && row.credit?.trim()) {
      messages.push(`Invalid credit amount: "${row.credit}"`)
      status = "error"
    }

    const debitVal = debit || 0
    const creditVal = credit || 0

    // Cannot have both debit AND credit
    if (debitVal > 0 && creditVal > 0) {
      messages.push("Row cannot have both debit and credit amounts")
      status = "error"
    }

    // Must have at least one
    if (debitVal === 0 && creditVal === 0) {
      messages.push("Row must have either a debit or credit amount")
      status = "error"
    }

    totalDebit += debitVal
    totalCredit += creditVal

    if (messages.length === 0) messages.push("OK")
    results.push({ rowIndex: i, status, messages })
  }

  // Check overall balance
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    // Add a warning to the first row about the imbalance
    if (results.length > 0) {
      results[0].messages.push(
        `Total debits (${totalDebit.toFixed(2)}) do not equal total credits (${totalCredit.toFixed(2)}) — journal will not balance`
      )
      if (results[0].status === "valid") results[0].status = "warning"
    }
  }
}

async function validateProducts(
  rows: Record<string, string>[],
  results: RowValidation[]
) {
  // Pre-fetch projects for lookup
  const projects = await prisma.project.findMany({
    select: { id: true, projectNumber: true },
  })
  const projectsByNumber = new Map(projects.map((p) => [p.projectNumber, p.id]))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const messages: string[] = []
    let status: "valid" | "error" | "warning" = "valid"

    if (!row.description?.trim()) {
      messages.push("Product description is required")
      status = "error"
    }

    if (!row.projectNumber?.trim()) {
      messages.push("Project number is required")
      status = "error"
    } else if (!projectsByNumber.has(row.projectNumber.trim())) {
      messages.push(`Project "${row.projectNumber}" not found in ETHOS`)
      status = "error"
    }

    if (row.quantity?.trim()) {
      const qty = parseInt(row.quantity.trim(), 10)
      if (isNaN(qty) || qty < 1) {
        messages.push("Quantity must be a positive integer")
        if (status !== "error") status = "warning"
      }
    }

    if (messages.length === 0) messages.push("OK")
    results.push({ rowIndex: i, status, messages })
  }
}

async function validatePurchaseOrders(
  rows: Record<string, string>[],
  results: RowValidation[]
) {
  // Pre-fetch suppliers and projects
  const suppliers = await prisma.supplier.findMany({
    select: { id: true, name: true },
  })
  const supplierNames = new Map(suppliers.map((s) => [s.name.toLowerCase(), s.id]))

  const projects = await prisma.project.findMany({
    select: { id: true, projectNumber: true },
  })
  const projectsByNumber = new Map(projects.map((p) => [p.projectNumber, p.id]))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const messages: string[] = []
    let status: "valid" | "error" | "warning" = "valid"

    // Supplier required
    if (!row.supplierName?.trim()) {
      messages.push("Supplier name is required")
      status = "error"
    } else if (!supplierNames.has(row.supplierName.trim().toLowerCase())) {
      messages.push(`Supplier "${row.supplierName}" not found — import suppliers first`)
      status = "error"
    }

    // Project required
    if (!row.projectNumber?.trim()) {
      messages.push("Project number is required")
      status = "error"
    } else if (!projectsByNumber.has(row.projectNumber.trim())) {
      messages.push(`Project "${row.projectNumber}" not found in ETHOS`)
      status = "error"
    }

    // Description required (line item)
    if (!row.description?.trim()) {
      messages.push("Line description is required")
      status = "error"
    }

    // Quantity
    if (row.quantity?.trim()) {
      const qty = parseInt(row.quantity.trim(), 10)
      if (isNaN(qty) || qty < 1) {
        messages.push("Quantity must be a positive integer")
        if (status !== "error") status = "warning"
      }
    }

    // Unit cost
    if (row.unitCost?.trim()) {
      const cost = parseAmount(row.unitCost)
      if (cost === null) {
        messages.push(`Invalid unit cost: "${row.unitCost}"`)
        if (status !== "error") status = "warning"
      }
    }

    if (messages.length === 0) messages.push("OK")
    results.push({ rowIndex: i, status, messages })
  }
}

async function validateSalesInvoices(
  rows: Record<string, string>[],
  results: RowValidation[]
) {
  const customers = await prisma.customer.findMany({
    select: { id: true, name: true },
  })
  const customerNames = new Map(customers.map((c) => [c.name.toLowerCase(), c.id]))

  const projects = await prisma.project.findMany({
    select: { id: true, projectNumber: true },
  })
  const projectsByNumber = new Map(projects.map((p) => [p.projectNumber, p.id]))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const messages: string[] = []
    let status: "valid" | "error" | "warning" = "valid"

    // Customer required
    if (!row.customerName?.trim()) {
      messages.push("Customer name is required")
      status = "error"
    } else if (!customerNames.has(row.customerName.trim().toLowerCase())) {
      messages.push(`Customer "${row.customerName}" not found — import customers first`)
      status = "error"
    }

    // Invoice number
    if (!row.invoiceNumber?.trim()) {
      messages.push("Invoice number is required")
      status = "error"
    }

    // Description (line item)
    if (!row.description?.trim()) {
      messages.push("Line description is required")
      status = "error"
    }

    // Project (optional but check if provided)
    if (row.projectNumber?.trim() && !projectsByNumber.has(row.projectNumber.trim())) {
      messages.push(`Project "${row.projectNumber}" not found`)
      if (status !== "error") status = "warning"
    }

    // Amounts
    if (row.netAmount?.trim()) {
      const amount = parseAmount(row.netAmount)
      if (amount === null) {
        messages.push(`Invalid net amount: "${row.netAmount}"`)
        if (status !== "error") status = "warning"
      }
    }

    if (messages.length === 0) messages.push("OK")
    results.push({ rowIndex: i, status, messages })
  }
}

// ── Helpers ─────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function parseAmount(val: string | undefined): number | null {
  if (!val || !val.trim()) return null
  // Remove currency symbols, commas, spaces
  const cleaned = val.trim().replace(/[£$€,\s]/g, "")
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}
